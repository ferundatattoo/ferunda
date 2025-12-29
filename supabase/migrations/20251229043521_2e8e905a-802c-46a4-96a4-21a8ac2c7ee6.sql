-- =====================================================
-- PHASE 1-7: COMPREHENSIVE SECURITY ENHANCEMENTS
-- =====================================================

-- =====================================================
-- 1. HONEYPOT TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.honeypot_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  trigger_type TEXT NOT NULL, -- 'form_field', 'fake_endpoint', 'canary_token'
  trigger_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Only admins can view, system inserts via SECURITY DEFINER
ALTER TABLE public.honeypot_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view honeypot_triggers"
  ON public.honeypot_triggers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 2. MAGIC LINK TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- SHA256 hash of the actual token
  fingerprint_hash TEXT, -- Device fingerprint hash for binding
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  ip_address TEXT
);

-- RLS: Only admins can view, system manages via SECURITY DEFINER
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage magic_link_tokens"
  ON public.magic_link_tokens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_magic_link_token_hash ON public.magic_link_tokens(token_hash);

-- =====================================================
-- 3. ENHANCED SECURITY LOGS WITH HASH CHAIN
-- =====================================================
ALTER TABLE public.security_logs 
  ADD COLUMN IF NOT EXISTS previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS entry_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- =====================================================
-- 4. PII ENCRYPTION FOR BOOKINGS
-- =====================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS email_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS tracking_code_expires_at TIMESTAMPTZ;

-- Index for email hash searches
CREATE INDEX IF NOT EXISTS idx_bookings_email_hash ON public.bookings(email_hash);

-- =====================================================
-- 5. CHAT SESSION RATE LIMITING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  UNIQUE(session_id)
);

ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view chat_rate_limits"
  ON public.chat_rate_limits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 6. DEVICE FINGERPRINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL UNIQUE,
  session_ids TEXT[] DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER DEFAULT 1,
  is_suspicious BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0
);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage device_fingerprints"
  ON public.device_fingerprints FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint_hash);

-- =====================================================
-- 7. SECURITY DEFINER FUNCTIONS FOR SAFE INSERTS
-- =====================================================

-- Function to insert honeypot trigger (public can call, but data goes to admin-only table)
CREATE OR REPLACE FUNCTION public.log_honeypot_trigger(
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_trigger_type TEXT,
  p_trigger_details JSONB DEFAULT '{}'
) RETURNS void AS $$
BEGIN
  INSERT INTO public.honeypot_triggers (ip_address, user_agent, trigger_type, trigger_details)
  VALUES (p_ip_address, p_user_agent, p_trigger_type, p_trigger_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to insert security log with hash chain
CREATE OR REPLACE FUNCTION public.append_security_log(
  p_event_type TEXT,
  p_email TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_previous_hash TEXT;
  v_entry_hash TEXT;
  v_new_id UUID;
  v_entry_data TEXT;
BEGIN
  -- Rate limit: max 20 logs per IP per minute
  IF p_ip_address IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.security_logs 
        WHERE ip_address = p_ip_address 
        AND created_at > NOW() - INTERVAL '1 minute') >= 20 THEN
      RAISE EXCEPTION 'Security log rate limit exceeded';
    END IF;
  END IF;

  -- Get the hash of the previous entry
  SELECT entry_hash INTO v_previous_hash 
  FROM public.security_logs 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS';
  END IF;
  
  -- Create hash of this entry
  v_entry_data := p_event_type || COALESCE(p_email, '') || COALESCE(p_ip_address, '') || 
                  NOW()::TEXT || v_previous_hash;
  v_entry_hash := encode(sha256(v_entry_data::bytea), 'hex');
  
  -- Insert the log entry
  INSERT INTO public.security_logs (
    event_type, email, user_id, ip_address, user_agent, success, details, 
    previous_hash, entry_hash
  ) VALUES (
    p_event_type, p_email, p_user_id, p_ip_address, p_user_agent, p_success, p_details,
    v_previous_hash, v_entry_hash
  ) RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check and update chat rate limit
CREATE OR REPLACE FUNCTION public.check_chat_rate_limit(
  p_session_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_record public.chat_rate_limits%ROWTYPE;
  v_max_messages INTEGER := 30; -- 30 messages per minute window
  v_window_seconds INTEGER := 60;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_record FROM public.chat_rate_limits WHERE session_id = p_session_id;
  
  IF v_record IS NULL THEN
    INSERT INTO public.chat_rate_limits (session_id, message_count, window_start)
    VALUES (p_session_id, 1, NOW())
    RETURNING * INTO v_record;
    
    RETURN jsonb_build_object('allowed', true, 'remaining', v_max_messages - 1);
  END IF;
  
  -- Check if blocked
  IF v_record.is_blocked AND v_record.blocked_until > NOW() THEN
    RETURN jsonb_build_object('allowed', false, 'blocked_until', v_record.blocked_until);
  END IF;
  
  -- Check if window expired
  IF v_record.window_start < NOW() - (v_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.chat_rate_limits 
    SET message_count = 1, window_start = NOW(), is_blocked = false
    WHERE session_id = p_session_id;
    
    RETURN jsonb_build_object('allowed', true, 'remaining', v_max_messages - 1);
  END IF;
  
  -- Check if over limit
  IF v_record.message_count >= v_max_messages THEN
    UPDATE public.chat_rate_limits 
    SET is_blocked = true, blocked_until = NOW() + INTERVAL '5 minutes'
    WHERE session_id = p_session_id;
    
    RETURN jsonb_build_object('allowed', false, 'blocked_until', NOW() + INTERVAL '5 minutes');
  END IF;
  
  -- Increment counter
  UPDATE public.chat_rate_limits 
  SET message_count = message_count + 1, last_message_at = NOW()
  WHERE session_id = p_session_id;
  
  RETURN jsonb_build_object('allowed', true, 'remaining', v_max_messages - v_record.message_count - 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to validate and use magic link token
CREATE OR REPLACE FUNCTION public.validate_magic_link(
  p_token_hash TEXT,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_token public.magic_link_tokens%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  -- Find the token
  SELECT * INTO v_token FROM public.magic_link_tokens 
  WHERE token_hash = p_token_hash AND is_used = false AND expires_at > NOW();
  
  IF v_token IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired link');
  END IF;
  
  -- Check fingerprint if set (optional binding)
  IF v_token.fingerprint_hash IS NOT NULL AND p_fingerprint_hash IS NOT NULL THEN
    IF v_token.fingerprint_hash != p_fingerprint_hash THEN
      -- Log suspicious activity but don't block (fingerprints can vary)
      PERFORM public.append_security_log(
        'magic_link_fingerprint_mismatch',
        NULL, NULL, p_ip_address, NULL, false,
        jsonb_build_object('token_id', v_token.id)
      );
    END IF;
  END IF;
  
  -- Mark as used
  UPDATE public.magic_link_tokens 
  SET is_used = true, used_at = NOW(), fingerprint_hash = COALESCE(p_fingerprint_hash, fingerprint_hash)
  WHERE id = v_token.id;
  
  -- Get booking info
  SELECT * INTO v_booking FROM public.bookings WHERE id = v_token.booking_id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'booking_id', v_token.booking_id,
    'booking', jsonb_build_object(
      'tracking_code', v_booking.tracking_code,
      'status', v_booking.status,
      'pipeline_stage', v_booking.pipeline_stage,
      'scheduled_date', v_booking.scheduled_date,
      'deposit_paid', v_booking.deposit_paid
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create magic link token
CREATE OR REPLACE FUNCTION public.create_magic_link_token(
  p_booking_id UUID,
  p_token_hash TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Invalidate any existing unused tokens for this booking
  UPDATE public.magic_link_tokens 
  SET expires_at = NOW() 
  WHERE booking_id = p_booking_id AND is_used = false;
  
  -- Create new token
  INSERT INTO public.magic_link_tokens (booking_id, token_hash, expires_at)
  VALUES (p_booking_id, p_token_hash, NOW() + INTERVAL '24 hours')
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to track device fingerprint
CREATE OR REPLACE FUNCTION public.track_device_fingerprint(
  p_fingerprint_hash TEXT,
  p_session_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_record public.device_fingerprints%ROWTYPE;
  v_is_new BOOLEAN := false;
  v_risk_score INTEGER;
BEGIN
  SELECT * INTO v_record FROM public.device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash;
  
  IF v_record IS NULL THEN
    v_is_new := true;
    INSERT INTO public.device_fingerprints (fingerprint_hash, session_ids, request_count)
    VALUES (p_fingerprint_hash, ARRAY[p_session_id], 1)
    RETURNING * INTO v_record;
  ELSE
    -- Update existing record
    v_risk_score := v_record.risk_score;
    
    -- Increase risk if too many sessions from same fingerprint
    IF array_length(v_record.session_ids, 1) > 10 THEN
      v_risk_score := LEAST(v_risk_score + 1, 100);
    END IF;
    
    UPDATE public.device_fingerprints 
    SET 
      session_ids = CASE 
        WHEN NOT (session_ids @> ARRAY[p_session_id]) 
        THEN session_ids || ARRAY[p_session_id] 
        ELSE session_ids 
      END,
      last_seen_at = NOW(),
      request_count = request_count + 1,
      risk_score = v_risk_score,
      is_suspicious = v_risk_score > 50
    WHERE fingerprint_hash = p_fingerprint_hash
    RETURNING * INTO v_record;
  END IF;
  
  RETURN jsonb_build_object(
    'is_new', v_is_new,
    'risk_score', v_record.risk_score,
    'is_suspicious', v_record.is_suspicious,
    'session_count', array_length(v_record.session_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to hash email for searchable encryption
CREATE OR REPLACE FUNCTION public.hash_email(p_email TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(lower(trim(p_email))::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Trigger to auto-set email_hash and tracking_code_expires_at on bookings
CREATE OR REPLACE FUNCTION public.set_booking_security_fields()
RETURNS trigger AS $$
BEGIN
  NEW.email_hash := public.hash_email(NEW.email);
  NEW.tracking_code_expires_at := NOW() + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS booking_security_fields_trigger ON public.bookings;
CREATE TRIGGER booking_security_fields_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_security_fields();

-- =====================================================
-- 8. ANOMALY DETECTION FOR SECURITY LOGS
-- =====================================================
CREATE OR REPLACE FUNCTION public.detect_security_anomalies()
RETURNS trigger AS $$
DECLARE
  v_failed_count INTEGER;
BEGIN
  -- Detect brute force attempts
  IF NEW.event_type IN ('login_failed', 'magic_link_invalid', 'tracking_code_invalid') THEN
    SELECT COUNT(*) INTO v_failed_count
    FROM public.security_logs 
    WHERE ip_address = NEW.ip_address 
    AND event_type = NEW.event_type
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    IF v_failed_count >= 5 THEN
      NEW.is_flagged := true;
      NEW.details := COALESCE(NEW.details, '{}') || jsonb_build_object('anomaly', 'brute_force_detected');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS security_anomaly_detection_trigger ON public.security_logs;
CREATE TRIGGER security_anomaly_detection_trigger
  BEFORE INSERT ON public.security_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_security_anomalies();

-- =====================================================
-- 9. UPDATE BOOKING STATUS RATE LIMITS RLS
-- =====================================================
DROP POLICY IF EXISTS "Allow rate limit tracking" ON public.booking_status_rate_limits;

-- Only allow SECURITY DEFINER functions to manage this table
CREATE POLICY "No direct access to rate limits"
  ON public.booking_status_rate_limits FOR ALL
  USING (false);

-- =====================================================
-- 10. GRANT EXECUTE ON SECURITY FUNCTIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.log_honeypot_trigger TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_security_log TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_chat_rate_limit TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_magic_link TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_magic_link_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_device_fingerprint TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_email TO anon, authenticated;