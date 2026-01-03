-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT DEFAULT 'free',
  plan_limits JSONB DEFAULT '{"users": 3, "workspaces": 1, "api_calls": 1000, "storage_gb": 1}'::jsonb,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization API keys
CREATE TABLE IF NOT EXISTS public.organization_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read'],
  created_by UUID,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization usage tracking
CREATE TABLE IF NOT EXISTS public.organization_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  api_calls INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  workflow_runs INTEGER DEFAULT 0,
  ai_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enterprise audit log
CREATE TABLE IF NOT EXISTS public.enterprise_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link workspaces to organizations (add column if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workspace_settings' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.workspace_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Owners can update their organizations" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Members policies
CREATE POLICY "Users can view org members" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins can manage members" ON public.organization_members
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Invitations policies
CREATE POLICY "Admins can manage invitations" ON public.organization_invitations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- API Keys policies
CREATE POLICY "Users can view org API keys" ON public.organization_api_keys
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins can manage API keys" ON public.organization_api_keys
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Usage policies
CREATE POLICY "Users can view org usage" ON public.organization_usage
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active')
  );

-- Audit log policies
CREATE POLICY "Admins can view audit log" ON public.enterprise_audit_log
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_api_keys_hash ON public.organization_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON public.enterprise_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.enterprise_audit_log(created_at DESC);
