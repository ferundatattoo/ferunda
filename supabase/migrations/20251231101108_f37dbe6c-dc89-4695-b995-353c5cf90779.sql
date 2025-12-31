-- Social Messages (unified inbox)
CREATE TABLE public.social_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.social_channels(id) ON DELETE CASCADE,
  external_id TEXT,
  thread_id TEXT,
  sender_id TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'voice', 'story_reply', 'story_mention')),
  content TEXT,
  media_urls TEXT[],
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'agent_replied', 'human_replied', 'escalated', 'archived')),
  escalation_reason TEXT,
  agent_response TEXT,
  agent_confidence NUMERIC(3,2),
  sentiment_score NUMERIC(3,2),
  booking_intent_score NUMERIC(3,2),
  revenue_prediction NUMERIC(10,2),
  ai_insights JSONB DEFAULT '{}',
  replied_by UUID REFERENCES auth.users(id),
  replied_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marketing Campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('social_post', 'email', 'dm_blast', 'story')),
  target_channels TEXT[],
  content JSONB NOT NULL DEFAULT '{}',
  media_urls TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'paused', 'completed')),
  ai_generated BOOLEAN DEFAULT false,
  ai_optimization_data JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  revenue_attributed NUMERIC(10,2) DEFAULT 0,
  bookings_attributed INTEGER DEFAULT 0,
  engagement_score NUMERIC(5,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue Analytics
CREATE TABLE public.revenue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source TEXT NOT NULL,
  channel TEXT,
  bookings_count INTEGER DEFAULT 0,
  revenue_amount NUMERIC(10,2) DEFAULT 0,
  deposits_amount NUMERIC(10,2) DEFAULT 0,
  avg_booking_value NUMERIC(10,2),
  conversion_rate NUMERIC(5,4),
  ai_predictions JSONB DEFAULT '{}',
  causal_insights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, date, source, channel)
);

-- Continual Learning Data
CREATE TABLE public.agent_learning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB NOT NULL DEFAULT '{}',
  outcome TEXT,
  outcome_value NUMERIC(10,2),
  feedback_score NUMERIC(3,2),
  learned_patterns JSONB DEFAULT '{}',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_learning_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view social messages"
ON public.social_messages FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage social messages"
ON public.social_messages FOR ALL TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view campaigns"
ON public.marketing_campaigns FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can manage campaigns"
ON public.marketing_campaigns FOR ALL TO authenticated
USING (public.check_workspace_access(workspace_id, ARRAY['owner', 'admin', 'manager']));

CREATE POLICY "Workspace members can view revenue analytics"
ON public.revenue_analytics FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view learning data"
ON public.agent_learning_data FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

-- Indexes
CREATE INDEX idx_social_messages_workspace ON public.social_messages(workspace_id);
CREATE INDEX idx_social_messages_status ON public.social_messages(status);
CREATE INDEX idx_social_messages_created ON public.social_messages(created_at DESC);
CREATE INDEX idx_marketing_campaigns_workspace ON public.marketing_campaigns(workspace_id);
CREATE INDEX idx_revenue_analytics_workspace_date ON public.revenue_analytics(workspace_id, date DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_messages;