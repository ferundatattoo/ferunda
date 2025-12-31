-- Add concessions field to artist_capabilities for artist-defined exceptions
ALTER TABLE public.artist_capabilities
ADD COLUMN IF NOT EXISTS concessions JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.artist_capabilities.concessions IS 'Array of artist-defined exceptions/concessions. Structure: [{type: string, description: string, conditions: string, is_active: boolean}]';

-- Update Ferunda's capabilities with the single-color concession
UPDATE public.artist_capabilities
SET concessions = '[
  {
    "type": "single_solid_color",
    "description": "Puedo agregar UN solo color sólido (ej: ojos azules, detalles rojos) cuando el cliente lo solicite",
    "conditions": "Solo un color, aplicación simple, no degradados ni múltiples colores",
    "is_active": true
  }
]'::jsonb
WHERE artist_id IN (SELECT id FROM public.studio_artists WHERE is_active = true LIMIT 1);