-- Create table for Agent decision feedback loop (simplified, no FK to profiles)

CREATE TABLE IF NOT EXISTS public.agent_decisions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID,
  decision_type TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  match_score NUMERIC,
  risk_score NUMERIC,
  client_satisfaction_signals TEXT,
  artist_review_status TEXT DEFAULT 'pending',
  artist_correction TEXT,
  artist_reviewed_at TIMESTAMP WITH TIME ZONE,
  artist_reviewer_id UUID,
  used_for_training BOOLEAN DEFAULT false,
  training_vector JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_decisions_log ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view
CREATE POLICY "Authenticated users can view agent decisions" 
ON public.agent_decisions_log FOR SELECT TO authenticated USING (true);

-- Allow inserts from service role
CREATE POLICY "Allow inserts to agent decisions" 
ON public.agent_decisions_log FOR INSERT WITH CHECK (true);

-- Allow updates from authenticated
CREATE POLICY "Authenticated users can update agent decisions" 
ON public.agent_decisions_log FOR UPDATE TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_agent_decisions_created ON public.agent_decisions_log(created_at DESC);