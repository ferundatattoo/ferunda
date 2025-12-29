-- Create table for client project notes (allergies, design ideas, special requests)
CREATE TABLE public.client_project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('allergy', 'medical', 'design_idea', 'special_request', 'placement_note')),
  content TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for client uploaded documents (placement photos, reference docs, etc.)
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('placement_photo', 'reference', 'inspiration', 'id_document', 'consent_form', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.client_project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_project_notes
-- Authenticated admin users can read all
CREATE POLICY "Admin users can read all project notes" 
ON public.client_project_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Authenticated admin users can insert/update
CREATE POLICY "Admin users can manage project notes" 
ON public.client_project_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow anonymous insert for customer portal (via edge function)
CREATE POLICY "Allow anonymous insert for customer portal" 
ON public.client_project_notes 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for client_documents
CREATE POLICY "Admin users can read all documents" 
ON public.client_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admin users can manage documents" 
ON public.client_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Allow anonymous insert for documents" 
ON public.client_documents 
FOR INSERT 
WITH CHECK (true);

-- Add updated_at trigger for client_project_notes
CREATE TRIGGER update_client_project_notes_updated_at
BEFORE UPDATE ON public.client_project_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_client_project_notes_booking ON public.client_project_notes(booking_id);
CREATE INDEX idx_client_documents_booking ON public.client_documents(booking_id);