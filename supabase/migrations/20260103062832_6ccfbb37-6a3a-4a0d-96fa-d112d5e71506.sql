-- Phase 3: Update role constraint and normalize legacy roles
-- IMPORTANT: Drop constraint first, update data, then add new constraint

-- Step 1: Drop old constraint
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;

-- Step 2: Update existing legacy roles to 'studio' BEFORE adding constraint
UPDATE workspace_members 
SET role = 'studio', updated_at = NOW()
WHERE role IN ('owner', 'admin', 'manager');

-- Step 3: Add new constraint with simplified roles
ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('studio', 'artist', 'assistant'));

-- Add comment to document the role system
COMMENT ON COLUMN workspace_members.role IS 'Simplified role system: studio (admin/owner access), artist, assistant';