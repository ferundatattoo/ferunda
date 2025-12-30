-- Create studio_policies table
CREATE TABLE IF NOT EXISTS public.studio_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.studio_artists(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_text TEXT,
  full_policy_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create policy_acceptances table
CREATE TABLE IF NOT EXISTS public.policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL,
  policy_version_id UUID REFERENCES public.studio_policies(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  acceptance_method TEXT DEFAULT 'checkbox'
);

-- Create workspace_settings table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name TEXT NOT NULL DEFAULT 'Ferunda Studio',
  brand_tone TEXT NOT NULL DEFAULT 'luxury',
  primary_timezone TEXT DEFAULT 'America/Chicago',
  locale TEXT NOT NULL DEFAULT 'en-US',
  currency TEXT NOT NULL DEFAULT 'USD',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add policy_acceptance_id to bookings if not exists
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS policy_acceptance_id UUID REFERENCES public.policy_acceptances(id);

-- Add calendar event enhancements
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'confirmed';
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS extended_properties JSONB DEFAULT '{}'::jsonb;

-- Add slot_holds enhancements  
ALTER TABLE public.slot_holds ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
ALTER TABLE public.slot_holds ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Enable RLS
ALTER TABLE public.studio_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active policies" ON public.studio_policies FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage policies" ON public.studio_policies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can view acceptances" ON public.policy_acceptances FOR SELECT USING (true);
CREATE POLICY "Anyone can create acceptances" ON public.policy_acceptances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view workspace settings" ON public.workspace_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage workspace settings" ON public.workspace_settings FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_booking ON public.policy_acceptances(booking_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_email ON public.policy_acceptances(client_email);
CREATE INDEX IF NOT EXISTS idx_calendar_events_state ON public.calendar_events(state);
CREATE INDEX IF NOT EXISTS idx_slot_holds_gcal ON public.slot_holds(google_calendar_event_id);