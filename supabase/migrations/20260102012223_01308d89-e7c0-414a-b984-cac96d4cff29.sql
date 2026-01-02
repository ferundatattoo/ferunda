-- FASE 1.2: Make security_audit_log append-only (remove delete capability)
DROP POLICY IF EXISTS "Admins can delete security logs" ON public.security_audit_log;

-- Create prevention trigger for DELETE and UPDATE on security logs
CREATE OR REPLACE FUNCTION public.prevent_security_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security logs are append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_security_log_delete ON public.security_audit_log;
CREATE TRIGGER prevent_security_log_delete
  BEFORE DELETE OR UPDATE ON public.security_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_security_log_modification();

-- FASE 1.3: Create sensitive data access audit table
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT
);

-- Enable RLS on sensitive data access log
ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from triggers)
CREATE POLICY "Service role can insert access logs"
  ON public.sensitive_data_access_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view but not modify
CREATE POLICY "Admins can view access logs"
  ON public.sensitive_data_access_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Make sensitive data access log append-only too
CREATE TRIGGER prevent_sensitive_log_modification
  BEFORE DELETE OR UPDATE ON public.sensitive_data_access_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_security_log_modification();

-- FASE 3.1: Add rate limiting function for large exports (informational - actual limit enforced in app)
CREATE OR REPLACE FUNCTION public.check_export_rate_limit(user_uuid UUID, table_target TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count recent large queries from this user in last hour
  SELECT COUNT(*) INTO recent_count
  FROM public.sensitive_data_access_log
  WHERE user_id = user_uuid
    AND table_name = table_target
    AND accessed_at > now() - INTERVAL '1 hour';
  
  -- Allow max 10 large exports per hour per user
  RETURN recent_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;