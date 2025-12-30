-- ============================================
-- FERUNDA OS: Database Schema Migration
-- Multi-tenant, role-based, MIXTO system
-- ============================================

-- 1) User Profiles (minimal, public schema)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  display_name text,
  email text
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2) Artist Profiles (per workspace, references workspace_settings.id)
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  public_slug text,
  display_name text,
  bio text,
  styles text[] DEFAULT '{}',
  accepts text[] DEFAULT '{custom,flash,touchup,coverup,consult}',
  timezone text DEFAULT 'America/Chicago',
  google_calendar_connected boolean NOT NULL DEFAULT false,
  google_calendar_id text,
  avatar_url text,
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(w_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w_id AND m.user_id = auth.uid() AND m.is_active = true
  );
$$;

CREATE POLICY "Members can view artist profiles in their workspace"
ON public.artist_profiles FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Artists can update their own profile"
ON public.artist_profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Owners can insert artist profiles"
ON public.artist_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = artist_profiles.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
      AND m.is_active = true
  )
);

-- 3) Booking Requests (MIXTO system)
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  
  -- Source
  created_by text NOT NULL DEFAULT 'client' CHECK (created_by IN ('client', 'studio', 'concierge')),
  source_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  
  -- Client info
  client_name text,
  client_email text,
  client_phone text,
  
  -- Request details
  service_type text NOT NULL DEFAULT 'custom' CHECK (service_type IN ('custom', 'flash', 'coverup', 'touchup', 'consult')),
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  reference_images text[] DEFAULT '{}',
  estimated_hours numeric,
  fit_score numeric,
  
  -- MIXTO routing
  route text NOT NULL DEFAULT 'request' CHECK (route IN ('direct', 'request')),
  
  -- Status flow
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'brief_in_progress',
    'brief_ready',
    'assigned_artist',
    'pending_artist_acceptance',
    'artist_accepted',
    'artist_rejected',
    'artist_counter_proposed',
    'scheduling',
    'deposit_pending',
    'confirmed',
    'in_progress',
    'completed',
    'aftercare',
    'rebook',
    'cancelled'
  )),
  
  -- Assignment
  assigned_artist_id uuid REFERENCES public.artist_profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  assigned_by uuid,
  
  -- Preferences
  preferred_time_notes text,
  preferred_dates jsonb DEFAULT '[]'::jsonb,
  urgency text DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent'))
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view requests in their workspace"
ON public.booking_requests FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Studio staff can create requests"
ON public.booking_requests FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id)
  AND EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = booking_requests.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager', 'assistant')
      AND m.is_active = true
  )
);

CREATE POLICY "Studio staff can update requests"
ON public.booking_requests FOR UPDATE
USING (
  public.is_workspace_member(workspace_id)
  AND EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = booking_requests.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager', 'assistant')
      AND m.is_active = true
  )
);

-- 4) Appointments (calendar entries)
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  
  -- Artist assignment
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  
  -- Timing
  start_at timestamptz,
  end_at timestamptz,
  duration_minutes integer,
  
  -- State
  state text NOT NULL DEFAULT 'hold' CHECK (state IN ('hold', 'confirmed', 'completed', 'cancelled', 'no_show')),
  hold_expires_at timestamptz,
  
  -- External sync
  google_event_id text,
  external_calendar_synced boolean DEFAULT false,
  
  -- Payment
  deposit_status text NOT NULL DEFAULT 'unpaid' CHECK (deposit_status IN ('unpaid', 'pending', 'paid', 'refunded', 'waived')),
  deposit_amount numeric,
  deposit_paid_at timestamptz,
  
  -- Policies
  policies_version text,
  policies_accepted_at timestamptz,
  
  -- Notes
  artist_notes text,
  studio_notes text,
  client_notes text
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view appointments in their workspace"
ON public.appointments FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Staff can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Staff can update appointments"
ON public.appointments FOR UPDATE
USING (public.is_workspace_member(workspace_id));

-- 5) Change Proposals (studio suggests, artist approves)
CREATE TABLE IF NOT EXISTS public.change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Actors
  proposed_by_user_id uuid NOT NULL,
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  
  -- Proposal details
  type text NOT NULL CHECK (type IN ('reschedule', 'duration_change', 'service_change', 'info_request', 'cancellation')),
  proposed_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text,
  reason text,
  
  -- Status flow
  status text NOT NULL DEFAULT 'pending_artist' CHECK (status IN (
    'draft',
    'pending_artist',
    'accepted',
    'rejected',
    'counter_proposed',
    'pending_studio',
    'expired',
    'applied',
    'cancelled'
  )),
  
  -- Response
  responded_at timestamptz,
  response_message text,
  counter_proposal jsonb,
  
  -- Expiry
  expires_at timestamptz
);

ALTER TABLE public.change_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view change proposals in their workspace"
ON public.change_proposals FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Studio staff can create change proposals"
ON public.change_proposals FOR INSERT
WITH CHECK (
  public.is_workspace_member(workspace_id)
  AND EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = change_proposals.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'manager', 'assistant')
      AND m.is_active = true
  )
);

-- CRITICAL: Only the assigned artist can accept/reject change proposals
CREATE POLICY "Artist can update their own change proposals"
ON public.change_proposals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.artist_profiles ap
    WHERE ap.id = change_proposals.artist_profile_id
      AND ap.user_id = auth.uid()
  )
);

-- 6) Update workspace_settings with MIXTO configuration
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS mix_mode boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_direct_flash boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_direct_touchup boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_direct_consult boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_always_request boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS coverup_always_request boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hold_slot_minutes integer NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS late_threshold_minutes integer NOT NULL DEFAULT 15;

-- 7) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_requests_workspace ON public.booking_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_assigned_artist ON public.booking_requests(assigned_artist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_workspace ON public.appointments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_artist ON public.appointments(artist_profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON public.appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_change_proposals_workspace ON public.change_proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_change_proposals_status ON public.change_proposals(status);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_workspace ON public.artist_profiles(workspace_id);

-- 8) Triggers for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_booking_requests ON public.booking_requests;
CREATE TRIGGER set_updated_at_booking_requests
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_appointments ON public.appointments;
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_change_proposals ON public.change_proposals;
CREATE TRIGGER set_updated_at_change_proposals
  BEFORE UPDATE ON public.change_proposals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_artist_profiles ON public.artist_profiles;
CREATE TRIGGER set_updated_at_artist_profiles
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();