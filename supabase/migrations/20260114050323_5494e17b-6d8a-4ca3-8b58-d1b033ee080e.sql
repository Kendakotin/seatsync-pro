-- Create table for registered devices (agent installations)
CREATE TABLE public.registered_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE, -- Hardware-based unique ID from the agent
  hostname TEXT,
  registration_key TEXT NOT NULL UNIQUE, -- Generated key for the device
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, revoked
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registered_devices ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage registered_devices"
ON public.registered_devices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Operators can view and approve
CREATE POLICY "Operators can view registered_devices"
ON public.registered_devices
FOR SELECT
USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can update registered_devices"
ON public.registered_devices
FOR UPDATE
USING (has_role(auth.uid(), 'operator'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_registered_devices_updated_at
BEFORE UPDATE ON public.registered_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();