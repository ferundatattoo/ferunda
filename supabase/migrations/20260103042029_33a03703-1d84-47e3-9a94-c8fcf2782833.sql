-- Create app_configurations table for centralized config
CREATE TABLE IF NOT EXISTS public.app_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES public.workspace_settings(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(config_key, workspace_id)
);

-- Enable RLS
ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read non-secret configs"
  ON public.app_configurations FOR SELECT
  TO authenticated
  USING (is_secret = false OR workspace_id IS NOT NULL);

CREATE POLICY "Admins can manage configs"
  ON public.app_configurations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_configurations;

-- Insert default workflow configurations
INSERT INTO public.app_configurations (config_key, config_value, category, description) VALUES
('workflow.retry.max_attempts', '5', 'workflow', 'Maximum retry attempts for failed workflows'),
('workflow.retry.base_delay_ms', '1000', 'workflow', 'Base delay for exponential backoff in milliseconds'),
('workflow.retry.max_delay_ms', '300000', 'workflow', 'Maximum delay between retries (5 minutes)'),
('workflow.dead_letter.auto_move_after', '5', 'workflow', 'Move to dead letter after N failed retries'),
('workflow.signal.timeout_ms', '86400000', 'workflow', 'Signal wait timeout (24 hours)'),
('workflow.compensation.enabled', 'true', 'workflow', 'Enable automatic compensation on failure'),
('booking.deposit.percentage', '20', 'booking', 'Default deposit percentage'),
('booking.confirmation.auto_send', 'true', 'booking', 'Auto-send confirmation emails'),
('booking.reminder.hours_before', '24', 'booking', 'Send reminder N hours before appointment')
ON CONFLICT (config_key, workspace_id) DO NOTHING;