-- ==============================================
-- AI CRM Phase 1: Enhanced Client Profiles & AI Features
-- ==============================================

-- 1. CLIENT PROFILES (Enhanced with AI Persona Builder data)
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  email_hash TEXT NOT NULL,
  full_name TEXT,
  phone_encrypted TEXT,
  
  -- Medical & Preferences
  allergies TEXT[],
  skin_type TEXT, -- 'normal', 'sensitive', 'oily', 'dry'
  medical_notes TEXT,
  preferred_styles TEXT[], -- 'fine_line', 'geometric', 'realism', etc.
  
  -- AI Persona Builder Data
  ai_persona JSONB DEFAULT '{}'::jsonb, -- NLP-derived personality traits
  predicted_preferences JSONB DEFAULT '{}'::jsonb, -- AI predictions
  communication_style TEXT, -- 'formal', 'casual', 'detailed', 'brief'
  sentiment_history JSONB DEFAULT '[]'::jsonb, -- Chat sentiment over time
  
  -- Engagement Metrics
  lead_score INTEGER DEFAULT 0,
  lifetime_value NUMERIC DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  last_session_date DATE,
  next_recommended_date DATE,
  
  -- Social Integration (with consent)
  instagram_handle TEXT,
  social_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage client profiles"
  ON public.client_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. SESSION HISTORY (Tattoo Timeline)
CREATE TABLE IF NOT EXISTS public.session_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  
  session_date DATE NOT NULL,
  session_duration_minutes INTEGER,
  
  -- Design Details
  design_description TEXT,
  design_style TEXT,
  placement TEXT,
  size_inches NUMERIC,
  colors_used TEXT[],
  
  -- Pricing
  session_rate NUMERIC,
  deposit_paid NUMERIC,
  total_paid NUMERIC,
  tip_amount NUMERIC,
  
  -- AI Analysis
  complexity_score NUMERIC, -- 1-10 from computer vision
  predicted_healing_days INTEGER,
  
  -- Photos
  before_photos TEXT[],
  after_photos TEXT[],
  reference_images TEXT[],
  
  -- Notes
  artist_notes TEXT,
  client_feedback TEXT,
  satisfaction_score INTEGER, -- 1-5
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage session history"
  ON public.session_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. HEALING TRACKER (AI-Powered Aftercare)
CREATE TABLE IF NOT EXISTS public.healing_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.session_history(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  
  day_number INTEGER NOT NULL, -- Days since session
  photo_url TEXT,
  
  -- AI Analysis Results
  ai_health_score NUMERIC, -- 0-100
  ai_healing_stage TEXT, -- 'initial', 'peeling', 'settling', 'healed'
  ai_concerns TEXT[], -- 'redness', 'swelling', 'infection_risk', etc.
  ai_recommendations TEXT,
  ai_confidence NUMERIC, -- AI confidence in assessment
  
  -- Alerts
  requires_attention BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  alert_acknowledged_at TIMESTAMPTZ,
  
  -- Manual Notes
  client_notes TEXT,
  artist_response TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.healing_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage healing progress"
  ON public.healing_progress FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. AI SESSION PREDICTIONS (Slot Optimizer Data)
CREATE TABLE IF NOT EXISTS public.ai_session_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Reference Image Analysis
  reference_image_url TEXT,
  
  -- AI Predictions
  predicted_duration_minutes INTEGER,
  predicted_complexity NUMERIC, -- 1-10
  predicted_price_range JSONB, -- {min: x, max: y}
  predicted_sessions_needed INTEGER DEFAULT 1,
  
  -- Confidence & Reasoning
  confidence_score NUMERIC,
  analysis_details JSONB, -- Style detected, elements, colors
  
  -- Validation
  actual_duration_minutes INTEGER,
  prediction_accuracy NUMERIC, -- For ML training
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_session_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage predictions"
  ON public.ai_session_predictions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. WAITLIST (For AI Slot Optimizer)
CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  
  -- Preferences
  preferred_cities TEXT[],
  preferred_dates JSONB, -- [{start: date, end: date}]
  flexibility_days INTEGER DEFAULT 3,
  
  -- Requirements
  tattoo_description TEXT,
  size_preference TEXT,
  style_preference TEXT,
  max_budget NUMERIC,
  
  -- AI Matching
  match_score NUMERIC, -- How well they match available slots
  last_offer_sent_at TIMESTAMPTZ,
  offers_sent_count INTEGER DEFAULT 0,
  discount_eligible BOOLEAN DEFAULT true,
  
  -- Status
  status TEXT DEFAULT 'waiting', -- 'waiting', 'offered', 'booked', 'expired'
  converted_booking_id UUID REFERENCES public.bookings(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days')
);

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage waitlist"
  ON public.booking_waitlist FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Validated public can join waitlist"
  ON public.booking_waitlist FOR INSERT
  WITH CHECK (
    client_email IS NOT NULL AND 
    length(trim(client_email)) >= 5 AND
    tattoo_description IS NOT NULL
  );

-- 6. AI DESIGN SUGGESTIONS (Co-Design Studio)
CREATE TABLE IF NOT EXISTS public.ai_design_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id),
  
  -- Input
  user_prompt TEXT NOT NULL,
  reference_images TEXT[],
  style_preferences TEXT[],
  
  -- AI Output
  generated_image_url TEXT,
  variation_urls TEXT[],
  ai_description TEXT,
  suggested_placement TEXT,
  estimated_size TEXT,
  estimated_duration_minutes INTEGER,
  
  -- Client Reaction (Sentiment Analysis)
  client_reaction TEXT, -- 'loved', 'liked', 'neutral', 'disliked'
  reaction_sentiment_score NUMERIC,
  
  -- Iteration
  iteration_number INTEGER DEFAULT 1,
  parent_suggestion_id UUID REFERENCES public.ai_design_suggestions(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_design_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage design suggestions"
  ON public.ai_design_suggestions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. MULTI-CHANNEL MESSAGES (WhatsApp, Instagram, Web)
CREATE TABLE IF NOT EXISTS public.omnichannel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Channel Info
  channel TEXT NOT NULL, -- 'web_chat', 'whatsapp', 'instagram', 'email'
  channel_message_id TEXT, -- External message ID
  channel_conversation_id TEXT, -- External conversation ID
  
  -- Link to Internal
  conversation_id UUID REFERENCES public.chat_conversations(id),
  booking_id UUID REFERENCES public.bookings(id),
  client_profile_id UUID REFERENCES public.client_profiles(id),
  
  -- Message Content
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'voice', 'document'
  content TEXT,
  media_urls TEXT[],
  
  -- AI Processing
  ai_processed BOOLEAN DEFAULT false,
  ai_response_generated BOOLEAN DEFAULT false,
  ai_intent_detected TEXT, -- 'booking', 'inquiry', 'design_request', etc.
  ai_entities_extracted JSONB, -- {date: x, style: y, etc.}
  ai_sentiment TEXT,
  
  -- Status
  status TEXT DEFAULT 'received', -- 'received', 'processing', 'responded', 'escalated'
  escalated_to_human BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.omnichannel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage omnichannel messages"
  ON public.omnichannel_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. AI LEAD SCORING & NURTURE SEQUENCES
CREATE TABLE IF NOT EXISTS public.lead_nurture_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_profile_id UUID REFERENCES public.client_profiles(id),
  
  -- Sequence Info
  sequence_type TEXT NOT NULL, -- 'new_lead', 'post_inquiry', 're_engagement'
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  
  -- Timing
  next_action_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ,
  
  -- AI Personalization
  ai_generated_content JSONB, -- Personalized messages per step
  personalization_factors JSONB, -- Style preferences, past interactions
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'converted'
  converted_booking_id UUID REFERENCES public.bookings(id),
  unsubscribed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_nurture_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage nurture sequences"
  ON public.lead_nurture_sequences FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_client_profiles_email ON public.client_profiles(email);
CREATE INDEX IF NOT EXISTS idx_client_profiles_email_hash ON public.client_profiles(email_hash);
CREATE INDEX IF NOT EXISTS idx_session_history_client ON public.session_history(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_healing_progress_session ON public.healing_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.booking_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_omnichannel_channel ON public.omnichannel_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nurture_next_action ON public.lead_nurture_sequences(next_action_at) WHERE status = 'active';

-- TRIGGERS
CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_history_updated_at
  BEFORE UPDATE ON public.session_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();