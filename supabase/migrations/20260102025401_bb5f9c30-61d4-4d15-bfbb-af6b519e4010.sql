-- ================================================
-- PHASE 5: Multi-Tenant Enterprise Tables
-- ================================================

-- Organizations (top-level tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  billing_email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  plan_limits JSONB DEFAULT '{}',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organization invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID,
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workspaces belong to organizations
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Usage tracking per organization
CREATE TABLE IF NOT EXISTS public.organization_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC(12,2) DEFAULT 0,
  limit_value NUMERIC(12,2),
  overage_charges NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for enterprise compliance
CREATE TABLE IF NOT EXISTS public.enterprise_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API keys for organizations
CREATE TABLE IF NOT EXISTS public.organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read'],
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SSO configurations
CREATE TABLE IF NOT EXISTS public.sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('saml', 'oidc', 'google', 'microsoft')),
  config JSONB NOT NULL,
  domain TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view their organization"
  ON public.organizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = id AND om.user_id = auth.uid() AND om.status = 'active'
  ));

CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = id AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  ));

CREATE POLICY "Users can view org members in their org"
  ON public.organization_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.status = 'active'
  ));

CREATE POLICY "Org admins can manage members"
  ON public.organization_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  ));

CREATE POLICY "Org admins can manage invitations"
  ON public.organization_invitations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  ));

CREATE POLICY "Org members can view usage"
  ON public.organization_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.status = 'active'
  ));

CREATE POLICY "Org admins can view audit log"
  ON public.enterprise_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  ));

CREATE POLICY "Org admins can manage API keys"
  ON public.organization_api_keys FOR ALL
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  ));

CREATE POLICY "Org admins can manage SSO"
  ON public.sso_configurations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_id AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  ));