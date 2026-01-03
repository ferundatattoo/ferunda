-- =====================================================
-- ETHEREAL MODULE SYSTEM - Pricing & Access Control
-- =====================================================

-- 1. Pricing Plans (different for Solo vs Studio)
CREATE TABLE public.ethereal_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  workspace_type TEXT NOT NULL CHECK (workspace_type IN ('solo', 'studio')),
  base_price DECIMAL(10,2) DEFAULT 0,
  price_per_seat DECIMAL(10,2) DEFAULT 0,
  included_seats INTEGER DEFAULT 1,
  included_modules TEXT[] DEFAULT '{}',
  features JSONB DEFAULT '{}',
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Module Definitions
CREATE TABLE public.ethereal_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('core', 'lite', 'pro', 'addon')),
  icon TEXT,
  route TEXT,
  parent_module TEXT,
  solo_addon_price DECIMAL(10,2),
  studio_addon_price DECIMAL(10,2),
  is_always_free BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  lock_message TEXT,
  features JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bundles (custom packages)
CREATE TABLE public.ethereal_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  modules TEXT[] NOT NULL,
  solo_price DECIMAL(10,2),
  studio_price DECIMAL(10,2),
  discount_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  promo_ends_at TIMESTAMPTZ,
  stripe_solo_price_id TEXT,
  stripe_studio_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Workspace Subscriptions
CREATE TABLE public.workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  purchased_addons TEXT[] DEFAULT '{}',
  purchased_bundles UUID[] DEFAULT '{}',
  seat_count INTEGER DEFAULT 1,
  monthly_total DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'cancelled', 'free')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

-- 5. Enable RLS
ALTER TABLE public.ethereal_pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ethereal_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ethereal_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - Plans and Modules are readable by everyone
CREATE POLICY "Anyone can read pricing plans"
  ON public.ethereal_pricing_plans FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read modules"
  ON public.ethereal_modules FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read active bundles"
  ON public.ethereal_bundles FOR SELECT
  USING (is_active = true);

-- 7. Workspace subscriptions - only workspace members can read
CREATE POLICY "Workspace members can read their subscription"
  ON public.workspace_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_subscriptions.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- 8. Admin policies (for global admins to manage everything)
CREATE POLICY "Admins can manage pricing plans"
  ON public.ethereal_pricing_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

CREATE POLICY "Admins can manage modules"
  ON public.ethereal_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

CREATE POLICY "Admins can manage bundles"
  ON public.ethereal_bundles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

CREATE POLICY "Admins can manage subscriptions"
  ON public.workspace_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

-- 9. Seed initial pricing plans
INSERT INTO public.ethereal_pricing_plans (plan_key, display_name, description, workspace_type, base_price, price_per_seat, included_seats, included_modules, sort_order) VALUES
-- Solo Plans
('solo_free', 'Free', 'Essential tools to get started', 'solo', 0, 0, 1, 
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'creative-lite'], 1),
('solo_pro', 'Solo Pro', 'Professional tools for serious artists', 'solo', 29, 0, 1,
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'money-pro', 'creative-lite', 'creative-pro'], 2),
('solo_ultimate', 'Solo Ultimate', 'Complete suite with AI power', 'solo', 59, 0, 1,
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'money-pro', 'creative-lite', 'creative-pro', 'growth', 'ai-center'], 3),
-- Studio Plans  
('studio_basic', 'Studio Basic', 'Essential team management', 'studio', 49, 15, 3,
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'creative-lite', 'team'], 4),
('studio_pro', 'Studio Pro', 'Professional studio operations', 'studio', 99, 12, 5,
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'money-pro', 'creative-lite', 'creative-pro', 'team'], 5),
('studio_ultimate', 'Studio Ultimate', 'Complete studio command center', 'studio', 199, 10, 10,
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'money-pro', 'creative-lite', 'creative-pro', 'growth', 'ai-center', 'team'], 6),
('enterprise', 'Enterprise', 'Custom enterprise solution', 'studio', 0, 0, 0,
  ARRAY['command-center', 'inbox', 'pipeline', 'calendar', 'clients', 'waitlist', 'settings', 'money-lite', 'money-pro', 'creative-lite', 'creative-pro', 'growth', 'ai-center', 'team', 'enterprise'], 7);

-- 10. Seed initial modules
INSERT INTO public.ethereal_modules (module_key, display_name, description, category, icon, route, is_always_free, sort_order, features) VALUES
-- Core modules (always free)
('command-center', 'Command Center', 'Your dashboard and overview', 'core', 'LayoutDashboard', '/os', true, 1, '["Dashboard overview", "Quick actions", "Notifications"]'),
('inbox', 'Inbox', 'Messages and communications', 'core', 'Inbox', '/os/inbox', true, 2, '["Client messages", "Team chat", "Notifications"]'),
('pipeline', 'Pipeline', 'Booking pipeline management', 'core', 'Layers', '/os/pipeline', true, 3, '["Booking stages", "Drag & drop", "Status tracking"]'),
('calendar', 'Calendar', 'Schedule and appointments', 'core', 'Calendar', '/os/calendar', true, 4, '["Appointments", "Availability", "Google sync"]'),
('clients', 'Clients', 'Client management', 'core', 'Users', '/os/clients', true, 5, '["Client profiles", "History", "Notes"]'),
('waitlist', 'Waitlist', 'Waitlist management', 'core', 'Clock', '/os/waitlist', true, 6, '["Queue management", "Priority", "Notifications"]'),
('settings', 'Settings', 'System settings', 'core', 'Settings', '/os/settings', true, 100, '["Workspace config", "Preferences", "Integrations"]'),

-- Money (lite free, pro paid)
('money-lite', 'Money', 'Basic financial overview', 'lite', 'DollarSign', '/os/money', true, 10, '["Balance overview", "Payment tracking", "Basic reports"]'),
('money-pro', 'Money PRO', 'AI-powered financial intelligence', 'pro', 'TrendingUp', '/os/money', false, 11, '["Revenue Optimizer", "Causal AI Forecaster", "Tax Optimizer", "Compensation Engine", "Finbots", "Inventory Predictor"]'),

-- Creative (lite free, pro paid)
('creative-lite', 'Creative Studio', 'Design management basics', 'lite', 'Palette', '/os/studio', true, 20, '["Portfolio", "Design uploads", "Gallery"]'),
('creative-pro', 'Creative PRO', 'AI-powered design tools', 'pro', 'Sparkles', '/os/studio', false, 21, '["AI Design Generation", "AR Preview", "Style Analyzer", "Flash Generator"]'),

-- Add-ons
('growth', 'Growth', 'Marketing and growth tools', 'addon', 'Rocket', '/os/growth', false, 30, '["Campaign Builder", "Social Growth", "Analytics", "Lead Magnets", "Email Automation"]'),
('ai-center', 'AI Center', 'Advanced AI capabilities', 'addon', 'Brain', '/os/intelligence', false, 40, '["Intelligence Dashboard", "Automations", "Shadow Mode", "Drift Detection", "Segmentation", "AI Health"]'),
('team', 'Team', 'Team management for studios', 'addon', 'UsersRound', '/os/artists', false, 50, '["Artist profiles", "Scheduling", "Permissions", "Performance"]'),
('enterprise', 'Enterprise', 'Enterprise features', 'addon', 'Building2', '/os/enterprise', false, 60, '["Multi-location", "SSO", "API Access", "White-label", "Priority support"]');

-- 11. Seed initial bundles
INSERT INTO public.ethereal_bundles (name, description, modules, solo_price, studio_price, discount_percent) VALUES
('Solo Pro Pack', 'Money PRO + Creative PRO for solo artists', ARRAY['money-pro', 'creative-pro'], 39, NULL, 20),
('Growth Pack', 'Growth + AI Center for scaling up', ARRAY['growth', 'ai-center'], 69, 139, 25),
('Studio Complete', 'Everything for studios', ARRAY['money-pro', 'creative-pro', 'growth', 'ai-center'], NULL, 199, 30);

-- 12. Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_ethereal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ethereal_pricing_plans_updated_at
  BEFORE UPDATE ON public.ethereal_pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_ethereal_updated_at();

CREATE TRIGGER update_ethereal_modules_updated_at
  BEFORE UPDATE ON public.ethereal_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_ethereal_updated_at();

CREATE TRIGGER update_ethereal_bundles_updated_at
  BEFORE UPDATE ON public.ethereal_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_ethereal_updated_at();

CREATE TRIGGER update_workspace_subscriptions_updated_at
  BEFORE UPDATE ON public.workspace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_ethereal_updated_at();