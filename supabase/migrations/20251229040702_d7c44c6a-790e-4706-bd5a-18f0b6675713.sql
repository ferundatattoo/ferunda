-- Fix bookings table: ensure only admins can SELECT
-- Drop existing restrictive SELECT policy and create permissive one
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;

-- Create explicit permissive SELECT policy for admins only
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix customer_emails table: add explicit SELECT policy
-- The ALL policy doesn't work well for granular control, split it
DROP POLICY IF EXISTS "Admins can manage customer_emails" ON public.customer_emails;

-- Create separate policies for each operation
CREATE POLICY "Admins can select customer_emails"
ON public.customer_emails
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert customer_emails"
ON public.customer_emails
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update customer_emails"
ON public.customer_emails
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete customer_emails"
ON public.customer_emails
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));