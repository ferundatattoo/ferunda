-- Enable RLS on existing tables (if not already)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies if not exist using DO block
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'organizations_all') THEN
    CREATE POLICY "organizations_all" ON public.organizations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'org_members_all') THEN
    CREATE POLICY "org_members_all" ON public.organization_members FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_invitations' AND policyname = 'org_invitations_all') THEN
    CREATE POLICY "org_invitations_all" ON public.organization_invitations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_api_keys' AND policyname = 'org_api_keys_all') THEN
    CREATE POLICY "org_api_keys_all" ON public.organization_api_keys FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_usage' AND policyname = 'org_usage_all') THEN
    CREATE POLICY "org_usage_all" ON public.organization_usage FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enterprise_audit_log' AND policyname = 'enterprise_audit_all') THEN
    CREATE POLICY "enterprise_audit_all" ON public.enterprise_audit_log FOR ALL USING (true);
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token_idx ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_org_id ON public.enterprise_audit_log(organization_id);