-- Artist session configuration table
CREATE TABLE public.artist_session_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.studio_artists(id),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  
  -- Speed configurations (cm²/hour for different styles)
  default_speed_cm2_hour NUMERIC DEFAULT 20,
  geometric_speed_cm2_hour NUMERIC DEFAULT 25,
  micro_realism_speed_cm2_hour NUMERIC DEFAULT 12,
  fine_line_speed_cm2_hour NUMERIC DEFAULT 30,
  color_speed_cm2_hour NUMERIC DEFAULT 15,
  
  -- Session preferences
  max_session_hours NUMERIC DEFAULT 5,
  min_session_hours NUMERIC DEFAULT 2,
  preferred_session_hours NUMERIC DEFAULT 4,
  break_frequency_hours NUMERIC DEFAULT 2,
  break_duration_minutes INTEGER DEFAULT 15,
  max_clients_per_day INTEGER DEFAULT 2,
  
  -- Adjustments
  dark_skin_multiplier NUMERIC DEFAULT 1.3,
  aged_skin_multiplier NUMERIC DEFAULT 1.2,
  keloid_prone_multiplier NUMERIC DEFAULT 1.5,
  sensitive_area_multiplier NUMERIC DEFAULT 1.4,
  coverup_multiplier NUMERIC DEFAULT 1.6,
  rework_multiplier NUMERIC DEFAULT 1.3,
  
  -- Revenue settings
  hourly_rate NUMERIC DEFAULT 200,
  deposit_percentage NUMERIC DEFAULT 30,
  upsell_threshold_sessions INTEGER DEFAULT 3,
  
  -- ML learning enabled
  ml_learning_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(artist_id)
);

-- Past sessions table for ML learning
CREATE TABLE public.past_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.studio_artists(id),
  booking_id UUID REFERENCES public.bookings(id),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  
  -- Original estimation
  estimated_hours_min NUMERIC,
  estimated_hours_max NUMERIC,
  estimated_sessions INTEGER,
  estimation_confidence NUMERIC,
  
  -- Actual results
  actual_hours NUMERIC,
  actual_sessions INTEGER,
  actual_revenue NUMERIC,
  
  -- Design factors (for ML features)
  design_size_cm2 NUMERIC,
  design_complexity NUMERIC,
  design_style TEXT,
  color_type TEXT,
  placement TEXT,
  
  -- Client factors
  skin_tone TEXT,
  client_age_range TEXT,
  pain_tolerance TEXT,
  is_first_tattoo BOOLEAN,
  
  -- Location factors from simulator
  curvature_score NUMERIC,
  movement_distortion_risk NUMERIC,
  blowout_risk NUMERIC,
  
  -- Learning metrics
  estimation_accuracy NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN actual_hours > 0 AND estimated_hours_max > 0 
      THEN 100 - ABS((actual_hours - ((estimated_hours_min + estimated_hours_max) / 2)) / actual_hours * 100)
      ELSE NULL 
    END
  ) STORED,
  
  -- Revenue analysis
  revenue_per_hour NUMERIC GENERATED ALWAYS AS (
    CASE WHEN actual_hours > 0 THEN actual_revenue / actual_hours ELSE NULL END
  ) STORED,
  
  -- Timestamps
  session_dates JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session estimation logs for audit
CREATE TABLE public.session_estimation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id),
  booking_id UUID REFERENCES public.bookings(id),
  artist_id UUID REFERENCES public.studio_artists(id),
  
  -- Input data
  input_data JSONB NOT NULL,
  
  -- Estimation result
  estimation_result JSONB NOT NULL,
  
  -- Confidence and reasoning
  confidence_score NUMERIC,
  reasoning_steps JSONB,
  
  -- Revenue forecast
  revenue_forecast JSONB,
  
  -- ML adjustments applied
  ml_adjustments JSONB,
  
  -- Override tracking
  was_overridden BOOLEAN DEFAULT false,
  override_by UUID,
  override_reason TEXT,
  override_values JSONB,
  
  -- Audit hash
  audit_hash TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artist_session_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_estimation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Artists can view their own config"
  ON public.artist_session_config FOR SELECT
  USING (artist_id IN (SELECT id FROM public.studio_artists WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update their own config"
  ON public.artist_session_config FOR UPDATE
  USING (artist_id IN (SELECT id FROM public.studio_artists WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert their own config"
  ON public.artist_session_config FOR INSERT
  WITH CHECK (artist_id IN (SELECT id FROM public.studio_artists WHERE user_id = auth.uid()));

CREATE POLICY "Artists can view their past sessions"
  ON public.past_sessions FOR SELECT
  USING (artist_id IN (SELECT id FROM public.studio_artists WHERE user_id = auth.uid()));

CREATE POLICY "Artists can manage their past sessions"
  ON public.past_sessions FOR ALL
  USING (artist_id IN (SELECT id FROM public.studio_artists WHERE user_id = auth.uid()));

CREATE POLICY "Service role can access estimation logs"
  ON public.session_estimation_logs FOR ALL
  USING (true);

-- Updated at trigger
CREATE TRIGGER update_artist_session_config_updated_at
  BEFORE UPDATE ON public.artist_session_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_past_sessions_updated_at
  BEFORE UPDATE ON public.past_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for ML queries
CREATE INDEX idx_past_sessions_artist_style ON public.past_sessions(artist_id, design_style);
CREATE INDEX idx_past_sessions_accuracy ON public.past_sessions(estimation_accuracy) WHERE estimation_accuracy IS NOT NULL;
CREATE INDEX idx_estimation_logs_conversation ON public.session_estimation_logs(conversation_id);