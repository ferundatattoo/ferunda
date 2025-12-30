-- =============================================
-- PHASE 1: FACTS VAULT + GUEST SPOTS (Fixed RLS)
-- =============================================

-- 1.1 Artist Public Facts (Single Source of Truth)
CREATE TABLE public.artist_public_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  public_handle TEXT,
  
  brand_positioning JSONB DEFAULT '{"one_liner": {"text": null, "verified": false}, "long_bio": {"text": null, "verified": false}}'::jsonb,
  specialties JSONB DEFAULT '[]'::jsonb,
  not_offered_styles JSONB DEFAULT '[]'::jsonb,
  not_offered_work_types JSONB DEFAULT '[]'::jsonb,
  booking_model JSONB DEFAULT '{"session_model": "day_session", "one_client_per_day": true, "arrival_window": {"start": null, "end": null, "verified": false}, "notes": {"text": null, "verified": false}}'::jsonb,
  base_location JSONB DEFAULT '{"city": null, "country": null, "verified": false}'::jsonb,
  bookable_cities JSONB DEFAULT '[]'::jsonb,
  location_notes JSONB DEFAULT '{"text": null, "verified": false}'::jsonb,
  portfolio_config JSONB DEFAULT '{"yes_exemplars": [], "no_exemplars": [], "verified": false}'::jsonb,
  public_links JSONB DEFAULT '{"website": null, "booking_page": null, "instagram": null}'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_artist_facts UNIQUE (artist_id)
);

-- 1.2 Guest Spot Events
CREATE TABLE public.guest_spot_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'announced' CHECK (status IN ('rumored', 'announced', 'booking_open', 'sold_out', 'completed', 'cancelled')),
  booking_status TEXT DEFAULT 'not_open' CHECK (booking_status IN ('not_open', 'open', 'waitlist_only', 'closed')),
  max_slots INTEGER,
  booked_slots INTEGER DEFAULT 0,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('official', 'social', 'third_party')),
  notes TEXT,
  internal_notes TEXT,
  announced_at TIMESTAMPTZ,
  booking_opens_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Voice Profiles
CREATE TABLE public.voice_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  tone TEXT[] DEFAULT ARRAY['premium', 'warm', 'direct', 'calm'],
  do_rules JSONB DEFAULT '[]'::jsonb,
  dont_rules JSONB DEFAULT '[]'::jsonb,
  signature_phrases JSONB DEFAULT '{"not_a_fit": null, "review": null, "greeting": null, "closing": null}'::jsonb,
  max_questions_per_message INTEGER DEFAULT 1,
  default_language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_artist_voice UNIQUE (artist_id)
);

-- 1.4 Guest Spot Subscriptions
CREATE TABLE public.guest_spot_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  client_name TEXT,
  phone TEXT,
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  country TEXT,
  city TEXT,
  subscription_type TEXT NOT NULL DEFAULT 'notify_only' CHECK (subscription_type IN ('notify_only', 'fast_track')),
  pre_gate_responses JSONB,
  tattoo_brief_id UUID REFERENCES public.tattoo_briefs(id),
  placement TEXT,
  size TEXT,
  style_preference TEXT,
  confirmation_token UUID DEFAULT gen_random_uuid(),
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'active', 'paused', 'unsubscribed', 'converted')),
  notifications_sent INTEGER DEFAULT 0,
  last_notified_at TIMESTAMPTZ,
  converted_booking_id UUID REFERENCES public.bookings(id),
  source TEXT DEFAULT 'concierge',
  conversation_id UUID REFERENCES public.chat_conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_subscription UNIQUE (email, artist_id, country, city)
);

-- 1.5 Update chat_conversations for state tracking
ALTER TABLE public.chat_conversations 
  ADD COLUMN IF NOT EXISTS journey_goal TEXT,
  ADD COLUMN IF NOT EXISTS location_preference TEXT,
  ADD COLUMN IF NOT EXISTS facts_confidence JSONB DEFAULT '{"pricing": "unknown", "guest_spots": "unknown", "base_location": "unknown"}'::jsonb,
  ADD COLUMN IF NOT EXISTS collected_fields JSONB DEFAULT '{"email": false, "placement": false, "size": false, "color_preference": null, "coverup": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS has_asked_about_guest_spots BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS selected_artist_id UUID;

-- 1.6 Update artist_pricing_models
ALTER TABLE public.artist_pricing_models
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rate_type TEXT DEFAULT 'quote_only',
  ADD COLUMN IF NOT EXISTS safe_messaging_blurb TEXT DEFAULT 'Pricing is confirmed after we review your idea. You will see the exact deposit before paying.';

-- Enable RLS
ALTER TABLE public.artist_public_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_spot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_spot_subscriptions ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Public read, authenticated users can write (admin check in app layer)
CREATE POLICY "Public can read artist facts" ON public.artist_public_facts FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage artist facts" ON public.artist_public_facts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can read announced guest spots" ON public.guest_spot_events FOR SELECT USING (status != 'rumored');
CREATE POLICY "Authenticated can manage guest spots" ON public.guest_spot_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can manage voice profiles" ON public.voice_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can read subscriptions" ON public.guest_spot_subscriptions FOR SELECT USING (true);
CREATE POLICY "Public can insert subscriptions" ON public.guest_spot_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can manage subscriptions" ON public.guest_spot_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_guest_spots_artist ON public.guest_spot_events(artist_id);
CREATE INDEX idx_guest_spots_country ON public.guest_spot_events(country);
CREATE INDEX idx_guest_spots_status ON public.guest_spot_events(status);
CREATE INDEX idx_guest_spots_dates ON public.guest_spot_events(date_range_start, date_range_end);
CREATE INDEX idx_subscriptions_artist ON public.guest_spot_subscriptions(artist_id);
CREATE INDEX idx_subscriptions_email ON public.guest_spot_subscriptions(email);
CREATE INDEX idx_subscriptions_geo ON public.guest_spot_subscriptions(country, city);

-- Triggers
CREATE TRIGGER update_artist_public_facts_updated_at BEFORE UPDATE ON public.artist_public_facts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_spot_events_updated_at BEFORE UPDATE ON public.guest_spot_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_voice_profiles_updated_at BEFORE UPDATE ON public.voice_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_spot_subscriptions_updated_at BEFORE UPDATE ON public.guest_spot_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();