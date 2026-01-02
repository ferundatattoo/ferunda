-- Omnipresent Agent Learning System
-- Tracks all agent interactions for federated learning

CREATE TABLE IF NOT EXISTS public.agent_omnipresence_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_fingerprint TEXT,
  platform TEXT DEFAULT 'web', -- web, instagram, tiktok, whatsapp
  mood_detected TEXT, -- calm, excited, curious, urgent, hesitant
  intent_detected TEXT, -- booking, inquiry, browse, design, pricing
  confidence_score NUMERIC DEFAULT 0,
  context_json JSONB DEFAULT '{}',
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent memory for personalization
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint TEXT NOT NULL,
  memory_type TEXT NOT NULL, -- preference, interaction, insight, prediction
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  strength NUMERIC DEFAULT 1.0, -- how strong this memory is (decays over time)
  source_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Agent predictions (quantum-inspired predictions)
CREATE TABLE IF NOT EXISTS public.agent_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint TEXT,
  prediction_type TEXT NOT NULL, -- booking_likelihood, style_preference, price_sensitivity
  prediction_value JSONB NOT NULL,
  confidence NUMERIC DEFAULT 0,
  factors_json JSONB DEFAULT '{}',
  validated BOOLEAN DEFAULT false,
  actual_outcome JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for omnipresence sync
ALTER TABLE public.agent_omnipresence_state REPLICA IDENTITY FULL;
ALTER TABLE public.agent_memory REPLICA IDENTITY FULL;
ALTER TABLE public.agent_predictions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_omnipresence_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_memory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_predictions;

-- RLS policies (public for anonymous access)
ALTER TABLE public.agent_omnipresence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_predictions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for agent state (fingerprint-based)
CREATE POLICY "Anyone can manage their agent state" ON public.agent_omnipresence_state
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read agent memory by fingerprint" ON public.agent_memory
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert agent memory" ON public.agent_memory
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can manage predictions" ON public.agent_predictions
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_state_session ON public.agent_omnipresence_state(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_state_fingerprint ON public.agent_omnipresence_state(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_agent_memory_fingerprint ON public.agent_memory(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON public.agent_memory(memory_type, memory_key);