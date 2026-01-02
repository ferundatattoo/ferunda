-- Phase 8: AI Explainability & Feedback Tables

-- Decision explanations table (for AI explainability)
CREATE TABLE IF NOT EXISTS public.decision_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  session_id UUID,
  decision_type TEXT NOT NULL DEFAULT 'persona_selection',
  persona_chosen TEXT,
  top_signals JSONB DEFAULT '[]',
  confidence DECIMAL(5,4) DEFAULT 0,
  fallback_used BOOLEAN DEFAULT false,
  fallback_reason TEXT,
  processing_time_ms INTEGER,
  model_version TEXT DEFAULT 'v1',
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Human feedback for AI learning
CREATE TABLE IF NOT EXISTS public.human_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  decision_id UUID REFERENCES public.decision_explanations(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  original_persona TEXT,
  suggested_persona TEXT,
  note TEXT,
  user_id UUID,
  applied_to_training BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI model performance tracking
CREATE TABLE IF NOT EXISTS public.ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL(10,4),
  sample_size INTEGER,
  time_window TEXT,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Safety constraint violations log
CREATE TABLE IF NOT EXISTS public.safety_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_type TEXT NOT NULL,
  constraint_name TEXT,
  violation_description TEXT,
  severity TEXT DEFAULT 'warning',
  action_taken TEXT,
  conversation_id UUID,
  session_id UUID,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decision_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view workspace decision explanations"
  ON public.decision_explanations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert decision explanations"
  ON public.decision_explanations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view workspace human feedback"
  ON public.human_feedback FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can submit human feedback"
  ON public.human_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view workspace ai model metrics"
  ON public.ai_model_metrics FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage workspace ai model metrics"
  ON public.ai_model_metrics FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view workspace safety violations"
  ON public.safety_violations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Anyone can log safety violations"
  ON public.safety_violations FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decision_explanations_conversation ON public.decision_explanations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_decision_explanations_workspace ON public.decision_explanations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_human_feedback_decision ON public.human_feedback(decision_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_model ON public.ai_model_metrics(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_safety_violations_workspace ON public.safety_violations(workspace_id);