-- Fix: set immutable search_path for function
CREATE OR REPLACE FUNCTION public.marketing_update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
