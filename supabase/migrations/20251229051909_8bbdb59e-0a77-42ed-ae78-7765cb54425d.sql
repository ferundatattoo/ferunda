-- Crear tabla magic_link_rate_limits si no existe
CREATE TABLE IF NOT EXISTS public.magic_link_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  failed_attempts INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

-- RLS para la tabla
ALTER TABLE public.magic_link_rate_limits ENABLE ROW LEVEL SECURITY;

-- Política para service role
DO $$ BEGIN
  CREATE POLICY "Service role manages magic link rate limits"
    ON public.magic_link_rate_limits FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Índice para búsquedas por IP
CREATE INDEX IF NOT EXISTS idx_magic_link_rate_limits_ip ON magic_link_rate_limits(ip_address);

-- Fix get_customer_permissions - missing SET search_path
CREATE OR REPLACE FUNCTION public.get_customer_permissions(p_pipeline_stage text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  RETURN CASE p_pipeline_stage
    WHEN 'new_inquiry' THEN 
      '{"can_view": true, "can_message": true, "can_upload": false, "can_pay": false, "can_reschedule": false}'::jsonb
    WHEN 'references_requested' THEN 
      '{"can_view": true, "can_message": true, "can_upload": true, "can_pay": false, "can_reschedule": false}'::jsonb
    WHEN 'references_received' THEN 
      '{"can_view": true, "can_message": true, "can_upload": true, "can_pay": false, "can_reschedule": false}'::jsonb
    WHEN 'deposit_requested' THEN 
      '{"can_view": true, "can_message": true, "can_upload": true, "can_pay": true, "can_reschedule": false}'::jsonb
    WHEN 'deposit_paid' THEN 
      '{"can_view": true, "can_message": true, "can_upload": true, "can_pay": true, "can_reschedule": true}'::jsonb
    WHEN 'scheduled' THEN 
      '{"can_view": true, "can_message": true, "can_upload": true, "can_pay": true, "can_reschedule": true}'::jsonb
    WHEN 'completed' THEN 
      '{"can_view": true, "can_message": true, "can_upload": false, "can_pay": true, "can_reschedule": false}'::jsonb
    ELSE 
      '{"can_view": true, "can_message": false, "can_upload": false, "can_pay": false, "can_reschedule": false}'::jsonb
  END;
END;
$function$;

-- Funciones de rate limiting para magic links
CREATE OR REPLACE FUNCTION public.record_magic_link_failure(p_ip_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO magic_link_rate_limits (ip_address, failed_attempts, first_attempt_at, last_attempt_at)
  VALUES (p_ip_address, 1, now(), now())
  ON CONFLICT (ip_address) DO UPDATE SET
    failed_attempts = magic_link_rate_limits.failed_attempts + 1,
    last_attempt_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_magic_link_rate_limit(p_ip_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM magic_link_rate_limits WHERE ip_address = p_ip_address;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_magic_link_rate_limit(p_ip_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record magic_link_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_record 
  FROM magic_link_rate_limits 
  WHERE ip_address = p_ip_address;
  
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'blocked_until', v_record.blocked_until,
      'attempts', v_record.failed_attempts
    );
  END IF;
  
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until <= v_now THEN
    DELETE FROM magic_link_rate_limits WHERE ip_address = p_ip_address;
    RETURN jsonb_build_object('allowed', true, 'attempts', 0);
  END IF;
  
  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'attempts', 0);
  END IF;
  
  IF v_record.first_attempt_at < v_now - interval '15 minutes' THEN
    DELETE FROM magic_link_rate_limits WHERE ip_address = p_ip_address;
    RETURN jsonb_build_object('allowed', true, 'attempts', 0);
  END IF;
  
  IF v_record.failed_attempts >= 5 THEN
    UPDATE magic_link_rate_limits 
    SET blocked_until = v_now + interval '1 hour'
    WHERE ip_address = p_ip_address;
    
    RETURN jsonb_build_object(
      'allowed', false, 
      'blocked_until', v_now + interval '1 hour',
      'attempts', v_record.failed_attempts
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'attempts', v_record.failed_attempts);
END;
$$;