
-- =====================================================
-- BULLETPROOF SECURITY MIGRATION
-- Addresses all security scan findings
-- =====================================================

-- 1. CUSTOMER_BOOKING_VIEW - Add restrictive RLS policies
-- This view was missing policies entirely
DROP VIEW IF EXISTS public.customer_booking_view;

CREATE VIEW public.customer_booking_view WITH (security_invoker = true) AS
SELECT 
  b.id,
  b.tracking_code,
  b.status,
  b.pipeline_stage,
  b.scheduled_date,
  b.scheduled_time,
  b.deposit_paid,
  b.deposit_amount,
  b.placement,
  b.size,
  b.requested_city,
  b.created_at,
  -- Only show first name for privacy
  CASE 
    WHEN b.name IS NOT NULL THEN split_part(b.name, ' ', 1)
    ELSE NULL
  END as first_name,
  -- Truncate description for privacy
  CASE 
    WHEN b.tattoo_description IS NOT NULL THEN 
      LEFT(b.tattoo_description, 50) || CASE WHEN LENGTH(b.tattoo_description) > 50 THEN '...' ELSE '' END
    ELSE NULL
  END as tattoo_description,
  -- Count references instead of exposing URLs
  COALESCE(array_length(b.reference_images, 1), 0) + 
  COALESCE(jsonb_array_length(b.reference_images_customer), 0) as reference_count
FROM public.bookings b;

-- 2. BOOKINGS TABLE - Remove overly permissive SELECT policies and add strict ones
-- First, drop any existing policies that might be too permissive
DROP POLICY IF EXISTS "Customers can view limited booking data by tracking code" ON public.bookings;

-- Create a more restrictive policy that ONLY allows access via validated portal sessions
CREATE POLICY "Customers can ONLY view own booking via validated session"
ON public.bookings FOR SELECT
USING (
  -- Must have an active, non-expired, non-invalidated portal session for this exact booking
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = bookings.id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
    -- Additional security: session must have been created within last 7 days
    AND cps.created_at > now() - interval '7 days'
  )
);

-- 3. Add rate limiting table for tracking code lookups to prevent enumeration
CREATE TABLE IF NOT EXISTS public.tracking_code_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash text NOT NULL,
  lookup_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  last_lookup_at timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  invalid_code_count integer DEFAULT 0,
  UNIQUE(identifier_hash)
);

-- Enable RLS on rate limit table - no direct access
ALTER TABLE public.tracking_code_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to tracking rate limits"
ON public.tracking_code_rate_limits FOR ALL
USING (false);

-- 4. Create secure function for tracking code lookups with anti-enumeration
CREATE OR REPLACE FUNCTION public.secure_tracking_lookup(
  p_tracking_code text,
  p_ip_hash text,
  p_fingerprint_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text;
  v_rate_limit record;
  v_booking record;
  v_normalized_code text;
  v_max_lookups constant integer := 10;
  v_window_minutes constant integer := 15;
  v_block_minutes constant integer := 60;
  v_max_invalid constant integer := 5;
BEGIN
  -- Normalize tracking code
  v_normalized_code := UPPER(TRIM(p_tracking_code));
  
  -- Create combined identifier for rate limiting
  v_identifier := COALESCE(p_fingerprint_hash, '') || ':' || p_ip_hash;
  
  -- Check/update rate limits
  INSERT INTO tracking_code_rate_limits (identifier_hash, lookup_count, window_start, last_lookup_at)
  VALUES (v_identifier, 1, now(), now())
  ON CONFLICT (identifier_hash) DO UPDATE SET
    lookup_count = CASE 
      WHEN tracking_code_rate_limits.window_start < now() - (v_window_minutes || ' minutes')::interval 
      THEN 1
      ELSE tracking_code_rate_limits.lookup_count + 1
    END,
    window_start = CASE 
      WHEN tracking_code_rate_limits.window_start < now() - (v_window_minutes || ' minutes')::interval 
      THEN now()
      ELSE tracking_code_rate_limits.window_start
    END,
    last_lookup_at = now(),
    is_blocked = CASE 
      WHEN tracking_code_rate_limits.lookup_count >= v_max_lookups 
        OR tracking_code_rate_limits.invalid_code_count >= v_max_invalid
      THEN true
      ELSE tracking_code_rate_limits.is_blocked
    END,
    blocked_until = CASE 
      WHEN tracking_code_rate_limits.lookup_count >= v_max_lookups 
        OR tracking_code_rate_limits.invalid_code_count >= v_max_invalid
      THEN now() + (v_block_minutes || ' minutes')::interval
      ELSE tracking_code_rate_limits.blocked_until
    END
  RETURNING * INTO v_rate_limit;
  
  -- Check if blocked
  IF v_rate_limit.is_blocked AND v_rate_limit.blocked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'rate_limited',
      'retry_after', EXTRACT(EPOCH FROM (v_rate_limit.blocked_until - now()))::integer
    );
  END IF;
  
  -- Reset block if expired
  IF v_rate_limit.is_blocked AND v_rate_limit.blocked_until <= now() THEN
    UPDATE tracking_code_rate_limits 
    SET is_blocked = false, blocked_until = NULL, invalid_code_count = 0, lookup_count = 1, window_start = now()
    WHERE identifier_hash = v_identifier;
  END IF;
  
  -- Validate tracking code format (must be 32 chars alphanumeric)
  IF v_normalized_code !~ '^[A-Z0-9]{32}$' THEN
    -- Increment invalid count
    UPDATE tracking_code_rate_limits 
    SET invalid_code_count = invalid_code_count + 1 
    WHERE identifier_hash = v_identifier;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_format'
    );
  END IF;
  
  -- Look up booking with minimal data exposure
  SELECT 
    id,
    status,
    pipeline_stage,
    scheduled_date,
    scheduled_time,
    deposit_paid,
    deposit_amount,
    placement,
    size,
    requested_city,
    created_at,
    tracking_code_expires_at,
    split_part(name, ' ', 1) as first_name
  INTO v_booking
  FROM bookings
  WHERE tracking_code = v_normalized_code;
  
  IF v_booking IS NULL THEN
    -- Increment invalid count for non-existent codes
    UPDATE tracking_code_rate_limits 
    SET invalid_code_count = invalid_code_count + 1 
    WHERE identifier_hash = v_identifier;
    
    -- Log security event
    PERFORM append_security_audit(
      p_event_type := 'tracking_lookup',
      p_action := 'invalid_code',
      p_ip_address := p_ip_hash,
      p_fingerprint_hash := p_fingerprint_hash,
      p_details := jsonb_build_object('code_prefix', LEFT(v_normalized_code, 4))
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found'
    );
  END IF;
  
  -- Check if tracking code has expired
  IF v_booking.tracking_code_expires_at IS NOT NULL AND v_booking.tracking_code_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'expired'
    );
  END IF;
  
  -- Reset invalid count on successful lookup
  UPDATE tracking_code_rate_limits 
  SET invalid_code_count = 0 
  WHERE identifier_hash = v_identifier;
  
  -- Log successful lookup
  PERFORM append_security_audit(
    p_event_type := 'tracking_lookup',
    p_action := 'success',
    p_resource_type := 'booking',
    p_resource_id := v_booking.id::text,
    p_ip_address := p_ip_hash,
    p_fingerprint_hash := p_fingerprint_hash
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'status', v_booking.status,
      'pipeline_stage', v_booking.pipeline_stage,
      'scheduled_date', v_booking.scheduled_date,
      'scheduled_time', v_booking.scheduled_time,
      'deposit_paid', v_booking.deposit_paid,
      'deposit_amount', v_booking.deposit_amount,
      'placement', v_booking.placement,
      'size', v_booking.size,
      'requested_city', v_booking.requested_city,
      'created_at', v_booking.created_at,
      'first_name', v_booking.first_name
    )
  );
END;
$$;

-- 5. NEWSLETTER_SUBSCRIBERS - Ensure no public access whatsoever
-- Drop and recreate policies to be absolutely certain
DROP POLICY IF EXISTS "Only service role can insert subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers;

-- Only admins can do anything
CREATE POLICY "Only admins can manage newsletter_subscribers"
ON public.newsletter_subscribers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role for edge functions only (more restrictive)
CREATE POLICY "Service role can insert subscribers only"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 6. Add index for faster rate limit lookups
CREATE INDEX IF NOT EXISTS idx_tracking_rate_limits_identifier 
ON public.tracking_code_rate_limits(identifier_hash);

CREATE INDEX IF NOT EXISTS idx_tracking_rate_limits_blocked 
ON public.tracking_code_rate_limits(is_blocked, blocked_until) 
WHERE is_blocked = true;

-- 7. Cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_tracking_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM tracking_code_rate_limits
  WHERE last_lookup_at < now() - interval '24 hours'
  AND is_blocked = false;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 8. Add additional security columns to bookings for tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS security_flags jsonb DEFAULT '{}';

-- 9. Create function to flag suspicious bookings
CREATE OR REPLACE FUNCTION public.flag_suspicious_booking(
  p_booking_id uuid,
  p_flag_type text,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bookings
  SET security_flags = COALESCE(security_flags, '{}') || 
    jsonb_build_object(
      p_flag_type, jsonb_build_object(
        'flagged_at', now(),
        'details', p_details
      )
    )
  WHERE id = p_booking_id;
END;
$$;

-- 10. Add comment for documentation
COMMENT ON FUNCTION public.secure_tracking_lookup IS 
'Secure tracking code lookup with rate limiting and anti-enumeration protection. 
Use this instead of direct table access.';
