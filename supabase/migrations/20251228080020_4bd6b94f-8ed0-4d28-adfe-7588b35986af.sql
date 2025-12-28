-- Add rate limiting function for bookings to prevent abuse
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Check how many bookings from the same email in the last hour
  SELECT COUNT(*) INTO recent_count
  FROM public.bookings
  WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 3 booking attempts per email per hour
  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many booking requests. Please try again later.';
  END IF;
  
  -- Also check IP-based rate limiting by counting recent anonymous submissions
  SELECT COUNT(*) INTO recent_count
  FROM public.bookings
  WHERE created_at > NOW() - INTERVAL '10 minutes';
  
  -- Allow max 10 total bookings per 10 minutes (site-wide protection)
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'High demand detected. Please try again in a few minutes.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting on bookings
CREATE TRIGGER booking_rate_limit_check
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_booking_rate_limit();

-- Add basic input validation
CREATE OR REPLACE FUNCTION public.validate_booking_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Sanitize and validate name (prevent SQL injection in display)
  IF LENGTH(NEW.name) < 2 OR LENGTH(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Name must be between 2 and 100 characters';
  END IF;
  
  -- Limit description length
  IF LENGTH(NEW.tattoo_description) > 5000 THEN
    RAISE EXCEPTION 'Description too long';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for input validation
CREATE TRIGGER booking_input_validation
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_input();