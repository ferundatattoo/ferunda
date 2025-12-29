
-- =============================================
-- FERUNDA AI VIRTUAL ASSISTANT - DATABASE SCHEMA
-- =============================================

-- 1. TATTOO BRIEFS TABLE
-- Structured brief data extracted from AI conversations
CREATE TABLE public.tattoo_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  
  -- Core brief fields
  style TEXT,
  style_confidence NUMERIC CHECK (style_confidence >= 0 AND style_confidence <= 1),
  subject TEXT,
  mood_keywords TEXT[] DEFAULT '{}',
  
  -- Placement & sizing
  placement TEXT,
  placement_photo_url TEXT,
  size_estimate_inches_min NUMERIC,
  size_estimate_inches_max NUMERIC,
  color_type TEXT CHECK (color_type IN ('black_grey', 'color', 'mixed', 'undecided')),
  
  -- Session planning
  session_estimate_hours_min NUMERIC,
  session_estimate_hours_max NUMERIC,
  estimated_sessions_needed INTEGER DEFAULT 1,
  
  -- Constraints
  constraints JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "is_coverup": bool, "has_scarring": bool, "budget_min": num, "budget_max": num, "deadline": date, "first_tattoo": bool }
  
  -- Status tracking
  missing_info TEXT[] DEFAULT '{}',
  fit_score NUMERIC CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_reasoning TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'approved', 'in_progress', 'completed')),
  
  -- Reference images (from conversation)
  reference_image_urls TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tattoo_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage tattoo_briefs"
  ON public.tattoo_briefs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers view own briefs via bound session"
  ON public.tattoo_briefs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = tattoo_briefs.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  ));

-- 2. SLOT HOLDS TABLE
-- Temporary 15-minute reservations while client pays
CREATE TABLE public.slot_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  availability_id UUID REFERENCES public.availability(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  
  -- Hold details
  held_date DATE NOT NULL,
  held_time_slot JSONB, -- { "start": "10:00", "end": "14:00" }
  city_id UUID REFERENCES public.city_configurations(id) ON DELETE SET NULL,
  
  -- Timing
  held_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
  converted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage slot_holds"
  ON public.slot_holds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. PREP REMINDERS TABLE
-- Personalized preparation timeline
CREATE TABLE public.prep_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Reminder details
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days', '48_hours', '24_hours', 'morning_of', 'custom')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Content (AI-generated based on placement/duration)
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  placement_specific BOOLEAN DEFAULT false,
  
  -- Status
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'skipped')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prep_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prep_reminders"
  ON public.prep_reminders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers view own reminders via bound session"
  ON public.prep_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = prep_reminders.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  ));

-- 4. RISK SCORES TABLE
-- No-show prediction and risk assessment
CREATE TABLE public.risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Score (0-100, higher = more risk)
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Contributing factors
  factors JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "response_delay_hours": num, "reschedule_count": num, "deposit_delay_hours": num, "first_time_client": bool, "communication_score": num }
  
  -- Recommended actions
  recommended_actions TEXT[] DEFAULT '{}',
  
  -- Timestamps
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage risk_scores"
  ON public.risk_scores FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. CLIENT FIT SCORES TABLE
-- Style compatibility analysis
CREATE TABLE public.client_fit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  tattoo_brief_id UUID REFERENCES public.tattoo_briefs(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  
  -- Score (0-100, higher = better fit)
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  fit_level TEXT NOT NULL CHECK (fit_level IN ('excellent', 'good', 'needs_consult', 'not_ideal')),
  
  -- Analysis
  reasoning TEXT,
  style_match_details JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "matched_styles": [], "portfolio_examples": [], "concerns": [], "strengths": [] }
  
  -- Recommendation
  recommendation TEXT CHECK (recommendation IN ('proceed', 'consult_recommended', 'redirect')),
  redirect_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_fit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client_fit_scores"
  ON public.client_fit_scores FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. REFERRAL LINKS TABLE
-- Referral program tracking
CREATE TABLE public.referral_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  
  -- Referral code
  code TEXT NOT NULL UNIQUE,
  
  -- Tracking
  uses INTEGER DEFAULT 0,
  successful_bookings INTEGER DEFAULT 0,
  reward_earned NUMERIC DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral_links"
  ON public.referral_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active referral codes"
  ON public.referral_links FOR SELECT
  USING (is_active = true);

-- 7. UPDATE EXISTING TABLES

-- Add concierge mode tracking to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS concierge_mode TEXT DEFAULT 'explore' 
CHECK (concierge_mode IN ('explore', 'qualify', 'commit', 'prepare', 'aftercare', 'rebook'));

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS tattoo_brief_id UUID REFERENCES public.tattoo_briefs(id) ON DELETE SET NULL;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS confirmed_24h BOOLEAN DEFAULT false;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS confirmed_24h_at TIMESTAMP WITH TIME ZONE;

-- Add brief tracking to chat conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS tattoo_brief_id UUID REFERENCES public.tattoo_briefs(id) ON DELETE SET NULL;

ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS concierge_mode TEXT DEFAULT 'explore';

ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS client_name TEXT;

ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- 8. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tattoo_briefs_booking_id ON public.tattoo_briefs(booking_id);
CREATE INDEX IF NOT EXISTS idx_tattoo_briefs_conversation_id ON public.tattoo_briefs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tattoo_briefs_status ON public.tattoo_briefs(status);

CREATE INDEX IF NOT EXISTS idx_slot_holds_status ON public.slot_holds(status);
CREATE INDEX IF NOT EXISTS idx_slot_holds_expires_at ON public.slot_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_slot_holds_booking_id ON public.slot_holds(booking_id);

CREATE INDEX IF NOT EXISTS idx_prep_reminders_booking_id ON public.prep_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_prep_reminders_scheduled_for ON public.prep_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_prep_reminders_status ON public.prep_reminders(status);

CREATE INDEX IF NOT EXISTS idx_risk_scores_booking_id ON public.risk_scores(booking_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_risk_level ON public.risk_scores(risk_level);

CREATE INDEX IF NOT EXISTS idx_referral_links_code ON public.referral_links(code);
CREATE INDEX IF NOT EXISTS idx_referral_links_client_profile_id ON public.referral_links(client_profile_id);

-- 9. AUTO-UPDATE TIMESTAMPS TRIGGER
CREATE TRIGGER update_tattoo_briefs_updated_at
  BEFORE UPDATE ON public.tattoo_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_links_updated_at
  BEFORE UPDATE ON public.referral_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. FUNCTION TO EXPIRE SLOT HOLDS
CREATE OR REPLACE FUNCTION public.expire_slot_holds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.slot_holds
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
END;
$$;
