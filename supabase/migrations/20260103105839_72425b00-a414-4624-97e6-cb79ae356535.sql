-- Fix RLS for workspace_subscriptions: ensure owners/admins can INSERT/UPDATE/DELETE only within their workspace

DO $$
BEGIN
  -- Drop the overly-broad / incomplete policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'workspace_subscriptions'
      AND policyname = 'Admins can manage subscriptions'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage subscriptions" ON public.workspace_subscriptions';
  END IF;
END $$;

-- Allow workspace owners/admins to fully manage their workspace subscription
CREATE POLICY "Workspace admins can manage their subscription"
ON public.workspace_subscriptions
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_subscriptions.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_subscriptions.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);