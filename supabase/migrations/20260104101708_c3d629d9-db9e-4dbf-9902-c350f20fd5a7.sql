-- Add client_profile_id to client_documents for leads without bookings
ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE;

-- Make booking_id optional (nullable) so documents can be attached to profiles directly
ALTER TABLE public.client_documents 
ALTER COLUMN booking_id DROP NOT NULL;

-- Add session_id to track which conversation the document came from
ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.concierge_sessions(id) ON DELETE SET NULL;

-- Add extracted_text for parsed document content
ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_documents_client_profile ON public.client_documents(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_session ON public.client_documents(session_id);

-- Create conversation_insights table for key aspects
CREATE TABLE IF NOT EXISTS public.conversation_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  
  -- Key aspects extracted from conversation
  tattoo_idea TEXT,
  preferred_style TEXT[],
  body_placement TEXT,
  size_estimate TEXT,
  color_preference TEXT,
  budget_range TEXT,
  timeline_preference TEXT,
  special_requests TEXT,
  concerns TEXT[],
  
  -- AI-generated summary
  conversation_summary TEXT,
  intent_detected TEXT,
  lead_quality_score INTEGER,
  
  -- Conversion tracking
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_type TEXT, -- 'booking', 'consultation', 'waitlist'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_insights (workspace members can view)
CREATE POLICY "Workspace members can view conversation insights"
ON public.conversation_insights
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.concierge_sessions cs
    JOIN public.workspace_members wm ON wm.workspace_id = cs.workspace_id
    WHERE cs.id = conversation_insights.session_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can insert conversation insights"
ON public.conversation_insights
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.concierge_sessions cs
    JOIN public.workspace_members wm ON wm.workspace_id = cs.workspace_id
    WHERE cs.id = session_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can update conversation insights"
ON public.conversation_insights
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.concierge_sessions cs
    JOIN public.workspace_members wm ON wm.workspace_id = cs.workspace_id
    WHERE cs.id = conversation_insights.session_id
    AND wm.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_insights_session ON public.conversation_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_insights_client ON public.conversation_insights(client_profile_id);

-- Update trigger for updated_at
CREATE OR REPLACE TRIGGER update_conversation_insights_updated_at
BEFORE UPDATE ON public.conversation_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();