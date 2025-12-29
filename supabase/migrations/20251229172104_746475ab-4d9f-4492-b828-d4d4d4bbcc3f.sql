-- Allow anonymous users to insert chat conversations (public chat feature)
CREATE POLICY "Allow anonymous chat conversation creation"
ON public.chat_conversations
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read their own conversations by session_id
CREATE POLICY "Allow anonymous chat conversation read by session"
ON public.chat_conversations
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to update their own conversations
CREATE POLICY "Allow anonymous chat conversation update"
ON public.chat_conversations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to insert chat messages
CREATE POLICY "Allow anonymous chat message creation"
ON public.chat_messages
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read chat messages
CREATE POLICY "Allow anonymous chat message read"
ON public.chat_messages
FOR SELECT
TO anon
USING (true);