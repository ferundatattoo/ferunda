-- Add new columns to bookings table for comprehensive pipeline management
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'new_inquiry',
ADD COLUMN IF NOT EXISTS references_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS references_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS session_rate DECIMAL(10,2) DEFAULT 2500.00,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS scheduled_time TEXT DEFAULT '1:00 PM',
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';

-- Create activity log table for booking timeline
CREATE TABLE IF NOT EXISTS public.booking_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking_activities
CREATE POLICY "Admins can manage booking_activities"
ON public.booking_activities
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Admins can manage email_templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default email templates based on your actual workflow
INSERT INTO public.email_templates (name, subject, body, template_type) VALUES
('reference_request', 'Reference Images for Your Tattoo', 'Hi {{name}},

Thank you for reaching out about your tattoo project!

To help me create the perfect design for you, please send me a reference document (Word or PDF) that includes:

1. Clear reference images of the style/elements you want
2. Any specific details or symbolism to incorporate
3. Preferred placement and approximate size

You can reply to this email or send it to Fernando.moralesunda@gmail.com

Once I receive your references, we can discuss timing and scheduling.

Looking forward to creating something special for you!

- Fernando', 'booking'),

('deposit_request', 'Secure Your Appointment - Deposit Required', 'Hi {{name}},

Great news! I''d love to work on your piece.

To secure your appointment, a $500 deposit is required. You can pay via:
• Zelle: Fernando.moralesunda@gmail.com
• Clover: {{payment_link}}

Once I receive your deposit, please send me your:
- Full name (as it appears on ID)
- Email address
- Phone number

Your appointment will be at 1:00 PM at:
1834 E Oltorf St Ste 200
Austin, TX 78741

The full session rate is $2,500 (daily rate). The remaining balance is due on the day of your appointment.

Let me know if you have any questions!

- Fernando', 'booking'),

('appointment_confirmation', 'Your Tattoo Appointment is Confirmed!', 'Hi {{name}},

Your appointment is confirmed for {{date}} at 1:00 PM.

LOCATION:
1834 E Oltorf St Ste 200
Austin, TX 78741

WHAT TO BRING:
- Valid ID
- Remaining balance (${{balance}})
- Comfortable clothing that allows access to the tattoo area

BEFORE YOUR APPOINTMENT:
- Get a good night''s sleep
- Eat a full meal before arriving
- Stay hydrated
- Avoid alcohol 24 hours before

Feel free to call or text if you need to reach us. Johanna Castillo will be assisting.

See you soon!

- Fernando', 'booking'),

('follow_up', 'Following Up on Your Tattoo Inquiry', 'Hi {{name}},

I wanted to follow up on your tattoo inquiry. Have you had a chance to gather your reference images?

If you have any questions about the process or need more time, just let me know. I''m here to help!

- Fernando', 'booking')
ON CONFLICT (name) DO NOTHING;

-- Create index for faster activity queries
CREATE INDEX IF NOT EXISTS idx_booking_activities_booking_id ON public.booking_activities(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pipeline_stage ON public.bookings(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_bookings_follow_up_date ON public.bookings(follow_up_date);