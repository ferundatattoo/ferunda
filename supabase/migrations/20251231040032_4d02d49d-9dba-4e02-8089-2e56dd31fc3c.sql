-- Create social_trends table for trend detection
CREATE TABLE public.social_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'both')),
  trend_type TEXT NOT NULL CHECK (trend_type IN ('sound', 'format', 'hashtag', 'challenge')),
  title TEXT NOT NULL,
  description TEXT,
  viral_score INTEGER DEFAULT 0,
  views_estimate TEXT,
  engagement_rate DECIMAL(5,2),
  audio_name TEXT,
  audio_url TEXT,
  example_urls TEXT[],
  adaptability_score INTEGER DEFAULT 50,
  tattoo_relevance TEXT CHECK (tattoo_relevance IN ('perfect', 'high', 'medium', 'low')),
  suggested_script JSONB,
  hashtags TEXT[],
  best_posting_times TEXT[],
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_estimate TIMESTAMPTZ,
  status TEXT DEFAULT 'rising' CHECK (status IN ('hot', 'rising', 'stable', 'declining')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for fast searches
CREATE INDEX idx_social_trends_viral_score ON public.social_trends(viral_score DESC);
CREATE INDEX idx_social_trends_platform ON public.social_trends(platform);
CREATE INDEX idx_social_trends_status ON public.social_trends(status);

-- Enable RLS
ALTER TABLE public.social_trends ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read trends
CREATE POLICY "Authenticated users can read trends"
ON public.social_trends
FOR SELECT
TO authenticated
USING (true);

-- Admins can manage trends (insert, update, delete)
CREATE POLICY "Admins can manage trends"
ON public.social_trends
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create content_creations table
CREATE TABLE public.content_creations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.studio_artists(id) ON DELETE SET NULL,
  trend_id UUID REFERENCES public.social_trends(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'recording', 'processing', 'ready', 'published')),
  clips JSONB DEFAULT '[]',
  edit_settings JSONB,
  caption TEXT,
  hashtags TEXT[],
  platforms TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_creations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their content
CREATE POLICY "Authenticated users can read content creations"
ON public.content_creations
FOR SELECT
TO authenticated
USING (true);

-- Users can manage their own content
CREATE POLICY "Users can manage their own content"
ON public.content_creations
FOR ALL
TO authenticated
USING (
  artist_id IN (
    SELECT id FROM public.studio_artists WHERE user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add updated_at trigger for social_trends
CREATE TRIGGER update_social_trends_updated_at
BEFORE UPDATE ON public.social_trends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for content_creations
CREATE TRIGGER update_content_creations_updated_at
BEFORE UPDATE ON public.content_creations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();