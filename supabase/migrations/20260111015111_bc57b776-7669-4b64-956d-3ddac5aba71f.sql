-- Add new columns for system details to hardware_assets table
ALTER TABLE public.hardware_assets 
ADD COLUMN IF NOT EXISTS cpu text,
ADD COLUMN IF NOT EXISTS ram_gb numeric,
ADD COLUMN IF NOT EXISTS disk_type text,
ADD COLUMN IF NOT EXISTS disk_space_gb numeric,
ADD COLUMN IF NOT EXISTS last_user_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS logged_in_user text,
ADD COLUMN IF NOT EXISTS user_profile_count integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.hardware_assets.cpu IS 'CPU model/name (e.g., Intel Core i7-12700)';
COMMENT ON COLUMN public.hardware_assets.ram_gb IS 'Total RAM in gigabytes';
COMMENT ON COLUMN public.hardware_assets.disk_type IS 'Primary disk type (SSD, HDD, NVMe)';
COMMENT ON COLUMN public.hardware_assets.disk_space_gb IS 'Primary disk capacity in gigabytes';
COMMENT ON COLUMN public.hardware_assets.last_user_login IS 'Timestamp of last user login';
COMMENT ON COLUMN public.hardware_assets.logged_in_user IS 'Currently logged in user';
COMMENT ON COLUMN public.hardware_assets.user_profile_count IS 'Number of user profiles on this device';