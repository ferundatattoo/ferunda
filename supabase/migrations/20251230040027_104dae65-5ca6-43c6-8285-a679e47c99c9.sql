-- Phase 2: Services Catalog Table (create first since it doesn't exist)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  buffer_before_min INTEGER NOT NULL DEFAULT 10,
  buffer_after_min INTEGER NOT NULL DEFAULT 10,
  extra_after_buffer_min INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage services" ON public.services FOR ALL USING (auth.role() = 'authenticated');

-- Seed services catalog (luxury defaults)
INSERT INTO public.services (service_key, name, description, duration_minutes, deposit_amount, buffer_before_min, buffer_after_min, extra_after_buffer_min, sort_order) VALUES
('consult', 'Consultation', 'Initial consultation to discuss your tattoo project', 20, 0, 10, 10, 0, 1),
('design_review', 'Design Review', 'Review and finalize your custom design', 30, 0, 10, 10, 0, 2),
('session_3h', '3-Hour Session', 'Standard tattoo session', 180, 150, 15, 20, 0, 3),
('session_4h', '4-Hour Session', 'Extended tattoo session', 240, 150, 15, 20, 0, 4),
('session_6h', '6-Hour Session', 'Half-day tattoo session', 360, 250, 15, 20, 10, 5),
('session_8h', '8-Hour Session', 'Full-day tattoo session', 480, 350, 15, 20, 10, 6)
ON CONFLICT (service_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active, sort_order);