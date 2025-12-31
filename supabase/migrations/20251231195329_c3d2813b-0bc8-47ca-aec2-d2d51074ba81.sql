-- Fix: chat_conversations exposed to anon via USING (true)

-- 1) Drop overly permissive anonymous policies (by explicit name)
DROP POLICY IF EXISTS "Allow anonymous chat conversation read by session" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow anonymous chat conversation creation" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow anonymous chat conversation update" ON public.chat_conversations;

DROP POLICY IF EXISTS "Allow anonymous chat message read" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow anonymous chat message creation" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow anonymous chat message update" ON public.chat_messages;

-- 2) Ensure RLS is enabled
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3) Replace with session-scoped access (anon can only access own conversation/messages)
-- We scope by the x-session-id header set by the client.

CREATE POLICY "Anon can create own conversation (session-scoped)"
ON public.chat_conversations
FOR INSERT
TO anon
WITH CHECK (
  session_id IS NOT NULL
  AND session_id <> ''
  AND session_id = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
);

CREATE POLICY "Anon can view own conversation (session-scoped)"
ON public.chat_conversations
FOR SELECT
TO anon
USING (
  session_id IS NOT NULL
  AND session_id <> ''
  AND session_id = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
);

CREATE POLICY "Anon can update own conversation (session-scoped)"
ON public.chat_conversations
FOR UPDATE
TO anon
USING (
  session_id IS NOT NULL
  AND session_id <> ''
  AND session_id = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
)
WITH CHECK (
  session_id IS NOT NULL
  AND session_id <> ''
  AND session_id = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
);

-- Messages: allow anon to read/write only if the message's conversation belongs to their session
CREATE POLICY "Anon can view own chat messages (via conversation session)"
ON public.chat_messages
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.session_id IS NOT NULL
      AND c.session_id <> ''
      AND c.session_id = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
  )
);

CREATE POLICY "Anon can create own chat messages (via conversation session)"
ON public.chat_messages
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.session_id IS NOT NULL
      AND c.session_id <> ''
      AND c.session_id = COALESCE(current_setting('request.headers', true)::json->>'x-session-id', '')
  )
);

-- 4) Authenticated staff access (admins/managers/artists) can view all conversations/messages
-- Note: uses existing user_roles table.
CREATE POLICY "Staff can view all conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin','manager','artist')
  )
);

CREATE POLICY "Staff can view all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin','manager','artist')
  )
);
