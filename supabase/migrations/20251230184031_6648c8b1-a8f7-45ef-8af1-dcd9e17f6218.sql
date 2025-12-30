-- Add missing MIXTO columns to workspace_settings
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS notice_window_hours integer NOT NULL DEFAULT 72,
ADD COLUMN IF NOT EXISTS hold_minutes integer NOT NULL DEFAULT 15;