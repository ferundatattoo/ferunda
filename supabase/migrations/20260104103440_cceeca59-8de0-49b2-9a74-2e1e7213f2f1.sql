-- Fix RLS for client_profiles: Allow workspace members to manage clients (not just admins)
-- Drop overly restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can manage client profiles" ON public.client_profiles;

-- Create proper workspace-based policies for client_profiles
CREATE POLICY "Workspace members can view client profiles"
ON public.client_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

CREATE POLICY "Workspace members can insert client profiles"
ON public.client_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

CREATE POLICY "Workspace members can update client profiles"
ON public.client_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

CREATE POLICY "Workspace members can delete client profiles"
ON public.client_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

-- Fix client_documents: Allow workspace members to manage documents
DROP POLICY IF EXISTS "Allow anonymous insert for documents" ON public.client_documents;

CREATE POLICY "Workspace members can view client documents"
ON public.client_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

CREATE POLICY "Workspace members can insert client documents"
ON public.client_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);

CREATE POLICY "Workspace members can update client documents"
ON public.client_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.is_active = true
  )
);