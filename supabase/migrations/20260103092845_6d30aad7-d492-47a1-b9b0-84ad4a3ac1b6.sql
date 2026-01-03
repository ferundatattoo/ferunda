-- =============================================================================
-- PHASE 1: Migrate Luna data to Concierge tables
-- =============================================================================

-- Migrate chat_conversations → concierge_sessions
INSERT INTO concierge_sessions (
  id,
  stage,
  message_count,
  created_at,
  updated_at
)
SELECT 
  id,
  CASE WHEN converted THEN 'confirmed' ELSE 'discovery' END,
  message_count,
  started_at,
  COALESCE(ended_at, started_at)
FROM chat_conversations
ON CONFLICT (id) DO NOTHING;

-- Migrate chat_messages → concierge_messages
INSERT INTO concierge_messages (
  id,
  session_id,
  role,
  content,
  created_at
)
SELECT 
  id,
  conversation_id,
  role,
  content,
  created_at
FROM chat_messages
WHERE conversation_id IN (SELECT id FROM concierge_sessions)
ON CONFLICT (id) DO NOTHING;

-- Mark deprecated tables
COMMENT ON TABLE chat_conversations IS 'DEPRECATED: Migrated to concierge_sessions. Do not use.';
COMMENT ON TABLE chat_messages IS 'DEPRECATED: Migrated to concierge_messages. Do not use.';