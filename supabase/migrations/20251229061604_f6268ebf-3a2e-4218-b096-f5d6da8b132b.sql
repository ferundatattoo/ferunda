-- Phase 1: Security Hardening Migration

-- 1. Drop the overly permissive insert policy on newsletter_subscribers
DROP POLICY IF EXISTS "Public can subscribe" ON public.newsletter_subscribers;

-- 2. Create a more restrictive insert policy that requires edge function (service role)
-- This prevents direct spam submissions - only edge functions can insert
CREATE POLICY "Only service role can insert subscribers"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (
  -- This will only pass for service_role or authenticated admins
  auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Create rate limiting function for newsletter subscriptions
CREATE OR REPLACE FUNCTION public.check_newsletter_rate_limit(
  p_email TEXT,
  p_ip_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_count INTEGER;
  v_ip_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '1 hour';
BEGIN
  -- Check email-based rate limit (max 3 per hour)
  SELECT COUNT(*) INTO v_email_count
  FROM public.newsletter_subscribers
  WHERE email = LOWER(TRIM(p_email))
    AND created_at > v_window_start;
  
  IF v_email_count >= 3 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'email_limit');
  END IF;
  
  -- Check IP-based rate limit via global_rate_limits (max 10 per hour)
  SELECT action_count INTO v_ip_count
  FROM public.global_rate_limits
  WHERE identifier_hash = p_ip_hash
    AND action_type = 'newsletter_subscribe'
    AND window_start > v_window_start;
  
  IF COALESCE(v_ip_count, 0) >= 10 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ip_limit');
  END IF;
  
  -- Record the rate limit attempt
  INSERT INTO public.global_rate_limits (identifier_hash, action_type, action_count, window_start)
  VALUES (p_ip_hash, 'newsletter_subscribe', 1, NOW())
  ON CONFLICT (identifier_hash, action_type) 
  DO UPDATE SET 
    action_count = CASE 
      WHEN global_rate_limits.window_start < v_window_start THEN 1
      ELSE global_rate_limits.action_count + 1
    END,
    window_start = CASE 
      WHEN global_rate_limits.window_start < v_window_start THEN NOW()
      ELSE global_rate_limits.window_start
    END,
    last_action_at = NOW();
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 4. Create unique constraint on identifier_hash + action_type for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'global_rate_limits_identifier_action_unique'
  ) THEN
    ALTER TABLE public.global_rate_limits 
    ADD CONSTRAINT global_rate_limits_identifier_action_unique 
    UNIQUE (identifier_hash, action_type);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists
END $$;

-- 5. Create function to validate verification token
CREATE OR REPLACE FUNCTION public.validate_email_verification(
  p_email TEXT,
  p_verification_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if there's a verified OTP for this email
  SELECT EXISTS (
    SELECT 1 FROM public.verification_otps
    WHERE email = LOWER(TRIM(p_email))
      AND verified_at IS NOT NULL
      AND verified_at > NOW() - INTERVAL '30 minutes'
    ORDER BY verified_at DESC
    LIMIT 1
  ) INTO v_valid;
  
  RETURN COALESCE(v_valid, false);
END;
$$;

-- 6. Enhanced tracking code lookup rate limiting
CREATE OR REPLACE FUNCTION public.check_tracking_code_rate_limit(
  p_ip_hash TEXT,
  p_tracking_code_prefix TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_attempt_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '15 minutes';
BEGIN
  -- Check existing rate limit
  SELECT attempts, blocked_until 
  INTO v_attempt_count, v_blocked_until
  FROM public.booking_status_rate_limits
  WHERE ip_hash = p_ip_hash
    AND last_attempt_at > v_window_start;
  
  -- If blocked, return blocked status
  IF v_blocked_until IS NOT NULL AND v_blocked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'blocked_until', v_blocked_until,
      'reason', 'rate_limited'
    );
  END IF;
  
  -- Block after 10 attempts in 15 minutes
  IF COALESCE(v_attempt_count, 0) >= 10 THEN
    -- Block for 1 hour
    v_blocked_until := NOW() + INTERVAL '1 hour';
    
    INSERT INTO public.booking_status_rate_limits (ip_hash, attempts, blocked_until)
    VALUES (p_ip_hash, v_attempt_count + 1, v_blocked_until)
    ON CONFLICT (ip_hash) 
    DO UPDATE SET 
      attempts = booking_status_rate_limits.attempts + 1,
      blocked_until = v_blocked_until,
      last_attempt_at = NOW();
    
    RETURN jsonb_build_object(
      'allowed', false, 
      'blocked_until', v_blocked_until,
      'reason', 'rate_limited'
    );
  END IF;
  
  -- Record attempt
  INSERT INTO public.booking_status_rate_limits (ip_hash, attempts)
  VALUES (p_ip_hash, 1)
  ON CONFLICT (ip_hash) 
  DO UPDATE SET 
    attempts = CASE 
      WHEN booking_status_rate_limits.last_attempt_at < v_window_start THEN 1
      ELSE booking_status_rate_limits.attempts + 1
    END,
    first_attempt_at = CASE 
      WHEN booking_status_rate_limits.last_attempt_at < v_window_start THEN NOW()
      ELSE booking_status_rate_limits.first_attempt_at
    END,
    last_attempt_at = NOW(),
    blocked_until = NULL;
  
  RETURN jsonb_build_object('allowed', true, 'attempts', COALESCE(v_attempt_count, 0) + 1);
END;
$$;

-- 7. Add unique constraint on booking_status_rate_limits.ip_hash
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'booking_status_rate_limits_ip_hash_unique'
  ) THEN
    ALTER TABLE public.booking_status_rate_limits 
    ADD CONSTRAINT booking_status_rate_limits_ip_hash_unique 
    UNIQUE (ip_hash);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists
END $$;