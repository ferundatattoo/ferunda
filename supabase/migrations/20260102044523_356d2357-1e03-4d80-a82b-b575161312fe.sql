-- Action Catalog: unified capability layer
CREATE TABLE public.action_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  required_role TEXT DEFAULT 'member',
  handler_type TEXT NOT NULL DEFAULT 'internal',
  handler_ref TEXT,
  requires_confirmation BOOLEAN DEFAULT false,
  requires_double_confirm BOOLEAN DEFAULT false,
  cooldown_seconds INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID REFERENCES public.workspace_settings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action execution log
CREATE TABLE public.action_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID REFERENCES public.action_catalog(id),
  action_key TEXT NOT NULL,
  executor_id UUID,
  workspace_id UUID REFERENCES public.workspace_settings(id),
  entity_type TEXT,
  entity_id TEXT,
  input_data JSONB DEFAULT '{}',
  output_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'retrying')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view action catalog" ON public.action_catalog
  FOR SELECT USING (workspace_id IS NULL OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage action catalog" ON public.action_catalog
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view their executions" ON public.action_executions
  FOR SELECT USING (executor_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create executions" ON public.action_executions
  FOR INSERT WITH CHECK (executor_id = auth.uid());

CREATE POLICY "System can update executions" ON public.action_executions
  FOR UPDATE USING (executor_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_action_catalog_key ON public.action_catalog(action_key);
CREATE INDEX idx_action_catalog_category ON public.action_catalog(category);
CREATE INDEX idx_action_executions_action ON public.action_executions(action_id);
CREATE INDEX idx_action_executions_executor ON public.action_executions(executor_id);
CREATE INDEX idx_action_executions_status ON public.action_executions(status);
CREATE INDEX idx_action_executions_workspace ON public.action_executions(workspace_id);

-- Seed default actions
INSERT INTO public.action_catalog (action_key, display_name, description, category, risk_level, required_role, handler_type) VALUES
  ('send_message', 'Send Message', 'Send a message to a client', 'messaging', 'low', 'member', 'internal'),
  ('create_deposit_link', 'Create Deposit Link', 'Generate a payment link for deposit', 'payments', 'medium', 'member', 'edge_function'),
  ('propose_slots', 'Propose Time Slots', 'Suggest available booking slots', 'scheduling', 'low', 'member', 'internal'),
  ('confirm_booking', 'Confirm Booking', 'Confirm a pending booking', 'scheduling', 'medium', 'member', 'internal'),
  ('cancel_booking', 'Cancel Booking', 'Cancel an existing booking', 'scheduling', 'high', 'member', 'internal'),
  ('send_reminder', 'Send Reminder', 'Send reminder notification', 'notifications', 'low', 'member', 'edge_function'),
  ('generate_quote', 'Generate Quote', 'Create a price quote', 'payments', 'low', 'member', 'internal'),
  ('apply_policy', 'Apply Policy', 'Apply a studio policy', 'compliance', 'medium', 'admin', 'internal'),
  ('issue_refund', 'Issue Refund', 'Process a refund', 'payments', 'critical', 'admin', 'edge_function'),
  ('sync_calendar', 'Sync Calendar', 'Sync with external calendar', 'scheduling', 'low', 'member', 'edge_function'),
  ('generate_content', 'Generate Content', 'AI generate social content', 'growth', 'low', 'member', 'edge_function'),
  ('publish_content', 'Publish Content', 'Publish to social media', 'growth', 'medium', 'member', 'edge_function'),
  ('create_draft', 'Create Draft', 'Create a draft response', 'messaging', 'low', 'member', 'internal'),
  ('escalate_to_artist', 'Escalate to Artist', 'Escalate conversation to artist', 'messaging', 'low', 'member', 'internal'),
  ('run_playbook', 'Run Playbook', 'Execute an automation playbook', 'automation', 'medium', 'member', 'edge_function')
ON CONFLICT (action_key) DO NOTHING;