-- Step 1: Drop the RLS policy that depends on tracking_code
DROP POLICY IF EXISTS "Customers can view limited booking data by tracking code" ON bookings;

-- Step 2: Drop the view that depends on tracking_code  
DROP VIEW IF EXISTS customer_booking_view;

-- Step 3: Expand tracking_code column to support 32-character codes
ALTER TABLE bookings 
ALTER COLUMN tracking_code TYPE VARCHAR(32);

-- Step 4: Recreate the customer_booking_view with security_invoker
CREATE OR REPLACE VIEW customer_booking_view 
WITH (security_invoker = on)
AS
SELECT 
  id,
  status,
  pipeline_stage,
  scheduled_date,
  scheduled_time,
  deposit_paid,
  deposit_amount,
  placement,
  size,
  requested_city,
  tracking_code,
  created_at,
  split_part(name, ' '::text, 1) AS first_name,
  left(tattoo_description, 50) AS tattoo_description,
  COALESCE(jsonb_array_length(reference_images_customer), 0) AS reference_count
FROM bookings b
WHERE tracking_code IS NOT NULL 
  AND (tracking_code_expires_at IS NULL OR tracking_code_expires_at > now());

-- Step 5: Recreate the RLS policy
CREATE POLICY "Customers can view limited booking data by tracking code"
ON bookings FOR SELECT
USING (
  tracking_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps 
    WHERE cps.booking_id = bookings.id 
    AND cps.is_active = true 
    AND cps.expires_at > now()
  )
);