-- City Configurations table for managing studio locations and guest spots
CREATE TABLE public.city_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL UNIQUE,
  city_type TEXT NOT NULL DEFAULT 'guest_spot' CHECK (city_type IN ('home_base', 'second_base', 'guest_spot')),
  address TEXT,
  studio_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  session_rate NUMERIC DEFAULT 2500.00,
  deposit_amount NUMERIC DEFAULT 500.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color_hex TEXT DEFAULT '#10b981',
  notes TEXT,
  travel_buffer_days INTEGER DEFAULT 1,
  min_sessions_per_trip INTEGER DEFAULT 3,
  max_sessions_per_day INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar Events table for synced events and AI scheduling
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  external_calendar TEXT CHECK (external_calendar IN ('google', 'apple', 'manual')),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'session' CHECK (event_type IN ('session', 'blocked', 'travel', 'personal', 'guest_spot_open')),
  city_id UUID REFERENCES public.city_configurations(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  is_synced BOOLEAN DEFAULT false,
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_external', 'from_external', 'both')),
  recurrence_rule TEXT,
  ai_suggested BOOLEAN DEFAULT false,
  ai_confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calendar Sync Tokens for OAuth credentials
CREATE TABLE public.calendar_sync_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_errors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- AI Scheduling Suggestions table
CREATE TABLE public.ai_scheduling_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  suggested_city_id UUID REFERENCES public.city_configurations(id) ON DELETE CASCADE,
  suggested_date DATE NOT NULL,
  suggested_time TIME,
  confidence_score NUMERIC DEFAULT 0.5,
  reasoning TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  conflicts TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add city_id to availability table
ALTER TABLE public.availability ADD COLUMN city_id UUID REFERENCES public.city_configurations(id) ON DELETE CASCADE;
ALTER TABLE public.availability ADD COLUMN slot_type TEXT DEFAULT 'available' CHECK (slot_type IN ('available', 'tentative', 'guest_spot', 'blocked'));
ALTER TABLE public.availability ADD COLUMN time_slots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.availability ADD COLUMN external_event_id TEXT;

-- Enable RLS on new tables
ALTER TABLE public.city_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scheduling_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for city_configurations
CREATE POLICY "Anyone can view active city configurations" ON public.city_configurations 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage city configurations" ON public.city_configurations 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for calendar_events
CREATE POLICY "Anyone can view session and guest_spot events" ON public.calendar_events 
  FOR SELECT USING (event_type IN ('session', 'guest_spot_open'));

CREATE POLICY "Admins can manage calendar events" ON public.calendar_events 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for calendar_sync_tokens (admin only)
CREATE POLICY "Admins can manage sync tokens" ON public.calendar_sync_tokens 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ai_scheduling_suggestions
CREATE POLICY "Admins can manage AI suggestions" ON public.ai_scheduling_suggestions 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add city_id to bookings for city-specific pipelines
ALTER TABLE public.bookings ADD COLUMN city_id UUID REFERENCES public.city_configurations(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN requested_city TEXT;

-- Create indexes for performance
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_city_id ON public.calendar_events(city_id);
CREATE INDEX idx_availability_city_id ON public.availability(city_id);
CREATE INDEX idx_bookings_city_id ON public.bookings(city_id);
CREATE INDEX idx_ai_suggestions_booking ON public.ai_scheduling_suggestions(booking_id);

-- Insert default city configurations
INSERT INTO public.city_configurations (city_name, city_type, timezone, session_rate, deposit_amount, color_hex, studio_name) VALUES
  ('Austin', 'home_base', 'America/Chicago', 2500.00, 500.00, '#10b981', 'Ferunda Studio Austin'),
  ('Houston', 'second_base', 'America/Chicago', 2500.00, 500.00, '#0ea5e9', 'Ferunda Studio Houston'),
  ('Los Angeles', 'second_base', 'America/Los_Angeles', 3000.00, 600.00, '#f59e0b', 'Ferunda Studio LA');

-- Trigger for updated_at
CREATE TRIGGER update_city_configurations_updated_at
  BEFORE UPDATE ON public.city_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_sync_tokens_updated_at
  BEFORE UPDATE ON public.calendar_sync_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();