-- 1) Stop public reads of full bookings table (PII)
DROP POLICY IF EXISTS "Anyone can view booking by tracking code" ON public.bookings;

-- 2) Tighten calendar_sync_tokens access: allow each signed-in user to access ONLY their own tokens
-- (keep the existing admin policy so admins can still manage everything)
DROP POLICY IF EXISTS "Users can view own calendar sync tokens" ON public.calendar_sync_tokens;
CREATE POLICY "Users can view own calendar sync tokens"
ON public.calendar_sync_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own calendar sync tokens" ON public.calendar_sync_tokens;
CREATE POLICY "Users can insert own calendar sync tokens"
ON public.calendar_sync_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own calendar sync tokens" ON public.calendar_sync_tokens;
CREATE POLICY "Users can update own calendar sync tokens"
ON public.calendar_sync_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calendar sync tokens" ON public.calendar_sync_tokens;
CREATE POLICY "Users can delete own calendar sync tokens"
ON public.calendar_sync_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
