-- Add booking_id to healing_progress for linking to specific bookings
ALTER TABLE public.healing_progress ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_healing_progress_booking_id ON public.healing_progress(booking_id);

-- Create healing_certificates table
CREATE TABLE public.healing_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  certificate_data jsonb DEFAULT '{}'::jsonb,
  final_health_score numeric,
  total_photos integer DEFAULT 0,
  healing_duration_days integer DEFAULT 0,
  download_url text,
  certificate_number text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on healing_certificates
ALTER TABLE public.healing_certificates ENABLE ROW LEVEL SECURITY;

-- RLS policies for healing_certificates
CREATE POLICY "Admins can manage healing certificates"
ON public.healing_certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers view own certificates via bound session"
ON public.healing_certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = healing_certificates.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- Add RLS policy for customers to view their own healing progress
CREATE POLICY "Customers view own healing progress via bound session"
ON public.healing_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_portal_sessions cps
    WHERE cps.booking_id = healing_progress.booking_id
    AND cps.is_active = true
    AND cps.expires_at > now()
    AND cps.invalidated_at IS NULL
  )
);

-- Create index for certificate lookups
CREATE INDEX idx_healing_certificates_booking_id ON public.healing_certificates(booking_id);

-- Generate unique certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.certificate_number := 'FT-HC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_certificate_number
BEFORE INSERT ON public.healing_certificates
FOR EACH ROW
EXECUTE FUNCTION generate_certificate_number();