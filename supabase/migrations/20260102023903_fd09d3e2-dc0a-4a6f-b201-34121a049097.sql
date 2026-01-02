-- =============================================
-- FASE 2: AI REVENUE OPTIMIZER GOD
-- Revenue models, forecasts, deposits, margins
-- =============================================

-- Revenue models (ML models for pricing/conversion)
CREATE TABLE public.revenue_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  model_key TEXT NOT NULL,
  model_type TEXT DEFAULT 'pricing',
  config JSONB DEFAULT '{}',
  last_trained_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, model_key)
);

-- Revenue recommendations
CREATE TABLE public.revenue_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_ref UUID,
  rec_type TEXT NOT NULL,
  suggestion JSONB NOT NULL,
  expected_impact NUMERIC,
  confidence NUMERIC,
  risk_level TEXT DEFAULT 'low',
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue constraints (guardrails)
CREATE TABLE public.revenue_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  constraint_key TEXT NOT NULL,
  min_deposit NUMERIC DEFAULT 50,
  max_deposit NUMERIC DEFAULT 500,
  max_price_delta_percent NUMERIC DEFAULT 20,
  fairness_limits JSONB DEFAULT '{}',
  safety_limits JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, constraint_key)
);

-- Demand forecasts
CREATE TABLE public.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  scope TEXT DEFAULT 'studio',
  artist_id UUID REFERENCES public.studio_artists(id) ON DELETE SET NULL,
  horizon_days INTEGER DEFAULT 14,
  forecast_json JSONB NOT NULL,
  confidence NUMERIC,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premium slots (high-demand time slots)
CREATE TABLE public.premium_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  demand_score NUMERIC,
  suggested_policy JSONB DEFAULT '{}',
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposit policies
CREATE TABLE public.deposit_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  display_name TEXT,
  min_amount NUMERIC DEFAULT 50,
  max_amount NUMERIC DEFAULT 500,
  base_percentage NUMERIC DEFAULT 30,
  rules JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, template_key)
);

-- Deposit recommendations (per lead/booking)
CREATE TABLE public.deposit_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  lead_id UUID,
  booking_id UUID,
  conversation_id UUID,
  suggested_amount NUMERIC NOT NULL,
  reason JSONB NOT NULL,
  confidence NUMERIC,
  safe_level TEXT DEFAULT 'normal',
  options JSONB DEFAULT '[]',
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kit profiles (supply cost estimation by style/size)
CREATE TABLE public.kit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL,
  style TEXT,
  size TEXT,
  color_work BOOLEAN DEFAULT false,
  consumables_estimate NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, profile_key)
);

-- Booking cost estimates (COGS + margin)
CREATE TABLE public.booking_cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  kit_profile_id UUID REFERENCES public.kit_profiles(id) ON DELETE SET NULL,
  cogs_estimate NUMERIC DEFAULT 0,
  labor_estimate NUMERIC DEFAULT 0,
  margin_estimate NUMERIC DEFAULT 0,
  margin_percentage NUMERIC,
  breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Price books (artist-specific pricing rules)
CREATE TABLE public.price_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  base_hourly_rate NUMERIC NOT NULL,
  min_price NUMERIC DEFAULT 100,
  premium_slot_multiplier NUMERIC DEFAULT 1.2,
  style_adjustments JSONB DEFAULT '{}',
  size_adjustments JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, artist_id)
);

-- Optimization scenarios (what-if analysis)
CREATE TABLE public.optimization_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT DEFAULT 'pricing',
  input_params JSONB NOT NULL,
  results_json JSONB,
  expected_revenue_delta NUMERIC,
  expected_conversion_delta NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.revenue_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cost_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies (workspace-based access)
CREATE POLICY "revenue_models_workspace_access" ON public.revenue_models
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "revenue_recommendations_workspace_access" ON public.revenue_recommendations
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "revenue_constraints_workspace_access" ON public.revenue_constraints
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "demand_forecasts_workspace_access" ON public.demand_forecasts
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "premium_slots_workspace_access" ON public.premium_slots
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "deposit_policies_workspace_access" ON public.deposit_policies
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "deposit_recommendations_workspace_access" ON public.deposit_recommendations
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "kit_profiles_workspace_access" ON public.kit_profiles
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "booking_cost_estimates_workspace_access" ON public.booking_cost_estimates
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "price_books_workspace_access" ON public.price_books
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "optimization_scenarios_workspace_access" ON public.optimization_scenarios
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_revenue_recommendations_workspace ON public.revenue_recommendations(workspace_id, created_at DESC);
CREATE INDEX idx_demand_forecasts_workspace ON public.demand_forecasts(workspace_id, expires_at);
CREATE INDEX idx_premium_slots_lookup ON public.premium_slots(workspace_id, artist_id, slot_date);
CREATE INDEX idx_deposit_recommendations_lookup ON public.deposit_recommendations(workspace_id, booking_id);
CREATE INDEX idx_booking_cost_estimates_booking ON public.booking_cost_estimates(booking_id);