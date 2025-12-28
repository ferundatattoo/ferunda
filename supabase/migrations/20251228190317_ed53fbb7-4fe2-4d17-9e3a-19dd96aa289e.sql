-- Recreate the tracking code trigger since it may not have been created
DROP TRIGGER IF EXISTS set_tracking_code ON public.bookings;
CREATE TRIGGER set_tracking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_tracking_code();

-- Also add the RLS policy for customers to check their own booking status by tracking code
CREATE POLICY "Anyone can view booking by tracking code"
ON public.bookings
FOR SELECT
USING (tracking_code IS NOT NULL);