-- Simplify validate_email_verification to compare hashes directly
-- The create-booking edge function now hashes the token before calling this function
CREATE OR REPLACE FUNCTION public.validate_email_verification(
  p_email text,
  p_verification_token text  -- This is now the HASH of the token
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_exists boolean;
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));
  
  -- Check if a valid verified OTP exists with matching token hash
  -- The p_verification_token parameter is already the hashed token
  -- computed by the edge function using SHA-256(token + service_key_prefix)
  SELECT EXISTS (
    SELECT 1 
    FROM public.verification_otps
    WHERE email = p_email
      AND verified_at IS NOT NULL
      AND verification_token_hash IS NOT NULL
      AND verification_token_hash = p_verification_token
      AND verified_at > (now() - interval '30 minutes')
  ) INTO v_record_exists;
  
  RETURN v_record_exists;
END;
$$;