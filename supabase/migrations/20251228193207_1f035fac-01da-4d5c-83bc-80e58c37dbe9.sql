-- Create gallery images table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  section TEXT NOT NULL DEFAULT 'gallery',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Public can view visible images
CREATE POLICY "Anyone can view visible gallery images"
ON public.gallery_images
FOR SELECT
USING (is_visible = true);

-- Admins can manage all gallery images
CREATE POLICY "Admins can manage gallery images"
ON public.gallery_images
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_gallery_images_updated_at
BEFORE UPDATE ON public.gallery_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gallery bucket
CREATE POLICY "Gallery images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gallery-images');

CREATE POLICY "Admins can upload gallery images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gallery-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update gallery images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'gallery-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete gallery images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'gallery-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);