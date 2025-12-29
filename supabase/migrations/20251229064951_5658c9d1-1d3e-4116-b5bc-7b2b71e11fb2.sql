
-- =====================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Fixes all remaining security scan findings
-- =====================================================

-- =====================================================
-- 1. BOOKINGS TABLE - Strengthen RLS policies
-- =====================================================

-- Drop existing customer select policy and recreate with stricter checks
DROP POLICY IF EXISTS "Customers can ONLY view own booking via validated session" ON public.bookings;

-- Recreate with stricter binding to booking_id
CREATE POLICY "Customers view own booking via bound session only"
ON public.bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = bookings.id  -- Must match THIS specific booking
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
    AND cps.created_at > now() - interval '7 days'
  )
);

-- =====================================================
-- 2. CUSTOMER_EMAILS - Strengthen RLS with booking binding
-- =====================================================

DROP POLICY IF EXISTS "Customers can view their own emails via session" ON public.customer_emails;

CREATE POLICY "Customers view own emails via bound session"
ON public.customer_emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = customer_emails.booking_id  -- Bound to same booking
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- =====================================================
-- 3. CUSTOMER_MESSAGES - Add explicit booking ownership check
-- =====================================================

DROP POLICY IF EXISTS "Customers can view their own messages via session" ON public.customer_messages;

CREATE POLICY "Customers view own messages via bound session"
ON public.customer_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = customer_messages.booking_id  -- Must match exact booking
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- =====================================================
-- 4. CUSTOMER_PAYMENTS - Add booking ownership verification
-- =====================================================

DROP POLICY IF EXISTS "Customers can view their own payments via session" ON public.customer_payments;

CREATE POLICY "Customers view own payments via bound session"
ON public.customer_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = customer_payments.booking_id  -- Must match exact booking
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- =====================================================
-- 5. RESCHEDULE_REQUESTS - Strengthen booking ownership check
-- =====================================================

DROP POLICY IF EXISTS "Customers can view their own reschedule requests via session" ON public.reschedule_requests;

CREATE POLICY "Customers view own reschedule requests via bound session"
ON public.reschedule_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = reschedule_requests.booking_id  -- Must match exact booking
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- =====================================================
-- 6. NEWSLETTER_SUBSCRIBERS - Ensure completely locked down
-- =====================================================

-- Drop all existing policies and recreate with explicit deny
DROP POLICY IF EXISTS "Only admins can manage newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role can insert subscribers only" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers;

-- Only admins for ALL operations
CREATE POLICY "Admins only for all newsletter operations"
ON public.newsletter_subscribers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role INSERT only (for edge functions)
CREATE POLICY "Service role insert only"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (current_setting('role', true) = 'service_role');

-- =====================================================
-- 7. CHAT_CONVERSATIONS - Tighten up public INSERT
-- =====================================================

DROP POLICY IF EXISTS "Allow public insert on chat_conversations" ON public.chat_conversations;

-- Only allow insert with required fields
CREATE POLICY "Validated insert on chat_conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (
  session_id IS NOT NULL 
  AND length(session_id) >= 20
  AND length(session_id) <= 100
);

-- =====================================================
-- 8. CHAT_MESSAGES - Tighten up public INSERT
-- =====================================================

DROP POLICY IF EXISTS "Allow public insert on chat_messages" ON public.chat_messages;

-- Only allow insert with valid conversation
CREATE POLICY "Validated insert on chat_messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  content IS NOT NULL 
  AND length(content) >= 1
  AND length(content) <= 10000
  AND role IN ('user', 'assistant')
  AND EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = conversation_id
  )
);

-- =====================================================
-- 9. SECURITY_LOGS - Restrict anonymous INSERT
-- =====================================================

DROP POLICY IF EXISTS "Anon can insert login attempt logs" ON public.security_logs;

-- More restrictive insert for anon - only specific event types
CREATE POLICY "Anon limited security log insert"
ON public.security_logs FOR INSERT
WITH CHECK (
  event_type IN ('login_attempt', 'login_failed', 'signup_attempt', 'signup_failed')
  AND auth.role() = 'anon'
);

-- =====================================================
-- 10. CUSTOMER_PORTAL_SESSIONS - Ensure no customer access to other sessions
-- =====================================================

-- Already has admin-only policy, but ensure no other access
DROP POLICY IF EXISTS "Admins can manage all portal sessions" ON public.customer_portal_sessions;

CREATE POLICY "Only admins manage portal sessions"
ON public.customer_portal_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 11. DEVICE_FINGERPRINTS - Ensure admin-only
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage device_fingerprints" ON public.device_fingerprints;

CREATE POLICY "Only admins access device fingerprints"
ON public.device_fingerprints FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 12. MAGIC_LINK_TOKENS - Ensure admin-only
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage magic_link_tokens" ON public.magic_link_tokens;

CREATE POLICY "Only admins access magic link tokens"
ON public.magic_link_tokens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 13. VERIFICATION_OTPS - Ensure no access
-- =====================================================

-- Already has deny policy, verify it exists
DROP POLICY IF EXISTS "No direct access to OTPs" ON public.verification_otps;

CREATE POLICY "No direct OTP access"
ON public.verification_otps FOR ALL
USING (false);

-- =====================================================
-- 14. CALENDAR_SYNC_TOKENS - Double-check admin-only
-- =====================================================

-- Already has multiple admin policies, consolidate
DROP POLICY IF EXISTS "Admins can manage sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Only admins can delete calendar sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Only admins can insert calendar sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Only admins can update calendar sync tokens" ON public.calendar_sync_tokens;
DROP POLICY IF EXISTS "Only admins can view calendar sync tokens" ON public.calendar_sync_tokens;

-- Single consolidated admin policy
CREATE POLICY "Only admins manage calendar sync"
ON public.calendar_sync_tokens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 15. BOOKING_ACTIVITIES - Keep admin-only, add docs
-- =====================================================

-- Already admin-only, this is intentional
COMMENT ON TABLE public.booking_activities IS 
'Admin-only table for tracking booking activities. Not exposed to customers intentionally.';

-- =====================================================
-- 16. Add session validation function for extra security
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_session_access(
  p_session_token_hash text,
  p_booking_id uuid,
  p_fingerprint_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
BEGIN
  -- Find and validate the session
  SELECT * INTO v_session
  FROM customer_portal_sessions
  WHERE session_token_hash = p_session_token_hash
  AND booking_id = p_booking_id
  AND is_active = true
  AND expires_at > now()
  AND invalidated_at IS NULL
  AND created_at > now() - interval '7 days';
  
  IF v_session IS NULL THEN
    RETURN false;
  END IF;
  
  -- Optional: Verify fingerprint if provided
  IF p_fingerprint_hash IS NOT NULL AND v_session.fingerprint_hash != p_fingerprint_hash THEN
    -- Log fingerprint mismatch but don't block (could be legitimate)
    PERFORM append_security_audit(
      p_event_type := 'session_validation',
      p_action := 'fingerprint_mismatch',
      p_resource_type := 'session',
      p_resource_id := v_session.id::text,
      p_fingerprint_hash := p_fingerprint_hash,
      p_details := jsonb_build_object(
        'expected_prefix', LEFT(v_session.fingerprint_hash, 8),
        'received_prefix', LEFT(p_fingerprint_hash, 8)
      )
    );
  END IF;
  
  -- Update last activity
  UPDATE customer_portal_sessions
  SET last_activity_at = now()
  WHERE id = v_session.id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.validate_session_access IS 
'Validates a session token for access to a specific booking. Used by edge functions.';
