
-- =====================================================
-- FINAL SECURITY HARDENING - COMPLETE
-- =====================================================

-- 1. Create enhanced session validation function
CREATE OR REPLACE FUNCTION public.validate_session_with_ip(
  p_session_token_hash text,
  p_booking_id uuid,
  p_ip_hash text,
  p_fingerprint_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_ip_mismatch boolean := false;
  v_fp_mismatch boolean := false;
BEGIN
  SELECT * INTO v_session
  FROM customer_portal_sessions
  WHERE session_token_hash = p_session_token_hash
  AND booking_id = p_booking_id
  AND is_active = true
  AND expires_at > now()
  AND invalidated_at IS NULL
  AND created_at > now() - interval '7 days';
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'session_not_found');
  END IF;
  
  IF v_session.ip_address IS NOT NULL AND v_session.ip_address != p_ip_hash THEN
    v_ip_mismatch := true;
  END IF;
  
  IF p_fingerprint_hash IS NOT NULL 
     AND v_session.fingerprint_hash IS NOT NULL 
     AND v_session.fingerprint_hash != p_fingerprint_hash THEN
    v_fp_mismatch := true;
  END IF;
  
  UPDATE customer_portal_sessions SET last_activity_at = now() WHERE id = v_session.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'session_id', v_session.id,
    'ip_warning', v_ip_mismatch,
    'fingerprint_warning', v_fp_mismatch,
    'booking_id', v_session.booking_id
  );
END;
$$;

-- 2. Session invalidation function
CREATE OR REPLACE FUNCTION public.invalidate_suspicious_sessions(
  p_booking_id uuid,
  p_reason text,
  p_except_session_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invalidated integer;
BEGIN
  UPDATE customer_portal_sessions
  SET is_active = false, invalidated_at = now(), invalidation_reason = p_reason
  WHERE booking_id = p_booking_id AND is_active = true
  AND (p_except_session_id IS NULL OR id != p_except_session_id);
  GET DIAGNOSTICS v_invalidated = ROW_COUNT;
  RETURN v_invalidated;
END;
$$;

-- 3. Session limit enforcement
CREATE OR REPLACE FUNCTION public.enforce_session_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count integer;
  v_oldest_session_id uuid;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM customer_portal_sessions
  WHERE booking_id = NEW.booking_id AND is_active = true AND expires_at > now() AND invalidated_at IS NULL;
  
  IF v_active_count >= 3 THEN
    SELECT id INTO v_oldest_session_id
    FROM customer_portal_sessions
    WHERE booking_id = NEW.booking_id AND is_active = true AND expires_at > now() AND invalidated_at IS NULL
    ORDER BY created_at ASC LIMIT 1;
    
    IF v_oldest_session_id IS NOT NULL THEN
      UPDATE customer_portal_sessions
      SET is_active = false, invalidated_at = now(), invalidation_reason = 'session_limit_exceeded'
      WHERE id = v_oldest_session_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_session_limit_trigger ON customer_portal_sessions;
CREATE TRIGGER enforce_session_limit_trigger
  BEFORE INSERT ON customer_portal_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_session_limit();

-- 4. Rate limits
CREATE OR REPLACE FUNCTION public.check_payment_rate_limit(p_booking_id uuid, p_max integer DEFAULT 5, p_window integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM customer_payments WHERE booking_id = p_booking_id AND created_at > now() - (p_window || ' minutes')::interval;
  IF v_count >= p_max THEN RETURN jsonb_build_object('allowed', false, 'reason', 'payment_rate_limit'); END IF;
  RETURN jsonb_build_object('allowed', true, 'remaining', p_max - v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_message_rate_limit(p_booking_id uuid, p_max integer DEFAULT 20, p_window integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM customer_messages WHERE booking_id = p_booking_id AND sender_type = 'customer' AND created_at > now() - (p_window || ' minutes')::interval;
  IF v_count >= p_max THEN RETURN jsonb_build_object('allowed', false, 'reason', 'message_rate_limit'); END IF;
  RETURN jsonb_build_object('allowed', true, 'remaining', p_max - v_count);
END;
$$;

-- 5. Session cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cleaned integer;
BEGIN
  UPDATE customer_portal_sessions SET is_active = false, invalidated_at = now(), invalidation_reason = 'expired'
  WHERE is_active = true AND expires_at <= now();
  GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  DELETE FROM customer_portal_sessions WHERE created_at < now() - interval '30 days';
  RETURN v_cleaned;
END;
$$;

-- 6. Indexes (fixed)
CREATE INDEX IF NOT EXISTS idx_portal_sessions_active_lookup ON customer_portal_sessions(booking_id, is_active, expires_at) WHERE is_active = true AND invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_log(timestamp DESC, event_type);

-- 7. Documentation
COMMENT ON TABLE customer_portal_sessions IS 'Secure session management with booking binding, fingerprint validation, and 3-session limit per booking.';
