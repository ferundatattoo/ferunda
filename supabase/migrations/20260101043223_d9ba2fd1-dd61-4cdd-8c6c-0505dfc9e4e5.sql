-- Create follow-up queue table for smart nurturing
CREATE TABLE IF NOT EXISTS public.follow_up_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  template_key TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.follow_up_queue ENABLE ROW LEVEL SECURITY;

-- Admin can manage all follow-ups
CREATE POLICY "Admins can manage follow_up_queue" 
ON public.follow_up_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_status_scheduled 
ON public.follow_up_queue(status, scheduled_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_follow_up_queue_booking 
ON public.follow_up_queue(booking_id);

-- Add trigger for updated_at
CREATE TRIGGER update_follow_up_queue_updated_at
BEFORE UPDATE ON public.follow_up_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add escalation_events table if not exists
CREATE TABLE IF NOT EXISTS public.escalation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id UUID,
  severity TEXT NOT NULL DEFAULT 'medium',
  reason TEXT NOT NULL,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on escalation_events
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;

-- Admin policy for escalation_events
CREATE POLICY "Admins can manage escalation_events" 
ON public.escalation_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add trigger for updated_at on escalation_events
CREATE TRIGGER update_escalation_events_updated_at
BEFORE UPDATE ON public.escalation_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();