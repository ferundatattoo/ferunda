-- Phase 1: Fix customer_booking_view to only expose safe fields
-- Drop and recreate the view with minimal safe data

DROP VIEW IF EXISTS public.customer_booking_view;

CREATE VIEW public.customer_booking_view AS
SELECT 
  b.id,
  b.status,
  b.pipeline_stage,
  b.scheduled_date,
  b.scheduled_time,
  b.deposit_paid,
  b.deposit_amount,
  b.placement,
  b.size,
  b.requested_city,
  b.tracking_code,
  b.created_at,
  -- Only show first name, not full name or email
  SPLIT_PART(b.name, ' ', 1) as first_name,
  -- Safe description (truncated)
  LEFT(b.tattoo_description, 50) as tattoo_description,
  -- Don't expose reference images directly, just count
  COALESCE(jsonb_array_length(b.reference_images_customer), 0) as reference_count
FROM public.bookings b
WHERE 
  b.tracking_code IS NOT NULL 
  AND (b.tracking_code_expires_at IS NULL OR b.tracking_code_expires_at > now());

-- Grant access to the view
GRANT SELECT ON public.customer_booking_view TO anon, authenticated;

-- Phase 2: Add RLS policies for customer portal tables
-- These allow customers to access their own data via validated sessions

-- Customer Messages: Allow reading own messages via customer portal session
CREATE POLICY "Customers can view their own messages via session" 
ON public.customer_messages 
FOR SELECT 
USING (
  -- Check if there's a valid active session for this booking
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.booking_id = customer_messages.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- Customer Emails: Allow reading own emails via customer portal session
CREATE POLICY "Customers can view their own emails via session" 
ON public.customer_emails 
FOR SELECT 
USING (
  -- Check if there's a valid active session for this booking
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.booking_id = customer_emails.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- Customer Payments: Allow reading own payments via customer portal session
CREATE POLICY "Customers can view their own payments via session" 
ON public.customer_payments 
FOR SELECT 
USING (
  -- Check if there's a valid active session for this booking
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.booking_id = customer_payments.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- Reschedule Requests: Allow reading own reschedule requests via customer portal session
CREATE POLICY "Customers can view their own reschedule requests via session" 
ON public.reschedule_requests 
FOR SELECT 
USING (
  -- Check if there's a valid active session for this booking
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.booking_id = reschedule_requests.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);