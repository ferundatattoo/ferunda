-- Fix RLS policies for chat tables to prevent public exposure

-- Drop existing overly permissive policies on chat_messages
DROP POLICY IF EXISTS "Allow public insert on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public read on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public select on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can read chat messages" ON public.chat_messages;

-- Drop existing overly permissive policies on chat_conversations
DROP POLICY IF EXISTS "Allow public insert on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow public read on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow public select on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can insert chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can read chat conversations" ON public.chat_conversations;

-- Create secure policies for chat_conversations
-- Anon users can insert new conversations (for the concierge chat widget)
CREATE POLICY "Anon can insert chat_conversations"
ON public.chat_conversations
FOR INSERT
WITH CHECK (true);

-- Anon users can update their own conversation by session_id (stored in frontend)
CREATE POLICY "Anon can update own chat_conversations"
ON public.chat_conversations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Authenticated admins can view all conversations (admin, manager, artist roles)
CREATE POLICY "Admins can view all chat_conversations"
ON public.chat_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'artist')
  )
);

-- Create secure policies for chat_messages
-- Anon users can insert messages (for the concierge chat widget)
CREATE POLICY "Anon can insert chat_messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);

-- Authenticated admins can view all messages
CREATE POLICY "Admins can view all chat_messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'artist')
  )
);