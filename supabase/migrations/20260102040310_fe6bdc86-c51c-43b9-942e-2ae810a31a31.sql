-- Create workflow_triggers table
CREATE TABLE public.workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_triggers_all" ON public.workflow_triggers FOR ALL USING (true);
CREATE INDEX idx_workflow_triggers_wf ON public.workflow_triggers(workflow_id);