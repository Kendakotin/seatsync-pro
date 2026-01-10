-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a table to store sync schedule settings
CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cron_expression TEXT NOT NULL DEFAULT '0 */6 * * *', -- Every 6 hours by default
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage sync schedules" 
ON public.sync_schedules 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can view sync schedules" 
ON public.sync_schedules 
FOR SELECT 
USING (public.has_role(auth.uid(), 'operator'));

-- Add trigger for updated_at
CREATE TRIGGER update_sync_schedules_updated_at
BEFORE UPDATE ON public.sync_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Intune sync schedule
INSERT INTO public.sync_schedules (name, cron_expression, enabled)
VALUES ('intune_device_sync', '0 */6 * * *', true)
ON CONFLICT (name) DO NOTHING;

-- Create the cron job to call the intune-sync edge function every 6 hours
-- Using pg_net to make HTTP request to the edge function
SELECT cron.schedule(
  'intune-device-sync-job',
  '0 */6 * * *', -- Every 6 hours (at minute 0)
  $$
  SELECT extensions.http_post(
    url := 'https://jqvqyabkswlufahmloqh.supabase.co/functions/v1/intune-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  
  UPDATE public.sync_schedules 
  SET last_run_at = now() 
  WHERE name = 'intune_device_sync';
  $$
);