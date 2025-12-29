-- Add verification_token_hash column to verification_otps table
ALTER TABLE public.verification_otps 
ADD COLUMN IF NOT EXISTS verification_token_hash text NULL;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_verification_otps_token_hash 
ON public.verification_otps(verification_token_hash) 
WHERE verification_token_hash IS NOT NULL;

-- Update validate_email_verification function to check token hash
CREATE OR REPLACE FUNCTION public.validate_email_verification(
  p_email text,
  p_verification_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_record_exists boolean;
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));
  
  -- Hash the provided token
  v_token_hash := encode(sha256((p_verification_token || current_setting('app.settings.jwt_secret', true))::bytea), 'hex');
  
  -- Check if a valid verified OTP exists with matching token hash
  SELECT EXISTS (
    SELECT 1 
    FROM public.verification_otps
    WHERE email = p_email
      AND verified_at IS NOT NULL
      AND verification_token_hash = v_token_hash
      AND verified_at > (now() - interval '30 minutes')
  ) INTO v_record_exists;
  
  RETURN v_record_exists;
END;
$$;