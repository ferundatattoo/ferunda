-- =====================================================
-- CUSTOMER PORTAL DATABASE MIGRATION
-- Complete schema for secure customer portal
-- =====================================================

-- 1. CUSTOMER MESSAGES TABLE
CREATE TABLE public.customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'artist')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  fingerprint_hash TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all customer messages"
ON public.customer_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. CUSTOMER PAYMENTS TABLE
CREATE TABLE public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'partial', 'final', 'tip')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'link_generated', 'completed', 'failed', 'expired', 'refunded')),
  payment_link_id TEXT,
  payment_link_url TEXT,
  payment_link_expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  external_transaction_id TEXT,
  fingerprint_hash TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all customer payments"
ON public.customer_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. RESCHEDULE REQUESTS TABLE (fixed reserved word)
CREATE TABLE public.reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  original_date DATE,
  original_time TEXT,
  requested_date DATE,
  requested_time TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  admin_notes TEXT,
  fingerprint_hash TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reschedule requests"
ON public.reschedule_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. CUSTOMER PORTAL SESSIONS TABLE
CREATE TABLE public.customer_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  session_token_hash TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT
);

ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all portal sessions"
ON public.customer_portal_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. CUSTOMER PORTAL RATE LIMITS TABLE
CREATE TABLE public.customer_portal_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_count INTEGER DEFAULT 1,
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  UNIQUE(booking_id, action_type)
);

ALTER TABLE public.customer_portal_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limits"
ON public.customer_portal_rate_limits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. MODIFY BOOKINGS TABLE
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_images_customer JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_customer_activity TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unread_customer_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_portal_enabled BOOLEAN DEFAULT true;

-- 7. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_customer_messages_booking_id ON public.customer_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_created_at ON public.customer_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_payments_booking_id ON public.customer_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON public.customer_payments(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking_id ON public.reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON public.reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_booking_id ON public.customer_portal_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token_hash ON public.customer_portal_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_rate_limits_booking_action ON public.customer_portal_rate_limits(booking_id, action_type);

-- 8. FUNCTION: Check customer rate limits
CREATE OR REPLACE FUNCTION public.check_customer_rate_limit(
  p_booking_id UUID,
  p_action_type TEXT,
  p_max_actions INTEGER,
  p_window_minutes INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record customer_portal_rate_limits%ROWTYPE;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  SELECT * INTO v_record 
  FROM customer_portal_rate_limits 
  WHERE booking_id = p_booking_id AND action_type = p_action_type;
  
  IF NOT FOUND THEN
    INSERT INTO customer_portal_rate_limits (booking_id, action_type, window_start, action_count)
    VALUES (p_booking_id, p_action_type, now(), 1)
    ON CONFLICT (booking_id, action_type) DO UPDATE SET action_count = customer_portal_rate_limits.action_count + 1;
    
    RETURN QUERY SELECT true, 1, now() + (p_window_minutes || ' minutes')::INTERVAL;
    RETURN;
  END IF;
  
  IF v_record.is_blocked AND v_record.blocked_until > now() THEN
    RETURN QUERY SELECT false, v_record.action_count, v_record.blocked_until;
    RETURN;
  END IF;
  
  IF v_record.window_start < v_window_start THEN
    UPDATE customer_portal_rate_limits 
    SET window_start = now(), action_count = 1, is_blocked = false, blocked_until = NULL
    WHERE id = v_record.id;
    
    RETURN QUERY SELECT true, 1, now() + (p_window_minutes || ' minutes')::INTERVAL;
    RETURN;
  END IF;
  
  IF v_record.action_count >= p_max_actions THEN
    UPDATE customer_portal_rate_limits 
    SET is_blocked = true, blocked_until = now() + (p_window_minutes * 2 || ' minutes')::INTERVAL
    WHERE id = v_record.id;
    
    RETURN QUERY SELECT false, v_record.action_count, now() + (p_window_minutes * 2 || ' minutes')::INTERVAL;
    RETURN;
  END IF;
  
  UPDATE customer_portal_rate_limits 
  SET action_count = action_count + 1
  WHERE id = v_record.id;
  
  RETURN QUERY SELECT true, v_record.action_count + 1, v_record.window_start + (p_window_minutes || ' minutes')::INTERVAL;
END;
$$;

-- 9. FUNCTION: Get customer permissions
CREATE OR REPLACE FUNCTION public.get_customer_permissions(p_pipeline_stage TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;

-- 10. TRIGGER: Update updated_at on customer_payments
CREATE TRIGGER update_customer_payments_updated_at
BEFORE UPDATE ON public.customer_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Create storage bucket for customer references (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-references', 
  'customer-references', 
  false, 
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-references bucket
CREATE POLICY "Admins can manage all customer references"
ON storage.objects FOR ALL
USING (bucket_id = 'customer-references' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can upload to customer-references with valid path"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-references' 
  AND (storage.foldername(name))[1] IS NOT NULL
);