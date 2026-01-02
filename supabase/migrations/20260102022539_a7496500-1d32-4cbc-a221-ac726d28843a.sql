
-- =====================================================
-- FASE 1: FUNDACIONES DE SEGURIDAD E INTELIGENCIA
-- Shadow Mode, Drift Detection, Client Segmentation, Safety & Explainability
-- =====================================================

-- ===================
-- SHADOW MODE TABLES
-- ===================

-- Shadow decisions (auto-switching paralelo sin enviar)
CREATE TABLE public.shadow_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID,
  human_persona_used TEXT,
  router_persona_suggested TEXT,
  diff_summary JSONB DEFAULT '{}',
  predicted_outcome_delta NUMERIC,
  confidence NUMERIC,
  outcome_actual TEXT,
  was_router_better BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment gates (control de rollout seguro)
CREATE TABLE public.deployment_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  gate_name TEXT NOT NULL,
  gate_conditions JSONB DEFAULT '{"max_policy_violations": 3, "min_conversion_improvement": 0.05}',
  auto_pause_enabled BOOLEAN DEFAULT true,
  max_policy_violations INTEGER DEFAULT 3,
  min_conversion_improvement NUMERIC DEFAULT 0.05,
  current_violations INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- DRIFT DETECTION TABLES
-- =========================

-- Drift monitors (detección de obsolescencia)
CREATE TABLE public.drift_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  monitor_key TEXT NOT NULL,
  monitor_name TEXT,
  baseline_window INTERVAL DEFAULT '30 days',
  current_window INTERVAL DEFAULT '7 days',
  thresholds JSONB DEFAULT '{"warning": 0.1, "critical": 0.25}',
  baseline_value NUMERIC,
  current_value NUMERIC,
  drift_percentage NUMERIC,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'stale')),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, monitor_key)
);

-- Drift events (alertas de drift)
CREATE TABLE public.drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  monitor_id UUID REFERENCES public.drift_monitors(id) ON DELETE CASCADE,
  monitor_key TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  explanation TEXT,
  recommended_actions JSONB DEFAULT '[]',
  auto_actions_taken JSONB DEFAULT '[]',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- CLIENT SEGMENTATION TABLES
-- =============================

-- Client segments (definiciones)
CREATE TABLE public.client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  segment_key TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  rules_builder JSONB DEFAULT '{"conditions": [], "logic": "AND"}',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'users',
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, segment_key)
);

-- Segment membership (asignación dinámica)
CREATE TABLE public.segment_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  client_id UUID,
  contact_id UUID,
  segment_id UUID REFERENCES public.client_segments(id) ON DELETE CASCADE,
  segment_key TEXT,
  confidence NUMERIC DEFAULT 1.0,
  signals JSONB DEFAULT '{}',
  is_manual BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- SAFETY & EXPLAINABILITY TABLES
-- ================================

-- Hard safety constraints
CREATE TABLE public.safety_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  constraint_key TEXT NOT NULL,
  constraint_name TEXT,
  description TEXT,
  enforcement_points TEXT[] DEFAULT ARRAY['inbox_send'],
  action TEXT DEFAULT 'block' CHECK (action IN ('block', 'require_handoff', 'force_disclaimer', 'downgrade_autopilot', 'warn')),
  trigger_conditions JSONB DEFAULT '{}',
  blocked_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  violations_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, constraint_key)
);

-- Decision explanations (XAI - Explainable AI)
CREATE TABLE public.decision_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID,
  message_id UUID,
  decision_type TEXT DEFAULT 'persona_selection',
  persona_chosen TEXT,
  top_signals JSONB DEFAULT '[]',
  all_signals JSONB DEFAULT '{}',
  confidence NUMERIC,
  fallback_used BOOLEAN DEFAULT false,
  fallback_reason TEXT,
  model_version TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Human feedback loop
CREATE TABLE public.human_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID,
  decision_id UUID REFERENCES public.decision_explanations(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('agree', 'disagree', 'partial', 'skip')),
  original_persona TEXT,
  suggested_persona TEXT,
  note TEXT,
  context_snapshot JSONB DEFAULT '{}',
  used_for_training BOOLEAN DEFAULT false,
  training_batch_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================
-- RLS POLICIES
-- ================

ALTER TABLE public.shadow_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_feedback ENABLE ROW LEVEL SECURITY;

-- Shadow decisions policies
CREATE POLICY "Users can view shadow decisions in their workspace"
ON public.shadow_decisions FOR SELECT
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Users can insert shadow decisions in their workspace"
ON public.shadow_decisions FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Deployment gates policies
CREATE POLICY "Users can manage deployment gates in their workspace"
ON public.deployment_gates FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Drift monitors policies
CREATE POLICY "Users can manage drift monitors in their workspace"
ON public.drift_monitors FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Drift events policies
CREATE POLICY "Users can manage drift events in their workspace"
ON public.drift_events FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Client segments policies
CREATE POLICY "Users can manage client segments in their workspace"
ON public.client_segments FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Segment membership policies
CREATE POLICY "Users can manage segment membership in their workspace"
ON public.segment_membership FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Safety constraints policies
CREATE POLICY "Users can manage safety constraints in their workspace"
ON public.safety_constraints FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- Decision explanations policies
CREATE POLICY "Users can view decision explanations in their workspace"
ON public.decision_explanations FOR SELECT
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

CREATE POLICY "System can insert decision explanations"
ON public.decision_explanations FOR INSERT
WITH CHECK (true);

-- Human feedback policies
CREATE POLICY "Users can manage human feedback in their workspace"
ON public.human_feedback FOR ALL
USING (workspace_id IN (
  SELECT id FROM public.workspace_settings WHERE owner_user_id = auth.uid()
));

-- ================
-- INDEXES
-- ================

CREATE INDEX idx_shadow_decisions_workspace ON public.shadow_decisions(workspace_id);
CREATE INDEX idx_shadow_decisions_conversation ON public.shadow_decisions(conversation_id);
CREATE INDEX idx_shadow_decisions_created ON public.shadow_decisions(created_at DESC);

CREATE INDEX idx_deployment_gates_workspace ON public.deployment_gates(workspace_id);
CREATE INDEX idx_deployment_gates_status ON public.deployment_gates(status);

CREATE INDEX idx_drift_monitors_workspace ON public.drift_monitors(workspace_id);
CREATE INDEX idx_drift_monitors_status ON public.drift_monitors(status);
CREATE INDEX idx_drift_monitors_key ON public.drift_monitors(monitor_key);

CREATE INDEX idx_drift_events_workspace ON public.drift_events(workspace_id);
CREATE INDEX idx_drift_events_monitor ON public.drift_events(monitor_id);
CREATE INDEX idx_drift_events_severity ON public.drift_events(severity);
CREATE INDEX idx_drift_events_created ON public.drift_events(created_at DESC);

CREATE INDEX idx_client_segments_workspace ON public.client_segments(workspace_id);
CREATE INDEX idx_client_segments_key ON public.client_segments(segment_key);
CREATE INDEX idx_client_segments_active ON public.client_segments(active);

CREATE INDEX idx_segment_membership_workspace ON public.segment_membership(workspace_id);
CREATE INDEX idx_segment_membership_client ON public.segment_membership(client_id);
CREATE INDEX idx_segment_membership_segment ON public.segment_membership(segment_id);

CREATE INDEX idx_safety_constraints_workspace ON public.safety_constraints(workspace_id);
CREATE INDEX idx_safety_constraints_key ON public.safety_constraints(constraint_key);
CREATE INDEX idx_safety_constraints_active ON public.safety_constraints(active);

CREATE INDEX idx_decision_explanations_workspace ON public.decision_explanations(workspace_id);
CREATE INDEX idx_decision_explanations_conversation ON public.decision_explanations(conversation_id);
CREATE INDEX idx_decision_explanations_created ON public.decision_explanations(created_at DESC);

CREATE INDEX idx_human_feedback_workspace ON public.human_feedback(workspace_id);
CREATE INDEX idx_human_feedback_decision ON public.human_feedback(decision_id);
CREATE INDEX idx_human_feedback_type ON public.human_feedback(feedback_type);
