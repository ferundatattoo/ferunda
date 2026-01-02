-- ============================================
-- PHASE 6: Advanced AI Features Tables
-- ============================================

-- Client Segmentation Tables
CREATE TABLE IF NOT EXISTS public.client_segments (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_segment_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  segment_key TEXT NOT NULL,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  signals JSONB DEFAULT '{}',
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Drift Detection Tables
CREATE TABLE IF NOT EXISTS public.drift_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  monitor_key TEXT NOT NULL,
  monitor_name TEXT,
  baseline_value NUMERIC,
  current_value NUMERIC,
  drift_percentage NUMERIC,
  thresholds JSONB DEFAULT '{"warning": 0.1, "critical": 0.2}',
  status TEXT DEFAULT 'healthy',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  monitor_key TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  explanation TEXT,
  recommended_actions JSONB DEFAULT '[]',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shadow Mode Tables
CREATE TABLE IF NOT EXISTS public.shadow_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID,
  human_persona_used TEXT,
  router_persona_suggested TEXT,
  diff_summary JSONB,
  predicted_outcome_delta NUMERIC DEFAULT 0,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  was_router_better BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deployment_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  gate_name TEXT NOT NULL,
  gate_conditions JSONB DEFAULT '{}',
  auto_pause_enabled BOOLEAN DEFAULT true,
  max_policy_violations INTEGER DEFAULT 5,
  current_violations INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- A/B Testing Tables (enhanced)
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL,
  experiment_name TEXT,
  description TEXT,
  variants JSONB DEFAULT '[]',
  traffic_allocation JSONB DEFAULT '{"control": 50, "treatment": 50}',
  primary_metric TEXT,
  secondary_metrics JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  converted BOOLEAN DEFAULT false,
  conversion_value NUMERIC,
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segment_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own workspace client segments" ON public.client_segments FOR SELECT USING (true);
CREATE POLICY "Users can manage own workspace client segments" ON public.client_segments FOR ALL USING (true);

CREATE POLICY "Users can view client segment memberships" ON public.client_segment_memberships FOR SELECT USING (true);
CREATE POLICY "Users can manage client segment memberships" ON public.client_segment_memberships FOR ALL USING (true);

CREATE POLICY "Users can view drift monitors" ON public.drift_monitors FOR SELECT USING (true);
CREATE POLICY "Users can manage drift monitors" ON public.drift_monitors FOR ALL USING (true);

CREATE POLICY "Users can view drift events" ON public.drift_events FOR SELECT USING (true);
CREATE POLICY "Users can manage drift events" ON public.drift_events FOR ALL USING (true);

CREATE POLICY "Users can view shadow decisions" ON public.shadow_decisions FOR SELECT USING (true);
CREATE POLICY "Users can manage shadow decisions" ON public.shadow_decisions FOR ALL USING (true);

CREATE POLICY "Users can view deployment gates" ON public.deployment_gates FOR SELECT USING (true);
CREATE POLICY "Users can manage deployment gates" ON public.deployment_gates FOR ALL USING (true);

CREATE POLICY "Users can view ab experiments" ON public.ab_experiments FOR SELECT USING (true);
CREATE POLICY "Users can manage ab experiments" ON public.ab_experiments FOR ALL USING (true);

CREATE POLICY "Users can view ab assignments" ON public.ab_assignments FOR SELECT USING (true);
CREATE POLICY "Users can manage ab assignments" ON public.ab_assignments FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_segments_workspace ON public.client_segments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_drift_monitors_workspace ON public.drift_monitors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shadow_decisions_workspace ON public.shadow_decisions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_workspace ON public.ab_experiments(workspace_id);