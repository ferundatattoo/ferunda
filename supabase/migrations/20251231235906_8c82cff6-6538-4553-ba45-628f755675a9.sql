-- Create artist_portfolio_embeddings table for CLIP vectors
CREATE TABLE public.artist_portfolio_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES studio_artists(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  embedding JSONB,
  style_tags TEXT[],
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sketch_approvals table for tracking sketch iterations
CREATE TABLE public.sketch_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspace_settings(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  sketch_url TEXT NOT NULL,
  reference_url TEXT,
  prompt_used TEXT,
  similarity_score NUMERIC,
  approved BOOLEAN,
  approved_by TEXT,
  feedback TEXT,
  iteration_number INTEGER DEFAULT 1,
  parent_sketch_id UUID REFERENCES sketch_approvals(id) ON DELETE SET NULL,
  ar_screenshot_url TEXT,
  body_part TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sketch_learning_feedback for federated learning
CREATE TABLE public.sketch_learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sketch_id UUID REFERENCES sketch_approvals(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  client_sentiment NUMERIC,
  artist_sentiment NUMERIC,
  conversion_outcome BOOLEAN,
  marketing_engagement JSONB,
  learned_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add AR sketch settings to workspace_settings
ALTER TABLE workspace_settings 
ADD COLUMN IF NOT EXISTS ar_sketch_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ar_auto_generate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ar_require_approval BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ar_similarity_threshold NUMERIC DEFAULT 0.80;

-- Enable RLS on new tables
ALTER TABLE public.artist_portfolio_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sketch_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sketch_learning_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for artist_portfolio_embeddings (using owner_user_id)
CREATE POLICY "Users can view portfolio embeddings for their workspace"
ON public.artist_portfolio_embeddings FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspace_settings WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage portfolio embeddings for their workspace"
ON public.artist_portfolio_embeddings FOR ALL
USING (
  workspace_id IN (
    SELECT id FROM workspace_settings WHERE owner_user_id = auth.uid()
  )
);

-- RLS policies for sketch_approvals
CREATE POLICY "Users can view sketch approvals for their workspace"
ON public.sketch_approvals FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspace_settings WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage sketch approvals for their workspace"
ON public.sketch_approvals FOR ALL
USING (
  workspace_id IN (
    SELECT id FROM workspace_settings WHERE owner_user_id = auth.uid()
  )
);

-- RLS policies for sketch_learning_feedback
CREATE POLICY "Users can view learning feedback for their sketches"
ON public.sketch_learning_feedback FOR SELECT
USING (
  sketch_id IN (
    SELECT id FROM sketch_approvals WHERE workspace_id IN (
      SELECT id FROM workspace_settings WHERE owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage learning feedback for their sketches"
ON public.sketch_learning_feedback FOR ALL
USING (
  sketch_id IN (
    SELECT id FROM sketch_approvals WHERE workspace_id IN (
      SELECT id FROM workspace_settings WHERE owner_user_id = auth.uid()
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_portfolio_embeddings_workspace ON public.artist_portfolio_embeddings(workspace_id);
CREATE INDEX idx_portfolio_embeddings_artist ON public.artist_portfolio_embeddings(artist_id);
CREATE INDEX idx_sketch_approvals_workspace ON public.sketch_approvals(workspace_id);
CREATE INDEX idx_sketch_approvals_booking ON public.sketch_approvals(booking_id);
CREATE INDEX idx_sketch_approvals_conversation ON public.sketch_approvals(conversation_id);
CREATE INDEX idx_sketch_learning_sketch ON public.sketch_learning_feedback(sketch_id);

-- Trigger for updated_at
CREATE TRIGGER update_artist_portfolio_embeddings_updated_at
BEFORE UPDATE ON public.artist_portfolio_embeddings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sketch_approvals_updated_at
BEFORE UPDATE ON public.sketch_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();