-- Allow non-admin staff roles to view bookings for finance/inbox dashboards
-- Keep existing admin/customer portal policies intact.

CREATE POLICY "Managers and assistants can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
);
