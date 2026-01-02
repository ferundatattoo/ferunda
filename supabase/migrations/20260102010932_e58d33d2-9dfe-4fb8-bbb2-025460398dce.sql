-- Add google_event_id to bookings table for calendar integration
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add sender_id and metadata columns to omnichannel_messages for proper message tracking
ALTER TABLE omnichannel_messages 
  ADD COLUMN IF NOT EXISTS sender_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster conversation grouping
CREATE INDEX IF NOT EXISTS idx_omnichannel_conversation_id ON omnichannel_messages(channel_conversation_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_channel ON omnichannel_messages(channel);