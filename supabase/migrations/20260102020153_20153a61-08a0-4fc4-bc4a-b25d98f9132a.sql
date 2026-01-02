-- FASE 2: Agregar columna status a chat_conversations si no existe
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

-- Crear índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);

-- FASE 1: Crear studio_artists faltantes para workspaces solo con todos los campos requeridos
INSERT INTO public.studio_artists (id, workspace_id, user_id, name, display_name, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ws.id,
  wm.user_id,
  COALESCE(
    (SELECT display_name FROM public.artist_profiles WHERE user_id = wm.user_id LIMIT 1),
    'Artista Principal'
  ),
  COALESCE(
    (SELECT display_name FROM public.artist_profiles WHERE user_id = wm.user_id LIMIT 1),
    'Artista Principal'
  ),
  true,
  now(),
  now()
FROM public.workspace_settings ws
JOIN public.workspace_members wm ON wm.workspace_id = ws.id
WHERE ws.workspace_type = 'solo'
  AND wm.artist_id IS NULL
  AND wm.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.studio_artists sa 
    WHERE sa.workspace_id = ws.id AND sa.user_id = wm.user_id
  );

-- Actualizar workspace_members.artist_id con el studio_artists.id correcto
UPDATE public.workspace_members wm
SET artist_id = sa.id
FROM public.studio_artists sa
JOIN public.workspace_settings ws ON ws.id = sa.workspace_id
WHERE wm.workspace_id = sa.workspace_id
  AND wm.user_id = sa.user_id
  AND ws.workspace_type = 'solo'
  AND wm.artist_id IS NULL;