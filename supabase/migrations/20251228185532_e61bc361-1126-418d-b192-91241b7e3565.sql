-- Add tracking code column for customers to check status
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(8) UNIQUE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_price VARCHAR(50),
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;

-- Create function to generate tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tracking_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate tracking code on insert
DROP TRIGGER IF EXISTS set_tracking_code ON public.bookings;
CREATE TRIGGER set_tracking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_tracking_code();

-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-images', 'reference-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads to reference-images bucket
CREATE POLICY "Allow public uploads to reference-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'reference-images');

-- Allow public read access to reference-images
CREATE POLICY "Allow public read access to reference-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reference-images');