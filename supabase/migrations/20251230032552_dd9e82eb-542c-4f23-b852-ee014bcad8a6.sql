-- Create concierge test cases table for regression testing
CREATE TABLE public.concierge_test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  context JSONB DEFAULT '{}'::jsonb,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  assertions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_passed BOOLEAN,
  last_result JSONB,
  run_count INTEGER DEFAULT 0,
  pass_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concierge_test_cases ENABLE ROW LEVEL SECURITY;

-- Admins can manage test cases
CREATE POLICY "Admins can manage concierge_test_cases"
ON public.concierge_test_cases
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Create index for active tests
CREATE INDEX idx_concierge_test_cases_active ON public.concierge_test_cases(is_active) WHERE is_active = true;