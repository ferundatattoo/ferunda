-- ================================================
-- PHASE 3: Social Growth Autopilot Tables (only new ones)
-- ================================================

-- Social accounts linked to workspace
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_id TEXT,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  follower_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content queue for scheduled posts
CREATE TABLE IF NOT EXISTS public.content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  media_urls TEXT[],
  caption TEXT,
  hashtags TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  ai_generated BOOLEAN DEFAULT false,
  ai_optimization_score NUMERIC(5,2),
  error_message TEXT,
  external_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content performance metrics
CREATE TABLE IF NOT EXISTS public.content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_queue_id UUID REFERENCES public.content_queue(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,4),
  click_through_rate NUMERIC(5,4),
  booking_conversions INTEGER DEFAULT 0,
  revenue_attributed NUMERIC(10,2) DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- AI-generated content suggestions
CREATE TABLE IF NOT EXISTS public.content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content_data JSONB,
  confidence_score NUMERIC(5,2),
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Competitor analysis
CREATE TABLE IF NOT EXISTS public.competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  display_name TEXT,
  follower_count INTEGER,
  avg_engagement_rate NUMERIC(5,4),
  posting_frequency_weekly NUMERIC(5,2),
  top_performing_content JSONB,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Growth goals and tracking
CREATE TABLE IF NOT EXISTS public.growth_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  goal_type TEXT NOT NULL,
  target_value NUMERIC(12,2),
  current_value NUMERIC(12,2) DEFAULT 0,
  start_value NUMERIC(12,2),
  target_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI autopilot settings
CREATE TABLE IF NOT EXISTS public.autopilot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  auto_schedule_posts BOOLEAN DEFAULT true,
  auto_respond_comments BOOLEAN DEFAULT false,
  auto_respond_dms BOOLEAN DEFAULT false,
  optimal_posting_times JSONB,
  content_pillars JSONB,
  brand_voice_guidelines TEXT,
  hashtag_strategy JSONB,
  safety_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables only
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their workspace social accounts"
  ON public.social_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));

CREATE POLICY "Users can manage their workspace content queue"
  ON public.content_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));

CREATE POLICY "Users can view their workspace content performance"
  ON public.content_performance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM content_queue cq 
    JOIN workspace_settings ws ON ws.id = cq.workspace_id 
    WHERE cq.id = content_queue_id AND ws.owner_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their workspace content suggestions"
  ON public.content_suggestions FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));

CREATE POLICY "Users can manage their workspace competitor profiles"
  ON public.competitor_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));

CREATE POLICY "Users can manage their workspace growth goals"
  ON public.growth_goals FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));

CREATE POLICY "Users can manage their workspace autopilot settings"
  ON public.autopilot_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_settings ws WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()));