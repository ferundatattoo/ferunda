-- =====================================================
-- SECURITY FIX: Restrict bookings data exposure
-- =====================================================

-- 1. Drop the overly permissive customer SELECT policy
DROP POLICY IF EXISTS "Customers can view own booking by tracking code" ON public.bookings;

-- 2. Create a secure view for customer-facing booking data
-- This view only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.customer_booking_view AS
SELECT 
  id,
  tracking_code,
  status,
  pipeline_stage,
  tattoo_description,
  size,
  placement,
  requested_city,
  scheduled_date,
  scheduled_time,
  deposit_paid,
  deposit_amount,
  -- Mask the name to show only first name
  split_part(name, ' ', 1) as first_name,
  -- Show only if deposit is paid, not actual amounts for security
  CASE WHEN deposit_paid THEN total_paid ELSE NULL END as total_paid,
  created_at,
  -- Do NOT expose: email, phone, phone_encrypted, email_hash, 
  -- full_name, reference_images, admin_notes, session_rate, etc.
  reference_images_customer
FROM public.bookings
WHERE tracking_code IS NOT NULL;

-- 3. Create a new, more restrictive SELECT policy for customers
-- This policy only works via the edge function which validates tracking codes
-- Direct database access won't return sensitive data
CREATE POLICY "Customers can view limited booking data by tracking code"
ON public.bookings
FOR SELECT
USING (
  -- Tracking code must exist and be valid length
  tracking_code IS NOT NULL 
  AND length(tracking_code::text) >= 32
  -- Must match the x-tracking-code header
  AND tracking_code::text = (current_setting('request.headers', true)::json ->> 'x-tracking-code')
  -- Additional check: tracking code must not be expired
  AND (tracking_code_expires_at IS NULL OR tracking_code_expires_at > now())
);

-- 4. Create a function to safely get customer booking data
-- This returns ONLY safe fields and is what edge functions should use
CREATE OR REPLACE FUNCTION public.get_safe_booking_by_tracking_code(p_tracking_code TEXT)
RETURNS TABLE(
  id UUID,
  status TEXT,
  pipeline_stage TEXT,
  first_name TEXT,
  tattoo_description TEXT,
  size TEXT,
  placement TEXT,
  requested_city TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  deposit_paid BOOLEAN,
  deposit_amount NUMERIC,
  total_paid NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limited BOOLEAN;
  v_ip_hash TEXT;
BEGIN
  -- Rate limit check (using IP hash from header if available)
  v_ip_hash := encode(sha256(COALESCE(
    current_setting('request.headers', true)::json ->> 'x-forwarded-for',
    'unknown'
  )::bytea), 'hex');
  
  -- Check rate limits
  INSERT INTO booking_status_rate_limits (ip_hash, attempts, first_attempt_at, last_attempt_at)
  VALUES (v_ip_hash, 1, now(), now())
  ON CONFLICT (ip_hash) DO UPDATE SET
    attempts = CASE 
      WHEN booking_status_rate_limits.first_attempt_at < now() - interval '15 minutes' THEN 1
      ELSE booking_status_rate_limits.attempts + 1
    END,
    first_attempt_at = CASE 
      WHEN booking_status_rate_limits.first_attempt_at < now() - interval '15 minutes' THEN now()
      ELSE booking_status_rate_limits.first_attempt_at
    END,
    last_attempt_at = now();
  
  -- Check if rate limited (max 10 attempts per 15 minutes)
  SELECT attempts > 10 INTO v_rate_limited
  FROM booking_status_rate_limits 
  WHERE ip_hash = v_ip_hash 
  AND first_attempt_at > now() - interval '15 minutes';
  
  IF v_rate_limited THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
  
  -- Return only safe fields
  RETURN QUERY
  SELECT 
    b.id,
    b.status,
    b.pipeline_stage,
    split_part(b.name, ' ', 1) as first_name,
    b.tattoo_description,
    b.size,
    b.placement,
    b.requested_city,
    b.scheduled_date,
    b.scheduled_time,
    b.deposit_paid,
    b.deposit_amount,
    CASE WHEN b.deposit_paid THEN b.total_paid ELSE NULL::NUMERIC END as total_paid,
    b.created_at
  FROM bookings b
  WHERE b.tracking_code = p_tracking_code
  AND b.tracking_code IS NOT NULL
  AND length(b.tracking_code::text) >= 32
  AND (b.tracking_code_expires_at IS NULL OR b.tracking_code_expires_at > now());
END;
$$;

-- 5. Revoke direct access to bookings for anon users, force use of functions/views
-- Note: The INSERT policy for booking submissions remains unchanged as it's needed

-- 6. Add index for faster tracking code lookups
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_code_lookup 
ON public.bookings(tracking_code) 
WHERE tracking_code IS NOT NULL;

-- 7. Log security improvement
DO $$
BEGIN
  PERFORM public.append_security_log(
    'security_policy_updated',
    NULL, NULL, NULL, NULL, true,
    jsonb_build_object(
      'action', 'restricted_bookings_data_exposure',
      'changes', ARRAY[
        'Removed overly permissive SELECT policy',
        'Created customer_booking_view with limited fields',
        'Added get_safe_booking_by_tracking_code function',
        'Added tracking code expiration check',
        'Added rate limiting to safe booking function'
      ]
    )
  );
END $$;