-- Create chat-uploads bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for uploading chat images (anyone can upload)
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-uploads');

-- RLS policy for reading chat images (anyone can view)
CREATE POLICY "Anyone can read chat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-uploads');