-- =====================================================
-- INTELLIGENCE NEXUS + CORE BUS VIVO SUPREMO ETERNO
-- Tablas de soporte para el sistema nervioso central
-- =====================================================

-- 1. event_log: Auditoría de todos los eventos del Core Bus
CREATE TABLE public.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL, -- 'frontend', 'edge-function', 'webhook', 'cron'
  correlation_id TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para queries eficientes
CREATE INDEX idx_event_log_type ON public.event_log(event_type);
CREATE INDEX idx_event_log_created ON public.event_log(created_at DESC);
CREATE INDEX idx_event_log_correlation ON public.event_log(correlation_id) WHERE correlation_id IS NOT NULL;

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_log;

-- RLS para event_log (público para lectura, insert desde cualquier fuente)
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on event_log"
  ON public.event_log FOR SELECT
  USING (true);

CREATE POLICY "Allow insert from any source"
  ON public.event_log FOR INSERT
  WITH CHECK (true);

-- 2. ai_provider_roles: Configuración de roles de IA
CREATE TABLE public.ai_provider_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL UNIQUE, -- 'conversation', 'vision', 'generation', etc.
  primary_provider TEXT NOT NULL,
  fallback_provider TEXT,
  model_config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed inicial de roles de AI
INSERT INTO public.ai_provider_roles (task_type, primary_provider, fallback_provider, model_config, priority) VALUES
  ('conversation', 'grok', 'lovable-ai', '{"model": "grok-3-fast", "max_tokens": 1024, "temperature": 0.7}', 1),
  ('vision', 'grok', 'lovable-ai', '{"model": "grok-2-vision-1212", "max_tokens": 512}', 2),
  ('generation', 'lovable-ai', 'replicate', '{"model": "google/gemini-2.5-flash"}', 3),
  ('embedding', 'openai', 'huggingface', '{"model": "text-embedding-3-small"}', 4),
  ('tts', 'elevenlabs', NULL, '{"voice_id": "default"}', 5),
  ('marketing', 'lovable-ai', 'grok', '{"model": "google/gemini-2.5-flash", "max_tokens": 2048}', 6);

-- RLS para ai_provider_roles (público lectura)
ALTER TABLE public.ai_provider_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ai_provider_roles"
  ON public.ai_provider_roles FOR SELECT
  USING (true);

-- 3. ai_usage_logs: Tracking de uso y costos de AI
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  task_type TEXT,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  session_id TEXT,
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para analytics
CREATE INDEX idx_ai_usage_created ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_provider ON public.ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_task ON public.ai_usage_logs(task_type);
CREATE INDEX idx_ai_usage_session ON public.ai_usage_logs(session_id) WHERE session_id IS NOT NULL;

-- RLS para ai_usage_logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on ai_usage_logs"
  ON public.ai_usage_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow insert on ai_usage_logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (true);

-- Trigger para updated_at en ai_provider_roles
CREATE TRIGGER update_ai_provider_roles_updated_at
  BEFORE UPDATE ON public.ai_provider_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();