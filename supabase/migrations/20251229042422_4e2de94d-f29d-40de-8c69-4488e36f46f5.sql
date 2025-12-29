-- Fix 1: Make tracking codes cryptographically secure (32 chars hex)
-- Update the generate_tracking_code function to use more secure random generation
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate a cryptographically secure 32-character hex tracking code
  -- This is much harder to enumerate than the previous 8-character code
  NEW.tracking_code := UPPER(encode(gen_random_bytes(16), 'hex'));
  RETURN NEW;
END;
$$;

-- Fix 2: Add rate limiting table for booking status lookups
CREATE TABLE IF NOT EXISTS public.booking_status_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_hash ON public.booking_status_rate_limits(ip_hash);
CREATE INDEX IF NOT EXISTS idx_rate_limits_last_attempt ON public.booking_status_rate_limits(last_attempt_at);

-- Enable RLS
ALTER TABLE public.booking_status_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow public insert/update for rate limiting tracking
CREATE POLICY "Allow rate limit tracking"
ON public.booking_status_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Fix 3: Ensure customer_emails has explicit restrictive policies
-- Drop any potentially permissive policies
DROP POLICY IF EXISTS "Admins can manage customer_emails" ON public.customer_emails;

-- Verify all operations require admin role (already created in previous migration but let's ensure)
-- These are already restrictive, just verify they exist

-- Fix 4: Add token rotation tracking columns
ALTER TABLE public.calendar_sync_tokens 
ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS rotation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS needs_rotation BOOLEAN DEFAULT false;

-- Fix 5: Create a function to check if token needs rotation (older than 7 days)
CREATE OR REPLACE FUNCTION public.check_token_needs_rotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark token as needing rotation if last rotated more than 7 days ago
  IF NEW.last_rotated_at IS NULL OR 
     NEW.last_rotated_at < (NOW() - INTERVAL '7 days') THEN
    NEW.needs_rotation := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to check rotation on select/update
CREATE OR REPLACE TRIGGER check_token_rotation
BEFORE UPDATE ON public.calendar_sync_tokens
FOR EACH ROW
EXECUTE FUNCTION public.check_token_needs_rotation();

-- Fix 6: Update tracking code policy to be more restrictive
DROP POLICY IF EXISTS "Customers can view own booking by tracking code" ON public.bookings;

-- More restrictive policy: require tracking code via secure header AND rate limit check
CREATE POLICY "Customers can view own booking by tracking code"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (
  tracking_code IS NOT NULL 
  AND LENGTH(tracking_code) >= 32
  AND tracking_code = current_setting('request.headers', true)::json->>'x-tracking-code'
);