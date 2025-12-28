-- Create table for Luna's custom knowledge base
CREATE TABLE public.luna_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for email correspondence tracking
CREATE TABLE public.customer_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT,
  email_body TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound', -- 'inbound' or 'outbound'
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  tags TEXT[],
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for sample Q&A training pairs
CREATE TABLE public.luna_training_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  ideal_response TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for brand voice settings
CREATE TABLE public.luna_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.luna_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luna_training_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luna_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin-only access
CREATE POLICY "Admins can manage luna_knowledge" ON public.luna_knowledge
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage customer_emails" ON public.customer_emails
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage luna_training_pairs" ON public.luna_training_pairs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage luna_settings" ON public.luna_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_luna_knowledge_updated_at
  BEFORE UPDATE ON public.luna_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_luna_training_pairs_updated_at
  BEFORE UPDATE ON public.luna_training_pairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_luna_settings_updated_at
  BEFORE UPDATE ON public.luna_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Luna settings
INSERT INTO public.luna_settings (setting_key, setting_value, description) VALUES
  ('personality', 'friendly', 'Luna personality: friendly, professional, casual'),
  ('greeting', 'Hey! ✨ I''m Luna, here to help you learn about Fernando''s tattoo work and book a consultation. What would you like to know?', 'Default greeting message'),
  ('use_emojis', 'true', 'Whether Luna should use emojis in responses'),
  ('response_length', 'medium', 'Response length: short, medium, long');