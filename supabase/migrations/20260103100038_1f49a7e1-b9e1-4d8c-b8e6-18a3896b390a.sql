-- Allow workspace staff (any active workspace membership) to view bookings
-- This enables internal OS dashboards while still blocking random authenticated users.

CREATE POLICY "Workspace members can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.is_active = true
  )
);
