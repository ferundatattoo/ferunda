-- Marketing Hub Database Schema

-- 1. Marketing Audit Log - para compliance y tracking
CREATE TABLE IF NOT EXISTS public.marketing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  user_id UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Notification Queue - cola de notificaciones multi-canal
CREATE TABLE IF NOT EXISTS public.marketing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'slack')),
  recipient_id UUID,
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Content Templates - plantillas reutilizables
CREATE TABLE IF NOT EXISTS public.marketing_content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  platform TEXT NOT NULL,
  tone TEXT DEFAULT 'professional',
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  example_output TEXT,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Posting Schedules - horarios óptimos de publicación
CREATE TABLE IF NOT EXISTS public.marketing_posting_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  account_id UUID,
  platform TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  optimal_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  engagement_score NUMERIC(5,2),
  sample_size INTEGER DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ,
  is_auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Marketing Campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  campaign_type TEXT NOT NULL,
  platforms JSONB DEFAULT '[]',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget NUMERIC(10,2),
  spent NUMERIC(10,2) DEFAULT 0,
  goals JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Scheduled Posts
CREATE TABLE IF NOT EXISTS public.marketing_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  campaign_id UUID REFERENCES public.marketing_campaigns(id),
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  hashtags JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  external_post_id TEXT,
  metrics JSONB DEFAULT '{}',
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. A/B Tests
CREATE TABLE IF NOT EXISTS public.marketing_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  campaign_id UUID REFERENCES public.marketing_campaigns(id),
  name TEXT NOT NULL,
  hypothesis TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  metric_to_optimize TEXT NOT NULL,
  variants JSONB NOT NULL DEFAULT '[]',
  winner_variant TEXT,
  confidence_score NUMERIC(5,2),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  results JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Competitor Analysis Cache
CREATE TABLE IF NOT EXISTS public.marketing_competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  competitor_handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  follower_count INTEGER,
  engagement_rate NUMERIC(5,2),
  posting_frequency NUMERIC(5,2),
  top_hashtags JSONB DEFAULT '[]',
  content_themes JSONB DEFAULT '[]',
  sentiment_score NUMERIC(5,2),
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_audit_workspace ON public.marketing_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketing_audit_created ON public.marketing_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_notifications_status ON public.marketing_notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_platform ON public.marketing_content_templates(platform, category);
CREATE INDEX IF NOT EXISTS idx_marketing_schedules_platform ON public.marketing_posting_schedules(platform, day_of_week);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_scheduled ON public.marketing_scheduled_posts(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_marketing_ab_tests_status ON public.marketing_ab_tests(status);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.marketing_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_marketing_notifications_updated_at ON public.marketing_notifications;
CREATE TRIGGER update_marketing_notifications_updated_at
  BEFORE UPDATE ON public.marketing_notifications
  FOR EACH ROW EXECUTE FUNCTION public.marketing_update_updated_at();

DROP TRIGGER IF EXISTS update_marketing_templates_updated_at ON public.marketing_content_templates;
CREATE TRIGGER update_marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_content_templates
  FOR EACH ROW EXECUTE FUNCTION public.marketing_update_updated_at();

DROP TRIGGER IF EXISTS update_marketing_schedules_updated_at ON public.marketing_posting_schedules;
CREATE TRIGGER update_marketing_schedules_updated_at
  BEFORE UPDATE ON public.marketing_posting_schedules
  FOR EACH ROW EXECUTE FUNCTION public.marketing_update_updated_at();

DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.marketing_update_updated_at();

DROP TRIGGER IF EXISTS update_marketing_posts_updated_at ON public.marketing_scheduled_posts;
CREATE TRIGGER update_marketing_posts_updated_at
  BEFORE UPDATE ON public.marketing_scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.marketing_update_updated_at();

DROP TRIGGER IF EXISTS update_marketing_ab_tests_updated_at ON public.marketing_ab_tests;
CREATE TRIGGER update_marketing_ab_tests_updated_at
  BEFORE UPDATE ON public.marketing_ab_tests
  FOR EACH ROW EXECUTE FUNCTION public.marketing_update_updated_at();

-- RLS Policies
ALTER TABLE public.marketing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_posting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_competitor_analysis ENABLE ROW LEVEL SECURITY;

-- Policies for service role access (edge functions)
CREATE POLICY "Service role full access audit_log" ON public.marketing_audit_log FOR ALL USING (true);
CREATE POLICY "Service role full access notifications" ON public.marketing_notifications FOR ALL USING (true);
CREATE POLICY "Service role full access templates" ON public.marketing_content_templates FOR ALL USING (true);
CREATE POLICY "Service role full access schedules" ON public.marketing_posting_schedules FOR ALL USING (true);
CREATE POLICY "Service role full access campaigns" ON public.marketing_campaigns FOR ALL USING (true);
CREATE POLICY "Service role full access posts" ON public.marketing_scheduled_posts FOR ALL USING (true);
CREATE POLICY "Service role full access ab_tests" ON public.marketing_ab_tests FOR ALL USING (true);
CREATE POLICY "Service role full access competitor" ON public.marketing_competitor_analysis FOR ALL USING (true);