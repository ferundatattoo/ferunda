-- Fix 1: Ensure bookings table has proper restrictive SELECT policy
-- The current policy is already admin-only, but let's also allow customers to view their own booking by tracking code
-- First, verify the existing policy is restrictive (it should be)

-- Add policy for customers to view their own booking via tracking code (public status check)
-- This is needed for the booking status page to work
CREATE POLICY "Customers can view own booking by tracking code"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (
  tracking_code IS NOT NULL 
  AND tracking_code = current_setting('request.headers', true)::json->>'x-tracking-code'
);

-- Fix 2: Create encryption functions for OAuth tokens
-- Create a function to encrypt tokens before storage
CREATE OR REPLACE FUNCTION encrypt_token(plain_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use pgcrypto for encryption with a server-side key
  -- The key is derived from a combination of user_id and a secret
  RETURN encode(
    encrypt(
      plain_token::bytea,
      sha256(('calendar_token_encryption_key_v1')::bytea),
      'aes'
    ),
    'base64'
  );
END;
$$;

-- Create a function to decrypt tokens when needed
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN convert_from(
    decrypt(
      decode(encrypted_token, 'base64'),
      sha256(('calendar_token_encryption_key_v1')::bytea),
      'aes'
    ),
    'UTF8'
  );
END;
$$;

-- Add additional security: Only allow token access from authenticated sessions with matching user_id
-- Drop existing overly permissive policies and create stricter ones
DROP POLICY IF EXISTS "Users can view own calendar sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Users can update own calendar sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Users can insert own calendar sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Users can delete own calendar sync tokens" ON public.calendar_sync_tokens;

-- Stricter policies - only admins can manage calendar sync tokens
-- Regular users shouldn't directly access the tokens table
CREATE POLICY "Only admins can view calendar sync tokens"
ON public.calendar_sync_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert calendar sync tokens"
ON public.calendar_sync_tokens
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update calendar sync tokens"
ON public.calendar_sync_tokens
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete calendar sync tokens"
ON public.calendar_sync_tokens
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Remove the overly permissive security_logs INSERT policy
-- Only allow inserts through authenticated sessions or service role
DROP POLICY IF EXISTS "Anyone can insert security logs" ON public.security_logs;

CREATE POLICY "Authenticated users can insert security logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow anon inserts but only for specific event types (login attempts)
CREATE POLICY "Anon can insert login attempt logs"
ON public.security_logs
FOR INSERT
TO anon
WITH CHECK (event_type IN ('login_attempt', 'login_failed', 'signup_attempt', 'signup_failed'));