-- ============================================
-- MULTI-ARTIST STUDIO SUPPORT
-- ============================================

-- 1. Studio Artists table
CREATE TABLE IF NOT EXISTS public.studio_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT, -- How they appear to clients
  email TEXT,
  phone TEXT,
  bio TEXT,
  profile_image_url TEXT,
  instagram_handle TEXT,
  
  -- Styles they specialize in
  specialty_styles TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Main artist (e.g., Ferunda)
  is_guest_artist BOOLEAN DEFAULT false,
  
  -- Scheduling preferences
  default_session_hours NUMERIC DEFAULT 6,
  max_sessions_per_day INTEGER DEFAULT 2,
  buffer_minutes INTEGER DEFAULT 30,
  
  -- Metadata
  portfolio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Artist Pricing Models table
CREATE TABLE IF NOT EXISTS public.artist_pricing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  city_id UUID REFERENCES public.city_configurations(id) ON DELETE SET NULL,
  
  -- Pricing type
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('hourly', 'day_session', 'by_piece', 'minimum')),
  
  -- Rates (can be city-specific)
  rate_amount NUMERIC NOT NULL,
  rate_currency TEXT DEFAULT 'USD',
  
  -- For by_piece: min/max range
  min_price NUMERIC,
  max_price NUMERIC,
  
  -- For minimums
  minimum_amount NUMERIC,
  minimum_applies_to TEXT, -- 'small_pieces', 'flash', 'all'
  
  -- Deposit configuration
  deposit_type TEXT DEFAULT 'fixed' CHECK (deposit_type IN ('fixed', 'percentage')),
  deposit_amount NUMERIC DEFAULT 500,
  deposit_percentage NUMERIC,
  
  -- Applicability
  is_default BOOLEAN DEFAULT false,
  applies_to_styles TEXT[] DEFAULT '{}',
  notes TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Concierge Message Templates
CREATE TABLE IF NOT EXISTS public.concierge_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  template_key TEXT UNIQUE NOT NULL, -- e.g., 'greeting', 'booking_confirmed', 'deposit_request'
  template_name TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'greeting', 'booking', 'payment', 'aftercare', 'follow_up'
  
  -- The message content (supports {{variables}})
  message_content TEXT NOT NULL,
  
  -- When to use this template
  trigger_mode TEXT, -- 'explore', 'qualify', 'commit', etc.
  trigger_event TEXT, -- 'conversation_start', 'booking_created', 'deposit_paid'
  
  -- Control
  is_required BOOLEAN DEFAULT false, -- Must use this exact message
  allow_ai_variation BOOLEAN DEFAULT true, -- AI can adjust tone
  
  -- Variables available in this template
  available_variables TEXT[] DEFAULT '{}', -- ['client_name', 'artist_name', 'deposit_amount']
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Conversation Flow Configuration
CREATE TABLE IF NOT EXISTS public.concierge_flow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flow step identification
  step_order INTEGER NOT NULL,
  step_key TEXT UNIQUE NOT NULL, -- e.g., 'ask_style', 'ask_placement', 'ask_size'
  step_name TEXT NOT NULL,
  
  -- Which mode this belongs to
  concierge_mode TEXT NOT NULL, -- 'explore', 'qualify', 'commit'
  
  -- Question to ask (can be overridden by templates)
  default_question TEXT NOT NULL,
  
  -- What info this collects
  collects_field TEXT, -- Maps to tattoo_brief field: 'style', 'placement', 'size', etc.
  
  -- Flow control
  is_required BOOLEAN DEFAULT true,
  skip_if_known BOOLEAN DEFAULT true, -- Skip if already collected
  depends_on TEXT[], -- Must complete these steps first
  
  -- Validation
  valid_responses TEXT[], -- If set, response must match one of these
  validation_regex TEXT, -- For custom validation
  
  -- AI behavior
  follow_up_on_unclear BOOLEAN DEFAULT true,
  max_follow_ups INTEGER DEFAULT 2,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Link artists to availability
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES public.studio_artists(id);

-- 6. Link bookings to artists
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES public.studio_artists(id);

-- 7. Link tattoo briefs to artists
ALTER TABLE public.tattoo_briefs ADD COLUMN IF NOT EXISTS assigned_artist_id UUID REFERENCES public.studio_artists(id);

-- Enable RLS
ALTER TABLE public.studio_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_pricing_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_flow_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studio_artists
CREATE POLICY "Admins can manage studio artists"
  ON public.studio_artists FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active artists"
  ON public.studio_artists FOR SELECT
  USING (is_active = true);

-- RLS Policies for artist_pricing_models
CREATE POLICY "Admins can manage pricing models"
  ON public.artist_pricing_models FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active pricing"
  ON public.artist_pricing_models FOR SELECT
  USING (is_active = true);

-- RLS Policies for concierge_message_templates
CREATE POLICY "Admins can manage message templates"
  ON public.concierge_message_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read templates"
  ON public.concierge_message_templates FOR SELECT
  USING (true);

-- RLS Policies for concierge_flow_config
CREATE POLICY "Admins can manage flow config"
  ON public.concierge_flow_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read flow config"
  ON public.concierge_flow_config FOR SELECT
  USING (true);

-- Seed the primary artist (Ferunda)
INSERT INTO public.studio_artists (name, display_name, is_primary, is_active, specialty_styles, bio)
VALUES ('Ferunda', 'Ferunda', true, true, 
  ARRAY['fine-line', 'botanical', 'illustrative', 'floral', 'geometric'],
  'Premium traveling tattoo artist known for fine-line botanical and illustrative work.')
ON CONFLICT DO NOTHING;

-- Seed default message templates
INSERT INTO public.concierge_message_templates (template_key, template_name, category, message_content, trigger_mode, trigger_event, available_variables) VALUES
('greeting', 'Welcome Greeting', 'greeting', 
 'Hey there! 👋 I''m here to help you plan your tattoo with {{artist_name}}. What kind of piece are you dreaming about?', 
 'explore', 'conversation_start', ARRAY['artist_name', 'client_name']),
 
('style_question', 'Ask About Style', 'intake', 
 'What style are you drawn to? (Fine-line, botanical, geometric, illustrative...)', 
 'explore', NULL, ARRAY['client_name']),
 
('placement_question', 'Ask About Placement', 'intake', 
 'Where on your body are you thinking for this piece?', 
 'qualify', NULL, ARRAY['client_name']),
 
('size_question', 'Ask About Size', 'intake', 
 'How big are you envisioning this? (Palm-sized, forearm length, something larger?)', 
 'qualify', NULL, ARRAY['client_name', 'placement']),
 
('deposit_request', 'Deposit Request', 'payment', 
 'Perfect! To lock in your spot, there''s a {{deposit_amount}} deposit. This goes toward your final session. Ready to secure your date?', 
 'commit', 'slot_held', ARRAY['deposit_amount', 'scheduled_date', 'artist_name']),
 
('booking_confirmed', 'Booking Confirmation', 'booking', 
 'You''re all set for {{scheduled_date}}! 🎉 I''ll send you prep reminders as the day approaches. Any questions before then?', 
 'prepare', 'deposit_paid', ARRAY['scheduled_date', 'scheduled_time', 'artist_name', 'city_name'])
ON CONFLICT (template_key) DO NOTHING;

-- Seed default flow configuration
INSERT INTO public.concierge_flow_config (step_order, step_key, step_name, concierge_mode, default_question, collects_field, is_required) VALUES
(1, 'ask_idea', 'Initial Concept', 'explore', 'What kind of tattoo are you dreaming about?', 'subject', true),
(2, 'ask_meaning', 'Personal Meaning', 'explore', 'Is there a story or meaning behind this idea?', 'mood_keywords', false),
(3, 'ask_style', 'Style Preference', 'explore', 'What style are you drawn to?', 'style', true),
(4, 'ask_placement', 'Body Placement', 'qualify', 'Where on your body are you thinking?', 'placement', true),
(5, 'ask_size', 'Size Estimate', 'qualify', 'How big are you envisioning this?', 'size_estimate', true),
(6, 'ask_color', 'Color Preference', 'qualify', 'Black and grey, or color?', 'color_type', true),
(7, 'ask_timeline', 'Timeline/Deadline', 'qualify', 'Do you have a specific date in mind, or are you flexible?', 'deadline', false),
(8, 'ask_budget', 'Budget Range', 'qualify', 'What''s your budget range for this piece?', 'budget', false),
(9, 'ask_references', 'Reference Images', 'qualify', 'Do you have any reference images or inspiration to share?', 'references', false),
(10, 'confirm_brief', 'Confirm Brief', 'qualify', 'Here''s what I have so far. Does this look right?', 'confirmation', true)
ON CONFLICT (step_key) DO NOTHING;

-- Update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_studio_artists_updated_at
  BEFORE UPDATE ON public.studio_artists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_pricing_updated_at
  BEFORE UPDATE ON public.artist_pricing_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.concierge_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flow_config_updated_at
  BEFORE UPDATE ON public.concierge_flow_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();