-- Drop trigger first, then function
DROP TRIGGER IF EXISTS security_anomaly_detection_trigger ON public.security_logs;
DROP FUNCTION IF EXISTS public.detect_security_anomalies() CASCADE;

-- Create new version of detect_security_anomalies
CREATE OR REPLACE FUNCTION public.detect_security_anomalies()
RETURNS TABLE(
  anomaly_type TEXT,
  severity TEXT,
  description TEXT,
  affected_count BIGINT,
  details JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Detect brute force attempts
  RETURN QUERY
  SELECT 
    'brute_force_attempt'::TEXT,
    'critical'::TEXT,
    'Multiple failed attempts from same IP in last hour'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('ip_address', ip_address)
  FROM security_logs
  WHERE event_type LIKE '%failed%'
    AND created_at > now() - interval '1 hour'
  GROUP BY ip_address
  HAVING COUNT(*) > 10;
  
  -- Detect rate limit abuse
  RETURN QUERY
  SELECT 
    'rate_limit_abuse'::TEXT,
    'high'::TEXT,
    'IP blocked multiple times in last 24 hours'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('identifier_hash', identifier_hash)
  FROM global_rate_limits
  WHERE is_blocked = true
    AND last_action_at > now() - interval '24 hours'
  GROUP BY identifier_hash
  HAVING COUNT(*) > 3;
  
  -- Detect honeypot activity
  RETURN QUERY
  SELECT 
    'honeypot_activity'::TEXT,
    'high'::TEXT,
    'Bot activity detected via honeypot'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('trigger_type', trigger_type)
  FROM honeypot_triggers
  WHERE created_at > now() - interval '24 hours'
  GROUP BY trigger_type
  HAVING COUNT(*) > 5;
  
  -- Detect suspicious fingerprints
  RETURN QUERY
  SELECT 
    'suspicious_fingerprint'::TEXT,
    'warning'::TEXT,
    'High-risk device fingerprint detected'::TEXT,
    COUNT(*)::BIGINT,
    jsonb_build_object('fingerprint_hash', fingerprint_hash, 'risk_score', MAX(risk_score))
  FROM device_fingerprints
  WHERE is_suspicious = true
    AND last_seen_at > now() - interval '24 hours'
  GROUP BY fingerprint_hash;
END;
$$;

-- Update bookings policy
DROP POLICY IF EXISTS "Anyone can submit a booking request" ON public.bookings;
DROP POLICY IF EXISTS "Validated public can submit booking" ON public.bookings;

CREATE POLICY "Validated public can submit booking"
ON public.bookings FOR INSERT
WITH CHECK (
  email IS NOT NULL AND 
  LENGTH(TRIM(email)) >= 5 AND 
  name IS NOT NULL AND
  LENGTH(TRIM(name)) >= 2 AND
  tattoo_description IS NOT NULL AND
  LENGTH(TRIM(tattoo_description)) >= 10
);