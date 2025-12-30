-- Add workspace type and onboarding columns to workspace_settings
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS workspace_type TEXT DEFAULT 'solo' CHECK (workspace_type IN ('solo', 'studio'));
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS setup_step TEXT DEFAULT 'identity';

-- Add user_id and workspace_id to studio_artists
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspace_settings(id);

-- Create workspace_members table to link users to workspaces with roles
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES studio_artists(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'artist', 'assistant')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create onboarding_progress table to track wizard completion
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspace_settings(id),
  wizard_type TEXT NOT NULL CHECK (wizard_type IN ('solo_setup', 'studio_setup', 'artist_join', 'staff_join')),
  current_step TEXT NOT NULL,
  steps_completed TEXT[] DEFAULT '{}',
  form_data JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Enable RLS on new tables
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_members
CREATE POLICY "Users can view their own workspace memberships" 
ON workspace_members FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owners and admins can view all workspace members" 
ON workspace_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners and admins can insert workspace members" 
ON workspace_members FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('owner', 'admin')
  )
  OR NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id
  )
);

CREATE POLICY "Owners and admins can update workspace members" 
ON workspace_members FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners can delete workspace members" 
ON workspace_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role = 'owner'
  )
);

-- RLS policies for onboarding_progress
CREATE POLICY "Users can view their own onboarding progress" 
ON onboarding_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress" 
ON onboarding_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress" 
ON onboarding_progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_artists_user_id ON studio_artists(user_id);

-- Create function to get user's workspace role
CREATE OR REPLACE FUNCTION get_user_workspace_role(p_user_id UUID)
RETURNS TABLE(workspace_id UUID, workspace_type TEXT, role TEXT, artist_id UUID, permissions JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.workspace_id,
    ws.workspace_type,
    wm.role,
    wm.artist_id,
    wm.permissions
  FROM workspace_members wm
  JOIN workspace_settings ws ON ws.id = wm.workspace_id
  WHERE wm.user_id = p_user_id AND wm.is_active = true
  LIMIT 1;
END;
$$;

-- Create function to check if user needs onboarding
CREATE OR REPLACE FUNCTION check_user_onboarding(p_user_id UUID)
RETURNS TABLE(needs_onboarding BOOLEAN, wizard_type TEXT, current_step TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has any workspace membership
  IF NOT EXISTS (SELECT 1 FROM workspace_members WHERE user_id = p_user_id AND is_active = true) THEN
    RETURN QUERY SELECT true, 'identity'::TEXT, 'workspace_type'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user has incomplete onboarding
  RETURN QUERY
  SELECT 
    op.completed_at IS NULL,
    op.wizard_type,
    op.current_step
  FROM onboarding_progress op
  WHERE op.user_id = p_user_id AND op.completed_at IS NULL
  LIMIT 1;
  
  -- If no incomplete onboarding found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$;