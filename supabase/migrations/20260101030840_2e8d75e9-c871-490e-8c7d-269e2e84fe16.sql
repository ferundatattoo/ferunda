-- Create agent_self_reflections table for Self-Learning Agent
CREATE TABLE public.agent_self_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  conversation_id UUID,
  reflection_type TEXT NOT NULL DEFAULT 'post_conversation',
  original_response TEXT,
  improved_response TEXT,
  learning_insights JSONB DEFAULT '{}',
  confidence_delta NUMERIC DEFAULT 0,
  emotion_detected JSONB DEFAULT '{}',
  processing_time_ms INTEGER,
  parallel_factor INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_reflections_workspace ON public.agent_self_reflections(workspace_id);
CREATE INDEX idx_reflections_created ON public.agent_self_reflections(created_at DESC);
CREATE INDEX idx_reflections_type ON public.agent_self_reflections(reflection_type);

-- Enable RLS
ALTER TABLE public.agent_self_reflections ENABLE ROW LEVEL SECURITY;

-- Policy for workspace members to view reflections
CREATE POLICY "Workspace members can view reflections"
  ON public.agent_self_reflections FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy for system/edge functions to insert reflections
CREATE POLICY "System can insert reflections"
  ON public.agent_self_reflections FOR INSERT
  WITH CHECK (true);

-- Policy for system to update reflections
CREATE POLICY "System can update reflections"
  ON public.agent_self_reflections FOR UPDATE
  USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_self_reflections;