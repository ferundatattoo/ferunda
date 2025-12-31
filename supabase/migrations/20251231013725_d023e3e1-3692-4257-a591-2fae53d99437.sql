-- Make the reference-images bucket public so images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'reference-images';

-- Drop the restrictive scoped upload policy
DROP POLICY IF EXISTS "Scoped uploads to reference-images" ON storage.objects;

-- Create a more permissive policy for concierge uploads
CREATE POLICY "Anyone can upload to reference-images concierge folder"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'reference-images' 
  AND (storage.foldername(name))[1] IN ('bookings', 'concierge')
);