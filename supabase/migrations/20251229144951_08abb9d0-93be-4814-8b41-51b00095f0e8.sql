-- Create healing-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'healing-photos',
  'healing-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for healing photos
CREATE POLICY "Authenticated users can upload healing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'healing-photos');

CREATE POLICY "Healing photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'healing-photos');

CREATE POLICY "Users can update their own healing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'healing-photos');

CREATE POLICY "Users can delete their own healing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'healing-photos');