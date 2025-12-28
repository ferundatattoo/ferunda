-- Fix chat_conversations UPDATE policy - restrict to session owner only
DROP POLICY IF EXISTS "Allow public update on chat_conversations" ON public.chat_conversations;

CREATE POLICY "Session owner can update own conversation" 
ON public.chat_conversations 
FOR UPDATE 
USING (session_id = current_setting('request.headers', true)::json->>'x-session-id')
WITH CHECK (session_id = current_setting('request.headers', true)::json->>'x-session-id');

-- Alternative: Only allow updating message_count and ended_at (not conversion data)
-- For now, we'll restrict updates to the frontend session

-- Add SELECT policy for chat_conversations so users can see their own
CREATE POLICY "Session owner can view own conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (session_id = current_setting('request.headers', true)::json->>'x-session-id');

-- Add SELECT policy for chat_messages so users can see their own messages
CREATE POLICY "Session owner can view own messages" 
ON public.chat_messages 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE session_id = current_setting('request.headers', true)::json->>'x-session-id'
  )
);

-- Add admin policies for user_roles management
CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));