-- Fix: Drop the SECURITY DEFINER view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.customer_booking_view;

-- Recreate with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.customer_booking_view
WITH (security_invoker = true)
AS
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
  split_part(name, ' ', 1) as first_name,
  CASE WHEN deposit_paid THEN total_paid ELSE NULL END as total_paid,
  created_at,
  reference_images_customer
FROM public.bookings
WHERE tracking_code IS NOT NULL;