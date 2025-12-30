-- Add new columns to tattoo_references for enhanced analysis
ALTER TABLE public.tattoo_references 
  ADD COLUMN IF NOT EXISTS body_part_detected JSONB,
  ADD COLUMN IF NOT EXISTS skin_analysis JSONB,
  ADD COLUMN IF NOT EXISTS technical_viability JSONB,
  ADD COLUMN IF NOT EXISTS style_match_ferunda JSONB,
  ADD COLUMN IF NOT EXISTS guidelines_compliance JSONB,
  ADD COLUMN IF NOT EXISTS recommendations JSONB,
  ADD COLUMN IF NOT EXISTS overall_decision TEXT,
  ADD COLUMN IF NOT EXISTS client_summary TEXT,
  ADD COLUMN IF NOT EXISTS artist_notes TEXT,
  ADD COLUMN IF NOT EXISTS image_quality TEXT,
  ADD COLUMN IF NOT EXISTS low_confidence BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB,
  ADD COLUMN IF NOT EXISTS processing_stage TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS size_estimate JSONB,
  ADD COLUMN IF NOT EXISTS color_usage TEXT;

-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-images', 
  'reference-images', 
  true, 
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- RLS policy for reference images - public read
DROP POLICY IF EXISTS "Reference images are publicly accessible" ON storage.objects;
CREATE POLICY "Reference images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'reference-images');

-- RLS policy for authenticated uploads
DROP POLICY IF EXISTS "Authenticated users can upload reference images" ON storage.objects;
CREATE POLICY "Authenticated users can upload reference images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reference-images');

-- RLS policy for updates
DROP POLICY IF EXISTS "Allow reference image updates" ON storage.objects;
CREATE POLICY "Allow reference image updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reference-images');

-- RLS policy for deletes
DROP POLICY IF EXISTS "Allow reference image deletes" ON storage.objects;
CREATE POLICY "Allow reference image deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'reference-images');