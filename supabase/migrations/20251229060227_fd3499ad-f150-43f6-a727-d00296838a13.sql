-- ===========================================
-- VERIFICATION OTPS TABLE
-- ===========================================
CREATE TABLE public.verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone TEXT,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMPTZ,
  attempt_count INT DEFAULT 0,
  ip_address TEXT,
  fingerprint_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_verification_otps_email ON public.verification_otps(email);
CREATE INDEX idx_verification_otps_expires ON public.verification_otps(expires_at);

-- Enable RLS
ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;

-- No direct access - only via edge functions
CREATE POLICY "No direct access to verification_otps" 
ON public.verification_otps FOR ALL 
USING (false);

-- ===========================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- ===========================================
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'pending')),
  source TEXT DEFAULT 'website',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  lead_score INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,
  email_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_status ON public.newsletter_subscribers(status);
CREATE INDEX idx_newsletter_subscribers_lead_score ON public.newsletter_subscribers(lead_score DESC);
CREATE INDEX idx_newsletter_subscribers_tags ON public.newsletter_subscribers USING GIN(tags);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage newsletter_subscribers" 
ON public.newsletter_subscribers FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can subscribe" 
ON public.newsletter_subscribers FOR INSERT 
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_newsletter_subscribers_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- EMAIL CAMPAIGNS TABLE
-- ===========================================
CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'paused')),
  campaign_type TEXT DEFAULT 'newsletter' CHECK (campaign_type IN ('flash_sale', 'availability', 'newsletter', 'promo', 'follow_up', 'welcome')),
  target_segments TEXT[] DEFAULT '{}',
  target_cities TEXT[] DEFAULT '{}',
  target_lead_score_min INT DEFAULT 0,
  target_lead_score_max INT,
  exclude_tags TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  unsubscribe_count INT DEFAULT 0,
  bounce_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON public.email_campaigns(scheduled_at) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can manage campaigns
CREATE POLICY "Admins can manage email_campaigns" 
ON public.email_campaigns FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- CAMPAIGN SENDS TABLE
-- ===========================================
CREATE TABLE public.campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  resend_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaign_sends_campaign ON public.campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_subscriber ON public.campaign_sends(subscriber_id);
CREATE INDEX idx_campaign_sends_status ON public.campaign_sends(status);
CREATE UNIQUE INDEX idx_campaign_sends_unique ON public.campaign_sends(campaign_id, subscriber_id);

-- Enable RLS
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage campaign_sends" 
ON public.campaign_sends FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- LEAD SCORING FUNCTION
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_lead_score(subscriber_email TEXT, points INT, reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE newsletter_subscribers
  SET 
    lead_score = GREATEST(0, lead_score + points),
    updated_at = now()
  WHERE email = subscriber_email;
END;
$$;

-- ===========================================
-- AUTO-TAG LEADS FUNCTION
-- ===========================================
CREATE OR REPLACE FUNCTION public.auto_tag_subscriber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tags TEXT[];
BEGIN
  new_tags := NEW.tags;
  
  -- Hot lead if score > 50
  IF NEW.lead_score > 50 AND NOT 'hot_lead' = ANY(new_tags) THEN
    new_tags := array_append(new_tags, 'hot_lead');
  ELSIF NEW.lead_score <= 50 THEN
    new_tags := array_remove(new_tags, 'hot_lead');
  END IF;
  
  -- Qualified if verified and has booking
  IF NEW.verified_at IS NOT NULL AND NEW.booking_id IS NOT NULL AND NOT 'qualified' = ANY(new_tags) THEN
    new_tags := array_append(new_tags, 'qualified');
  END IF;
  
  NEW.tags := new_tags;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_tag_subscriber_trigger
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.auto_tag_subscriber();