-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.tracking_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN NEW;
END;
$$;