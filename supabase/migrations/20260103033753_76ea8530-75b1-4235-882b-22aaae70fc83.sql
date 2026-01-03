-- Phase 1: Production-Ready Workflow System Enhancement
-- =====================================================

-- 1.1 Enhance workflow_runs table with durability columns
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS retry_policy JSONB DEFAULT '{"backoff": "exponential", "initial_delay_ms": 1000, "max_delay_ms": 300000}';
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS awaiting_signal TEXT;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS signal_data JSONB;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS compensations_needed JSONB DEFAULT '[]';
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS compensation_status TEXT DEFAULT 'none';

-- Add index for scheduler queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_retry ON workflow_runs(status, next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_runs_awaiting ON workflow_runs(awaiting_signal) WHERE awaiting_signal IS NOT NULL;

-- 1.2 Create workflow_signals table for async communication
CREATE TABLE IF NOT EXISTS workflow_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data JSONB,
  source TEXT, -- 'webhook', 'manual', 'timer', 'system'
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for pending signals
CREATE INDEX IF NOT EXISTS idx_workflow_signals_pending ON workflow_signals(run_id) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_signals_type ON workflow_signals(signal_type, created_at);

-- Enable RLS
ALTER TABLE workflow_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_signals
CREATE POLICY "Authenticated users can view workflow signals" ON workflow_signals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert workflow signals" ON workflow_signals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "System can update workflow signals" ON workflow_signals
  FOR UPDATE TO authenticated USING (true);

-- 1.3 Create workflow_dead_letters table for failed workflows
CREATE TABLE IF NOT EXISTS workflow_dead_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  workflow_id UUID,
  workflow_name TEXT,
  failure_reason TEXT NOT NULL,
  last_error TEXT,
  failed_at_step TEXT,
  context JSONB,
  input_data JSONB,
  can_retry BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  resolution_action TEXT, -- 'retried', 'skipped', 'manual_fix', 'ignored'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for dead letter management
CREATE INDEX IF NOT EXISTS idx_dead_letters_unresolved ON workflow_dead_letters(created_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dead_letters_workflow ON workflow_dead_letters(workflow_id);

-- Enable RLS
ALTER TABLE workflow_dead_letters ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_dead_letters
CREATE POLICY "Authenticated users can view dead letters" ON workflow_dead_letters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert dead letters" ON workflow_dead_letters
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dead letters" ON workflow_dead_letters
  FOR UPDATE TO authenticated USING (true);

-- 1.4 Create workflow_compensations table to track rollback actions
CREATE TABLE IF NOT EXISTS workflow_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  compensation_action TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  input_data JSONB,
  output_data JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compensations_run ON workflow_compensations(run_id);
CREATE INDEX IF NOT EXISTS idx_compensations_pending ON workflow_compensations(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE workflow_compensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view compensations" ON workflow_compensations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage compensations" ON workflow_compensations
  FOR ALL TO authenticated USING (true);

-- 1.5 Enable realtime for workflow monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_step_logs;