-- Drop the overly permissive SELECT policy that exposes all booking data
DROP POLICY IF EXISTS "Users can view their own bookings by email" ON public.bookings;

-- Create restrictive policies - no public SELECT access (admin will view via service role)
-- Customers only need to submit bookings, not view them

-- Explicitly prevent public UPDATE operations
CREATE POLICY "No public updates allowed" 
ON public.bookings 
FOR UPDATE 
USING (false);

-- Explicitly prevent public DELETE operations
CREATE POLICY "No public deletes allowed" 
ON public.bookings 
FOR DELETE 
USING (false);