-- Add SELECT policy for public access to bookings folder
CREATE POLICY "Public can view booking reference images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reference-images'
  AND (storage.foldername(name))[1] = 'bookings'
);