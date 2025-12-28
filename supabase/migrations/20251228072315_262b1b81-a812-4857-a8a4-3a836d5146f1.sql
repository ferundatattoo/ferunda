-- Create chat_conversations table to track all conversations
CREATE TABLE public.chat_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    message_count integer NOT NULL DEFAULT 0,
    converted boolean NOT NULL DEFAULT false,
    conversion_type text, -- 'booking_click', 'whatsapp_click', 'email_click'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table to track individual messages for analysis
CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL, -- 'user' or 'assistant'
    content text NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for tracking (no sensitive data exposed)
CREATE POLICY "Allow public insert on chat_conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public insert on chat_messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Allow public update on conversations for marking conversions
CREATE POLICY "Allow public update on chat_conversations" 
ON public.chat_conversations 
FOR UPDATE 
USING (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view all conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all messages" 
ON public.chat_messages 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete conversations" 
ON public.chat_conversations 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete messages" 
ON public.chat_messages 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));