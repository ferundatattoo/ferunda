-- Create table to capture concierge referral / handoff requests (e.g., "search external")
CREATE TABLE IF NOT EXISTS public.concierge_referral_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  conversation_id UUID NULL,
  client_name TEXT NULL,
  client_email TEXT NOT NULL,
  preferred_city TEXT NULL,
  request_type TEXT NOT NULL DEFAULT 'external_referral',
  request_summary TEXT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS idx_concierge_referral_requests_created_at ON public.concierge_referral_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_referral_requests_status ON public.concierge_referral_requests (status);
CREATE INDEX IF NOT EXISTS idx_concierge_referral_requests_email ON public.concierge_referral_requests (client_email);

-- RLS
ALTER TABLE public.concierge_referral_requests ENABLE ROW LEVEL SECURITY;

-- Public-facing insert allowed (no login). Keep it narrow.
CREATE POLICY "Anyone can create concierge referral requests"
ON public.concierge_referral_requests
FOR INSERT
WITH CHECK (true);

-- Read limited to authenticated users (e.g., studio/admin dashboard).
CREATE POLICY "Authenticated users can view concierge referral requests"
ON public.concierge_referral_requests
FOR SELECT
USING (auth.role() = 'authenticated');

-- Update limited to authenticated users.
CREATE POLICY "Authenticated users can update concierge referral requests"
ON public.concierge_referral_requests
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_concierge_referral_requests_updated_at ON public.concierge_referral_requests;
CREATE TRIGGER set_concierge_referral_requests_updated_at
BEFORE UPDATE ON public.concierge_referral_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
