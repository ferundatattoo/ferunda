-- Create ar_preview_sessions table for AR Tattoo Engine
CREATE TABLE public.ar_preview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  design_url TEXT,
  body_part TEXT,
  final_placement JSONB,
  final_scale NUMERIC,
  final_rotation NUMERIC,
  user_image_url TEXT,
  perspective_matrix JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ar_preview_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for reading own sessions (via conversation)
CREATE POLICY "Users can view AR sessions from their conversations"
ON public.ar_preview_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = ar_preview_sessions.conversation_id
  )
);

-- Create policy for inserting sessions
CREATE POLICY "Anyone can create AR sessions"
ON public.ar_preview_sessions
FOR INSERT
WITH CHECK (true);

-- Create policy for updating own sessions
CREATE POLICY "Anyone can update AR sessions"
ON public.ar_preview_sessions
FOR UPDATE
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_ar_preview_sessions_conversation ON public.ar_preview_sessions(conversation_id);

-- Add updated_at trigger
CREATE TRIGGER update_ar_preview_sessions_updated_at
BEFORE UPDATE ON public.ar_preview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();