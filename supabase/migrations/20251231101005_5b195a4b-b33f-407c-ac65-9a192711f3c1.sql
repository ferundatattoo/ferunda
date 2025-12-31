-- Social Channels Configuration
CREATE TABLE public.social_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('instagram', 'tiktok', 'email', 'whatsapp')),
  channel_name TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  account_id TEXT,
  account_username TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, channel_type, account_id)
);

ALTER TABLE public.social_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view social channels"
ON public.social_channels FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can manage social channels"
ON public.social_channels FOR ALL
TO authenticated
USING (public.check_workspace_access(workspace_id, ARRAY['owner', 'admin', 'manager']));