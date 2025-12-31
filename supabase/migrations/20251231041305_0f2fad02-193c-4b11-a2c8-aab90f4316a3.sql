-- Create artist_services table (services customized per artist)
CREATE TABLE IF NOT EXISTS public.artist_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 240,
  deposit_amount INTEGER NOT NULL DEFAULT 100,
  hourly_rate INTEGER,
  buffer_before_min INTEGER NOT NULL DEFAULT 15,
  buffer_after_min INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, service_key)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_artist_services_artist ON public.artist_services(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_services_workspace ON public.artist_services(workspace_id);

-- Enable RLS
ALTER TABLE public.artist_services ENABLE ROW LEVEL SECURITY;

-- Artists can view and manage their own services
CREATE POLICY "Artists can view their services"
  ON public.artist_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_artists sa
      WHERE sa.id = artist_id AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can insert their services"
  ON public.artist_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studio_artists sa
      WHERE sa.id = artist_id AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can update their services"
  ON public.artist_services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_artists sa
      WHERE sa.id = artist_id AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can delete their services"
  ON public.artist_services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_artists sa
      WHERE sa.id = artist_id AND sa.user_id = auth.uid()
    )
  );

-- Studio owners/managers can view all services in their workspace
CREATE POLICY "Workspace admins can view all services"
  ON public.artist_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_settings ws
      WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage all services"
  ON public.artist_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_settings ws
      WHERE ws.id = workspace_id AND ws.owner_user_id = auth.uid()
    )
  );

-- Add workspace_id to studio_policies
ALTER TABLE public.studio_policies 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspace_settings(id);

-- Create index for artist policies lookup
CREATE INDEX IF NOT EXISTS idx_studio_policies_artist ON public.studio_policies(artist_id);
CREATE INDEX IF NOT EXISTS idx_studio_policies_workspace ON public.studio_policies(workspace_id);

-- Create updated_at trigger for artist_services
CREATE OR REPLACE FUNCTION public.update_artist_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artist_services_timestamp
  BEFORE UPDATE ON public.artist_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_artist_services_updated_at();