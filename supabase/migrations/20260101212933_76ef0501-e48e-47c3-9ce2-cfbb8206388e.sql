
-- =====================================================
-- CRM SCHEMA STUDIO + WORKFLOW ENGINE - TABLES ONLY
-- =====================================================

-- CRM Objects
CREATE TABLE IF NOT EXISTS public.crm_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  label_singular TEXT NOT NULL,
  label_plural TEXT NOT NULL,
  icon TEXT DEFAULT 'box',
  is_standard BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, object_key)
);

-- CRM Properties
CREATE TABLE IF NOT EXISTS public.crm_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  property_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options_json JSONB DEFAULT '[]',
  validation_json JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  group_name TEXT DEFAULT 'default',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, object_key, property_key)
);

-- CRM Associations
CREATE TABLE IF NOT EXISTS public.crm_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  from_object TEXT NOT NULL,
  to_object TEXT NOT NULL,
  cardinality TEXT NOT NULL,
  label TEXT,
  rules_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Pipelines
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  pipeline_key TEXT NOT NULL,
  label TEXT NOT NULL,
  stages_json JSONB NOT NULL DEFAULT '[]',
  default_stage TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, object_key, pipeline_key)
);

-- CRM Views
CREATE TABLE IF NOT EXISTS public.crm_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  view_key TEXT NOT NULL,
  role TEXT NOT NULL,
  layout_json JSONB NOT NULL DEFAULT '{}',
  quick_actions_json JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, object_key, view_key, role)
);

-- CRM Permissions
CREATE TABLE IF NOT EXISTS public.crm_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  object_key TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  field_rules_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, role, object_key)
);

-- Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  object_key TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config_json JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  safety_level TEXT DEFAULT 'suggest',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Nodes (with workspace_id for RLS)
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  node_key TEXT NOT NULL,
  label TEXT,
  config_json JSONB DEFAULT '{}',
  ui_position_json JSONB DEFAULT '{"x":0,"y":0}',
  next_nodes_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Runs
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER,
  record_type TEXT,
  record_id UUID,
  status TEXT DEFAULT 'running',
  current_node_id UUID,
  logs_json JSONB DEFAULT '[]',
  context_json JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT
);

-- Workflow Experiments
CREATE TABLE IF NOT EXISTS public.workflow_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id UUID,
  split_config_json JSONB NOT NULL,
  metrics_json JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sequences
CREATE TABLE IF NOT EXISTS public.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_priority TEXT[] DEFAULT ARRAY['whatsapp','instagram','email'],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence Steps
CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  delay_config_json JSONB DEFAULT '{}',
  template_key TEXT,
  conditions_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence Enrollments
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.sequences(id) ON DELETE CASCADE,
  client_id UUID,
  conversation_id UUID,
  status TEXT DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stopped_reason TEXT
);

-- Brand Voices
CREATE TABLE IF NOT EXISTS public.brand_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  artist_id UUID,
  voice_name TEXT NOT NULL,
  tone_sliders_json JSONB DEFAULT '{"luxury":50,"friendly":50,"direct":50,"playful":50,"minimal":50}',
  vocabulary_allow TEXT[] DEFAULT '{}',
  vocabulary_block TEXT[] DEFAULT '{}',
  compliance_disclaimers_json JSONB DEFAULT '{}',
  language_preferences TEXT[] DEFAULT ARRAY['es','en'],
  emoji_style TEXT DEFAULT 'light',
  examples_good JSONB DEFAULT '[]',
  examples_bad JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reply Blueprints
CREATE TABLE IF NOT EXISTS public.reply_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  blueprint_key TEXT NOT NULL,
  channel TEXT,
  required_slots TEXT[] DEFAULT '{}',
  template_text TEXT NOT NULL,
  safety_level TEXT DEFAULT 'low',
  default_voice_scope TEXT DEFAULT 'studio',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, blueprint_key, channel)
);

-- Personas
CREATE TABLE IF NOT EXISTS public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  persona_key TEXT NOT NULL,
  artist_id UUID,
  voice_profile_id UUID,
  boundaries_json JSONB DEFAULT '{}',
  disclaimers_json JSONB DEFAULT '[]',
  allowed_actions_json JSONB DEFAULT '[]',
  escalation_rules_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Persona States
CREATE TABLE IF NOT EXISTS public.persona_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  current_persona TEXT NOT NULL,
  last_switch_reason TEXT,
  lock_until TIMESTAMPTZ,
  confidence NUMERIC(3,2) DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Persona Routing Rules
CREATE TABLE IF NOT EXISTS public.persona_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  conditions_json JSONB NOT NULL,
  persona_target TEXT NOT NULL,
  tone_profile TEXT,
  autopilot_level TEXT DEFAULT 'suggest',
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation Intel Threads
CREATE TABLE IF NOT EXISTS public.conv_intel_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  channel TEXT,
  assigned_to UUID,
  stage TEXT DEFAULT 'lead',
  outcome TEXT,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation Intel Insights
CREATE TABLE IF NOT EXISTS public.conv_intel_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  intent TEXT,
  confidence NUMERIC(3,2),
  sentiment TEXT,
  urgency NUMERIC(3,2) DEFAULT 0,
  readiness_score NUMERIC(3,2) DEFAULT 0,
  close_probability NUMERIC(3,2) DEFAULT 0,
  key_moments_json JSONB DEFAULT '[]',
  missing_fields_json JSONB DEFAULT '[]',
  next_best_question TEXT,
  recommended_actions JSONB DEFAULT '[]',
  risk_flags_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Objection Taxonomy
CREATE TABLE IF NOT EXISTS public.objection_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  objection_key TEXT NOT NULL,
  label TEXT NOT NULL,
  examples_good JSONB DEFAULT '[]',
  examples_bad JSONB DEFAULT '[]',
  resolution_playbook_key TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, objection_key)
);

-- Conversation Objections
CREATE TABLE IF NOT EXISTS public.conv_intel_objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  objection_key TEXT NOT NULL,
  severity NUMERIC(3,2) DEFAULT 0.5,
  evidence_turns INTEGER[] DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lead Scores
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  score INTEGER DEFAULT 0,
  fit_score NUMERIC(3,2) DEFAULT 0,
  intent_score NUMERIC(3,2) DEFAULT 0,
  reliability_score NUMERIC(3,2) DEFAULT 0.5,
  explanation JSONB DEFAULT '[]',
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Routing Rules
CREATE TABLE IF NOT EXISTS public.routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  conditions_json JSONB NOT NULL,
  assign_to UUID,
  assign_to_role TEXT,
  sla_minutes INTEGER,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Option Bundles
CREATE TABLE IF NOT EXISTS public.option_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  bundle_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  options_json JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  selected_option_index INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Approvals
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  bundle_id UUID,
  requested_by UUID,
  requested_to_role TEXT,
  requested_to_user UUID,
  status TEXT DEFAULT 'pending',
  decision_notes TEXT,
  expires_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Undo Stack
CREATE TABLE IF NOT EXISTS public.undo_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  previous_state_json JSONB NOT NULL,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Docs
CREATE TABLE IF NOT EXISTS public.knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT,
  media_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  permissions_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Model Registry
CREATE TABLE IF NOT EXISTS public.model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model_key TEXT NOT NULL,
  task_types TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT true,
  cost_profile_json JSONB DEFAULT '{}',
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, provider, model_key)
);

-- Model Routes
CREATE TABLE IF NOT EXISTS public.model_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  priority_list JSONB NOT NULL,
  fallback_behavior TEXT DEFAULT 'error',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, task_type)
);

-- AI Jobs
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  input_ref JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  output_ref JSONB,
  provider_used TEXT,
  model_used TEXT,
  latency_ms INTEGER,
  cost_estimate NUMERIC(10,6),
  retries INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Guardrail Rules
CREATE TABLE IF NOT EXISTS public.guardrail_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  trigger_conditions_json JSONB NOT NULL,
  action TEXT NOT NULL,
  message_to_user TEXT,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Autopilot Matrix
CREATE TABLE IF NOT EXISTS public.autopilot_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  persona_key TEXT NOT NULL,
  intent TEXT NOT NULL,
  allowed_level TEXT DEFAULT 'suggest',
  requires_approval BOOLEAN DEFAULT false,
  required_disclaimers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, persona_key, intent)
);

-- Integration Health
CREATE TABLE IF NOT EXISTS public.integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  token_expires_at TIMESTAMPTZ,
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  metrics_json JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, channel)
);

-- Message Queue
CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  conversation_id UUID,
  message_content JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crm_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conv_intel_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conv_intel_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objection_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conv_intel_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undo_stack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardrail_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- Create workspace access helper function
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND is_active = true
  );
$$;

-- RLS Policies for all tables (using workspace_id)
CREATE POLICY "ws_access_crm_objects" ON public.crm_objects FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_crm_properties" ON public.crm_properties FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_crm_associations" ON public.crm_associations FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_crm_pipelines" ON public.crm_pipelines FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_crm_views" ON public.crm_views FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_crm_permissions" ON public.crm_permissions FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_workflows" ON public.workflows FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_workflow_nodes" ON public.workflow_nodes FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_workflow_runs" ON public.workflow_runs FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_workflow_experiments" ON public.workflow_experiments FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_sequences" ON public.sequences FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_sequence_steps" ON public.sequence_steps FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_sequence_enrollments" ON public.sequence_enrollments FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_brand_voices" ON public.brand_voices FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_reply_blueprints" ON public.reply_blueprints FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_personas" ON public.personas FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_persona_states" ON public.persona_states FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_persona_routing_rules" ON public.persona_routing_rules FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_conv_intel_threads" ON public.conv_intel_threads FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_conv_intel_insights" ON public.conv_intel_insights FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_objection_taxonomy" ON public.objection_taxonomy FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_conv_intel_objections" ON public.conv_intel_objections FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_lead_scores" ON public.lead_scores FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_routing_rules" ON public.routing_rules FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_option_bundles" ON public.option_bundles FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_approvals" ON public.approvals FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_undo_stack" ON public.undo_stack FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_knowledge_docs" ON public.knowledge_docs FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_model_registry" ON public.model_registry FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_model_routes" ON public.model_routes FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_ai_jobs" ON public.ai_jobs FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_guardrail_rules" ON public.guardrail_rules FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_autopilot_matrix" ON public.autopilot_matrix FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_integration_health" ON public.integration_health FOR ALL USING (user_has_workspace_access(workspace_id));
CREATE POLICY "ws_access_message_queue" ON public.message_queue FOR ALL USING (user_has_workspace_access(workspace_id));
