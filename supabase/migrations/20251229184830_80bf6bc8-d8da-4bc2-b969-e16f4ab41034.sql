-- Create Studio Concierge knowledge base table (similar to luna_knowledge)
CREATE TABLE public.concierge_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Studio Concierge training pairs table (similar to luna_training_pairs)
CREATE TABLE public.concierge_training_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  ideal_response TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Studio Concierge settings table (similar to luna_settings)
CREATE TABLE public.concierge_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concierge_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_training_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (same pattern as luna tables)
CREATE POLICY "Only admins can manage concierge knowledge"
ON public.concierge_knowledge
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage concierge training pairs"
ON public.concierge_training_pairs
FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage concierge settings"
ON public.concierge_settings
FOR ALL
USING (auth.role() = 'authenticated');

-- Service role can read for edge functions (like Luna)
CREATE POLICY "Service role can read concierge knowledge"
ON public.concierge_knowledge
FOR SELECT
USING (true);

CREATE POLICY "Service role can read concierge training pairs"
ON public.concierge_training_pairs
FOR SELECT
USING (true);

CREATE POLICY "Service role can read concierge settings"
ON public.concierge_settings
FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.concierge_settings (setting_key, setting_value, description) VALUES
('persona_name', 'Studio Concierge', 'The name the AI uses to identify itself'),
('greeting_style', 'warm', 'Greeting style: warm, professional, casual'),
('response_length', 'concise', 'Response length preference: concise, detailed, balanced'),
('booking_urgency', 'medium', 'How urgently to push towards booking: low, medium, high'),
('creative_freedom', 'medium', 'How much creative suggestions to offer: low, medium, high');

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_concierge_knowledge_updated_at
BEFORE UPDATE ON public.concierge_knowledge
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_concierge_training_pairs_updated_at
BEFORE UPDATE ON public.concierge_training_pairs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_concierge_settings_updated_at
BEFORE UPDATE ON public.concierge_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();