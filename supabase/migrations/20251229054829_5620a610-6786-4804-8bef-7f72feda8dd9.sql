-- =============================================
-- GLOBAL RATE LIMITS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.global_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier_hash, action_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_global_rate_limits_lookup 
ON public.global_rate_limits(identifier_hash, action_type);

CREATE INDEX IF NOT EXISTS idx_global_rate_limits_blocked 
ON public.global_rate_limits(is_blocked, blocked_until);

-- Enable RLS
ALTER TABLE public.global_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS: No direct access (only via functions with service role)
CREATE POLICY "No direct access to global_rate_limits"
ON public.global_rate_limits
FOR ALL
USING (false);

-- =============================================
-- CHECK_GLOBAL_RATE_LIMIT FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.check_global_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_actions INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60,
  p_block_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier_hash TEXT;
  v_record RECORD;
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Hash the identifier for privacy
  v_identifier_hash := encode(sha256(p_identifier::bytea), 'hex');
  v_window_start := v_now - (p_window_minutes || ' minutes')::interval;

  -- Check for existing record
  SELECT * INTO v_record
  FROM public.global_rate_limits
  WHERE identifier_hash = v_identifier_hash
    AND action_type = p_action_type
  FOR UPDATE;

  -- If blocked and block hasn't expired
  IF v_record IS NOT NULL AND v_record.is_blocked AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'blocked_until', v_record.blocked_until,
      'reason', 'rate_limit_exceeded'
    );
  END IF;

  -- If no record or window expired, create/reset
  IF v_record IS NULL THEN
    INSERT INTO public.global_rate_limits (identifier_hash, action_type, action_count, window_start, last_action_at)
    VALUES (v_identifier_hash, p_action_type, 1, v_now, v_now)
    ON CONFLICT (identifier_hash, action_type) DO UPDATE
    SET action_count = 1,
        window_start = v_now,
        last_action_at = v_now,
        is_blocked = false,
        blocked_until = NULL;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_actions - 1,
      'blocked_until', NULL
    );
  END IF;

  -- If window has expired, reset counter
  IF v_record.window_start < v_window_start THEN
    UPDATE public.global_rate_limits
    SET action_count = 1,
        window_start = v_now,
        last_action_at = v_now,
        is_blocked = false,
        blocked_until = NULL
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_actions - 1,
      'blocked_until', NULL
    );
  END IF;

  -- Increment counter
  IF v_record.action_count >= p_max_actions THEN
    -- Block the identifier
    UPDATE public.global_rate_limits
    SET is_blocked = true,
        blocked_until = v_now + (p_block_minutes || ' minutes')::interval,
        last_action_at = v_now
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'blocked_until', v_now + (p_block_minutes || ' minutes')::interval,
      'reason', 'rate_limit_exceeded'
    );
  ELSE
    -- Increment counter
    UPDATE public.global_rate_limits
    SET action_count = action_count + 1,
        last_action_at = v_now
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_actions - v_record.action_count - 1,
      'blocked_until', NULL
    );
  END IF;
END;
$$;

-- =============================================
-- SECURITY AUDIT LOG TABLE WITH HASH CHAIN
-- =============================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  fingerprint_hash TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  entry_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp 
ON public.security_audit_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type 
ON public.security_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_actor 
ON public.security_audit_log(actor_type, actor_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_resource 
ON public.security_audit_log(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can view audit logs
CREATE POLICY "Admins can view security_audit_log"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: No direct modifications (only via function)
CREATE POLICY "No direct insert to security_audit_log"
ON public.security_audit_log
FOR INSERT
WITH CHECK (false);

-- =============================================
-- APPEND SECURITY AUDIT FUNCTION (with hash chain)
-- =============================================
CREATE OR REPLACE FUNCTION public.append_security_audit(
  p_event_type TEXT,
  p_action TEXT,
  p_actor_type TEXT DEFAULT NULL,
  p_actor_id TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_hash TEXT;
  v_entry_hash TEXT;
  v_new_id UUID;
  v_now TIMESTAMPTZ := now();
  v_content TEXT;
BEGIN
  -- Get the hash of the previous entry for chain integrity
  SELECT entry_hash INTO v_previous_hash
  FROM public.security_audit_log
  ORDER BY timestamp DESC, id DESC
  LIMIT 1;

  -- If no previous entry, use genesis hash
  IF v_previous_hash IS NULL THEN
    v_previous_hash := 'GENESIS';
  END IF;

  -- Generate new UUID
  v_new_id := gen_random_uuid();

  -- Create content string for hashing
  v_content := v_new_id::text || v_now::text || p_event_type || p_action || 
               COALESCE(p_actor_type, '') || COALESCE(p_actor_id, '') ||
               COALESCE(p_resource_type, '') || COALESCE(p_resource_id, '') ||
               COALESCE(p_ip_address, '') || v_previous_hash;

  -- Calculate entry hash
  v_entry_hash := encode(sha256(v_content::bytea), 'hex');

  -- Insert the audit entry (bypassing RLS with SECURITY DEFINER)
  INSERT INTO public.security_audit_log (
    id, timestamp, event_type, action, actor_type, actor_id,
    resource_type, resource_id, ip_address, user_agent, 
    fingerprint_hash, details, previous_hash, entry_hash
  ) VALUES (
    v_new_id, v_now, p_event_type, p_action, p_actor_type, p_actor_id,
    p_resource_type, p_resource_id, p_ip_address, p_user_agent,
    p_fingerprint_hash, p_details, v_previous_hash, v_entry_hash
  );

  RETURN v_new_id;
END;
$$;

-- =============================================
-- CLEANUP FUNCTION FOR OLD RATE LIMIT ENTRIES
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.global_rate_limits
  WHERE last_action_at < now() - interval '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;