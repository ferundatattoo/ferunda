-- Add voice cloning columns to ai_avatar_clones
ALTER TABLE ai_avatar_clones ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;
ALTER TABLE ai_avatar_clones ADD COLUMN IF NOT EXISTS voice_clone_status TEXT DEFAULT 'pending';
ALTER TABLE ai_avatar_clones ADD COLUMN IF NOT EXISTS voice_samples_urls TEXT[];
ALTER TABLE ai_avatar_clones ADD COLUMN IF NOT EXISTS voice_preview_url TEXT;
ALTER TABLE ai_avatar_clones ADD COLUMN IF NOT EXISTS consent_video_url TEXT;
ALTER TABLE ai_avatar_clones ADD COLUMN IF NOT EXISTS training_video_url TEXT;

-- Create voice-samples storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for voice-samples bucket
CREATE POLICY "Users can upload voice samples"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-samples');

CREATE POLICY "Users can view their voice samples"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voice-samples');

CREATE POLICY "Users can delete their voice samples"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-samples');