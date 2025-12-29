-- Fix the generate_tracking_code function to include extensions in search_path
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Generate a cryptographically secure 32-character hex tracking code
  NEW.tracking_code := UPPER(encode(gen_random_bytes(16), 'hex'));
  RETURN NEW;
END;
$$;