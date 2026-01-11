-- Add hostname column to hardware_assets
ALTER TABLE public.hardware_assets ADD COLUMN IF NOT EXISTS hostname text;
COMMENT ON COLUMN public.hardware_assets.hostname IS 'Device hostname/computer name from Intune';