-- Enable REPLICA IDENTITY for complete row data on existing tables
ALTER TABLE public.concierge_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.concierge_messages REPLICA IDENTITY FULL;
ALTER TABLE public.email_campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.deposit_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.customer_payments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_payments;

-- Create notifications table for live notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking', 'message', 'payment', 'alert', 'system', 'escalation')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Enable realtime on notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Index for fast notification queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);