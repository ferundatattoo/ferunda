-- Shadow Evaluations table
CREATE TABLE IF NOT EXISTS public.shadow_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  conversation_id UUID REFERENCES public.chat_conversations(id),
  original_response TEXT,
  shadow_response TEXT,
  original_persona TEXT,
  shadow_persona TEXT,
  similarity_score NUMERIC(4,3),
  quality_delta NUMERIC(5,4),
  recommended_action TEXT DEFAULT 'keep_original',
  context_snapshot JSONB,
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Drift Alerts table
CREATE TABLE IF NOT EXISTS public.drift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  model_name TEXT,
  metric_name TEXT,
  drift_percentage NUMERIC(5,2),
  baseline_value NUMERIC(10,4),
  current_value NUMERIC(10,4),
  severity TEXT DEFAULT 'low',
  status TEXT DEFAULT 'active',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, metric_name)
);

-- Client Segments table (for ClientSegmentationStudio)
CREATE TABLE IF NOT EXISTS public.client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  segment_name TEXT NOT NULL,
  segment_key TEXT NOT NULL,
  description TEXT,
  rules_json JSONB DEFAULT '[]',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'users',
  member_count INTEGER DEFAULT 0,
  auto_refresh BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Client Segment Members
CREATE TABLE IF NOT EXISTS public.client_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES public.client_segments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  score NUMERIC(4,3) DEFAULT 1.0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(segment_id, client_id)
);

-- AI Safety Constraints table
CREATE TABLE IF NOT EXISTS public.ai_safety_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  constraint_name TEXT NOT NULL,
  constraint_type TEXT NOT NULL, -- 'hard' or 'soft'
  rule_expression TEXT,
  action_on_violation TEXT DEFAULT 'block', -- 'block', 'warn', 'log'
  is_active BOOLEAN DEFAULT TRUE,
  violation_count INTEGER DEFAULT 0,
  last_violated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shadow_evaluations_workspace ON public.shadow_evaluations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shadow_evaluations_conversation ON public.shadow_evaluations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_shadow_evaluations_recommended ON public.shadow_evaluations(recommended_action);
CREATE INDEX IF NOT EXISTS idx_drift_alerts_workspace ON public.drift_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_drift_alerts_status ON public.drift_alerts(status);
CREATE INDEX IF NOT EXISTS idx_client_segments_workspace ON public.client_segments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_segment_members_segment ON public.client_segment_members(segment_id);

-- Enable RLS
ALTER TABLE public.shadow_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_safety_constraints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shadow_evaluations
CREATE POLICY "shadow_evaluations_workspace_access" ON public.shadow_evaluations
  FOR ALL USING (true);

-- RLS Policies for drift_alerts
CREATE POLICY "drift_alerts_workspace_access" ON public.drift_alerts
  FOR ALL USING (true);

-- RLS Policies for client_segments  
CREATE POLICY "client_segments_workspace_access" ON public.client_segments
  FOR ALL USING (true);

-- RLS Policies for client_segment_members
CREATE POLICY "client_segment_members_access" ON public.client_segment_members
  FOR ALL USING (true);

-- RLS Policies for ai_safety_constraints
CREATE POLICY "ai_safety_constraints_access" ON public.ai_safety_constraints
  FOR ALL USING (true);