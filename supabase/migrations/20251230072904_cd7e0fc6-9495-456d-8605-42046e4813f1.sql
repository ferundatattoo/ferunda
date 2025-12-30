-- Drop the recursive policies
DROP POLICY IF EXISTS "Owners and admins can view all workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can delete workspace members" ON workspace_members;

-- Create a security definer function to check workspace membership without recursion
CREATE OR REPLACE FUNCTION check_workspace_access(p_workspace_id UUID, p_required_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'manager', 'artist', 'assistant'])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role = ANY(p_required_roles)
    AND is_active = true
  );
$$;

-- Create a function to check if a workspace has any members (for first member insert)
CREATE OR REPLACE FUNCTION workspace_has_members(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members WHERE workspace_id = p_workspace_id
  );
$$;

-- Simpler policies using the security definer functions
CREATE POLICY "Users can view their workspace members"
ON workspace_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR check_workspace_access(workspace_id, ARRAY['owner', 'admin', 'manager'])
);

CREATE POLICY "Admins can insert workspace members"
ON workspace_members FOR INSERT
WITH CHECK (
  -- Allow if user is owner/admin of workspace, OR if workspace has no members yet (first member)
  check_workspace_access(workspace_id, ARRAY['owner', 'admin'])
  OR NOT workspace_has_members(workspace_id)
);

CREATE POLICY "Admins can update workspace members"
ON workspace_members FOR UPDATE
USING (check_workspace_access(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners can delete workspace members"
ON workspace_members FOR DELETE
USING (check_workspace_access(workspace_id, ARRAY['owner']));