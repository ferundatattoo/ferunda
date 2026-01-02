-- ================================================
-- PHASE 4: Workflow Engine 2.0 Tables
-- ================================================

-- Workflow definitions
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'webhook', 'manual')),
  trigger_config JSONB DEFAULT '{}',
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow runs/executions
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  trigger_type TEXT,
  trigger_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  current_node_id TEXT,
  context JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual step executions within a run
CREATE TABLE IF NOT EXISTS public.workflow_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reusable action templates
CREATE TABLE IF NOT EXISTS public.workflow_action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL,
  config_schema JSONB,
  default_config JSONB DEFAULT '{}',
  icon TEXT,
  category TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled workflow triggers
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  cron_expression TEXT,
  timezone TEXT DEFAULT 'UTC',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook endpoints for workflows
CREATE TABLE IF NOT EXISTS public.workflow_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  endpoint_path TEXT NOT NULL UNIQUE,
  secret_key TEXT,
  allowed_methods TEXT[] DEFAULT ARRAY['POST'],
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their workspace workflows"
  ON public.workflow_definitions FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));

CREATE POLICY "Users can view their workflow runs"
  ON public.workflow_runs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_definitions wd 
    JOIN workspace_settings ws ON ws.id = wd.workspace_id 
    WHERE wd.id = workflow_id AND ws.owner_user_id = auth.uid()
  ));

CREATE POLICY "Users can view their workflow step logs"
  ON public.workflow_step_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_runs wr
    JOIN workflow_definitions wd ON wd.id = wr.workflow_id
    JOIN workspace_settings ws ON ws.id = wd.workspace_id 
    WHERE wr.id = run_id AND ws.owner_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their workspace action templates"
  ON public.workflow_action_templates FOR ALL
  USING (
    is_system = true OR 
    EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid())
  );

CREATE POLICY "Users can manage their workflow schedules"
  ON public.workflow_schedules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_definitions wd 
    JOIN workspace_settings ws ON ws.id = wd.workspace_id 
    WHERE wd.id = workflow_id AND ws.owner_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their workflow webhooks"
  ON public.workflow_webhooks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_definitions wd 
    JOIN workspace_settings ws ON ws.id = wd.workspace_id 
    WHERE wd.id = workflow_id AND ws.owner_user_id = auth.uid()
  ));