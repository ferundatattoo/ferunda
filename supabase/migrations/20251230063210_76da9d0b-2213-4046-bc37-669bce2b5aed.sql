-- Drop remaining public policies if any exist
DROP POLICY IF EXISTS "Public can view conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Public can insert conversations" ON public.chat_conversations;

-- Create the missing policies (using IF NOT EXISTS pattern via drop first)
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.chat_conversations;
CREATE POLICY "Anyone can create conversations"
ON public.chat_conversations
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete conversations" ON public.chat_conversations;
CREATE POLICY "Admins can delete conversations"
ON public.chat_conversations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));