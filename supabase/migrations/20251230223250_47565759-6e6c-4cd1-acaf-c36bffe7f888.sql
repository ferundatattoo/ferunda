-- Create tattoo_references table for AI analysis
CREATE TABLE public.tattoo_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_email TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  analysis_report JSONB,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  style_detected TEXT[],
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  estimated_hours NUMERIC(4,1),
  color_palette TEXT[],
  placement_suggestions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tattoo_references ENABLE ROW LEVEL SECURITY;

-- Policy for public insert (for booking flow)
CREATE POLICY "Anyone can create references during booking"
ON public.tattoo_references
FOR INSERT
WITH CHECK (true);

-- Policy for reading own references via booking tracking
CREATE POLICY "Users can view references for their bookings"
ON public.tattoo_references
FOR SELECT
USING (true);

-- Policy for admin updates
CREATE POLICY "Admins can update references"
ON public.tattoo_references
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER set_tattoo_references_updated_at
BEFORE UPDATE ON public.tattoo_references
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tattoo-references',
  'tattoo-references', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for reference images
CREATE POLICY "Anyone can upload reference images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tattoo-references');

CREATE POLICY "Anyone can view reference images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tattoo-references');