-- Create workflow_variables table
CREATE TABLE public.workflow_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL,
  default_value JSONB,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_variables_all" ON public.workflow_variables FOR ALL USING (true);
CREATE INDEX idx_workflow_variables_wf ON public.workflow_variables(workflow_id);

-- Enable RLS and policy on existing workflow_webhooks
ALTER TABLE public.workflow_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_webhooks_all" ON public.workflow_webhooks FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_workflow_webhooks_wf ON public.workflow_webhooks(workflow_id);