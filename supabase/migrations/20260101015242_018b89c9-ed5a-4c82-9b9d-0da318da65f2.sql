-- PHASE 1: FOUNDATIONAL DATA MIGRATION (CORRECTED)
-- =====================================================

-- 1.1 Add missing columns to client_profiles for tracking
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS first_booking_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_booking_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';

-- 1.2 Add display_order to gallery_images if not exists
ALTER TABLE public.gallery_images ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 1.3 Create a function to auto-create client_profiles from bookings
CREATE OR REPLACE FUNCTION public.auto_create_client_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_client UUID;
  v_normalized_email TEXT;
  v_email_hash TEXT;
BEGIN
  -- Normalize email
  v_normalized_email := LOWER(TRIM(NEW.email));
  v_email_hash := encode(sha256(v_normalized_email::bytea), 'hex');
  
  -- Check if client already exists
  SELECT id INTO v_existing_client 
  FROM public.client_profiles 
  WHERE email = v_normalized_email 
  LIMIT 1;
  
  -- If not exists, create new client profile
  IF v_existing_client IS NULL THEN
    INSERT INTO public.client_profiles (
      email,
      email_hash,
      full_name,
      first_booking_at,
      last_booking_at,
      total_bookings,
      source,
      session_count
    ) VALUES (
      v_normalized_email,
      v_email_hash,
      NEW.name,
      NEW.created_at,
      NEW.created_at,
      1,
      COALESCE(NEW.source, 'website'),
      0
    );
  ELSE
    -- Update existing client
    UPDATE public.client_profiles 
    SET 
      last_booking_at = NEW.created_at,
      total_bookings = COALESCE(total_bookings, 0) + 1,
      full_name = COALESCE(full_name, NEW.name)
    WHERE id = v_existing_client;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto client profile creation
DROP TRIGGER IF EXISTS trg_auto_create_client_profile ON public.bookings;
CREATE TRIGGER trg_auto_create_client_profile
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_client_profile();

-- 1.4 Create a function to auto-create healing_progress when booking is completed
CREATE OR REPLACE FUNCTION public.auto_create_healing_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_client_profile_id UUID;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Find client profile
    SELECT id INTO v_client_profile_id 
    FROM public.client_profiles 
    WHERE email = LOWER(TRIM(NEW.email))
    LIMIT 1;
    
    -- Create day 1 healing progress entry
    IF v_client_profile_id IS NOT NULL THEN
      INSERT INTO public.healing_progress (
        booking_id,
        client_profile_id,
        day_number,
        ai_healing_stage,
        requires_attention
      ) VALUES (
        NEW.id,
        v_client_profile_id,
        1,
        'fresh',
        false
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto healing progress
DROP TRIGGER IF EXISTS trg_auto_create_healing_entry ON public.bookings;
CREATE TRIGGER trg_auto_create_healing_entry
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_healing_entry();

-- 1.5 Migrate existing bookings to client_profiles
INSERT INTO public.client_profiles (email, email_hash, full_name, first_booking_at, last_booking_at, total_bookings, source, session_count)
SELECT 
  LOWER(TRIM(email)),
  encode(sha256(LOWER(TRIM(email))::bytea), 'hex'),
  MAX(name),
  MIN(created_at),
  MAX(created_at),
  COUNT(*),
  'website',
  0
FROM public.bookings
WHERE email IS NOT NULL AND TRIM(email) != ''
GROUP BY LOWER(TRIM(email))
ON CONFLICT (email) DO UPDATE SET
  total_bookings = EXCLUDED.total_bookings,
  last_booking_at = EXCLUDED.last_booking_at;

-- 1.6 Enable realtime for critical tables (idempotent)
DO $$ 
BEGIN
  -- These may already be enabled, so we use DO block to handle errors
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.healing_progress;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 1.7 Create finance dashboard view
CREATE OR REPLACE VIEW public.finance_dashboard_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE deposit_paid = true) as total_deposits_received,
  COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid = true), 0) as total_deposit_amount,
  COALESCE(SUM(total_paid), 0) as total_revenue,
  COUNT(*) FILTER (WHERE deposit_paid = false AND status NOT IN ('cancelled', 'rejected')) as pending_deposits,
  COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid = false AND status NOT IN ('cancelled', 'rejected')), 0) as pending_deposit_amount,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  DATE_TRUNC('month', created_at) as month
FROM public.bookings
GROUP BY DATE_TRUNC('month', created_at);

-- 1.8 Create studio analytics view
CREATE OR REPLACE VIEW public.studio_analytics_view AS
SELECT 
  DATE_TRUNC('month', b.created_at) as month,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE b.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled,
  COALESCE(SUM(b.deposit_amount) FILTER (WHERE b.deposit_paid = true), 0) as revenue,
  COUNT(DISTINCT b.email) as unique_clients,
  ROUND(AVG(CASE WHEN b.deposit_paid THEN 1 ELSE 0 END) * 100, 2) as deposit_conversion_rate
FROM public.bookings b
GROUP BY DATE_TRUNC('month', b.created_at);