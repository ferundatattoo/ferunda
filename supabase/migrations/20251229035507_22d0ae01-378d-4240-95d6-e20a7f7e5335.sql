-- 1) Make reference-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'reference-images';

-- 2) Drop overly permissive policies
DROP POLICY IF EXISTS "Allow public uploads to reference-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to reference-images" ON storage.objects;

-- 3) Create scoped upload policy (still allows booking wizard uploads but with folder constraint)
CREATE POLICY "Scoped uploads to reference-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reference-images'
  AND (storage.foldername(name))[1] = 'bookings'
);

-- 4) Admins can view all reference images
CREATE POLICY "Admins can view reference-images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reference-images'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 5) Admins can delete reference images
CREATE POLICY "Admins can delete reference-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reference-images'
  AND has_role(auth.uid(), 'admin'::app_role)
);