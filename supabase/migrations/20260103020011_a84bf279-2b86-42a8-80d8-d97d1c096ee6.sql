-- Hardware Assets table
CREATE TABLE public.hardware_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_tag TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL DEFAULT 'Workstation',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  specs JSONB DEFAULT '{}',
  image_version TEXT,
  antivirus_status TEXT DEFAULT 'Active',
  encryption_status BOOLEAN DEFAULT false,
  usb_policy_applied BOOLEAN DEFAULT false,
  warranty_expiry DATE,
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  status TEXT DEFAULT 'Available',
  assigned_seat_id UUID,
  assigned_agent TEXT,
  site TEXT,
  floor TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Software Licenses table
CREATE TABLE public.software_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  software_name TEXT NOT NULL,
  vendor TEXT,
  license_type TEXT DEFAULT 'Named',
  license_key TEXT,
  total_seats INTEGER DEFAULT 1,
  used_seats INTEGER DEFAULT 0,
  expiry_date DATE,
  cost_per_seat DECIMAL(10,2),
  account_id UUID,
  is_client_provided BOOLEAN DEFAULT false,
  compliance_status TEXT DEFAULT 'Compliant',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts/Programs table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  required_software JSONB DEFAULT '[]',
  required_hardware_specs JSONB DEFAULT '{}',
  security_controls JSONB DEFAULT '[]',
  approved_image_version TEXT,
  go_live_date DATE,
  status TEXT DEFAULT 'Active',
  total_seats INTEGER DEFAULT 0,
  active_seats INTEGER DEFAULT 0,
  compliance_score INTEGER DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seats table
CREATE TABLE public.seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seat_id TEXT NOT NULL UNIQUE,
  account_id UUID REFERENCES public.accounts(id),
  site TEXT,
  floor TEXT,
  row TEXT,
  position TEXT,
  shift TEXT DEFAULT 'Day',
  assigned_agent TEXT,
  pc_asset_id UUID REFERENCES public.hardware_assets(id),
  headset_id TEXT,
  phone_id TEXT,
  monitor_id TEXT,
  network_port TEXT,
  vlan TEXT,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- New Hires table
CREATE TABLE public.new_hires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  hire_date DATE NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  assigned_seat_id UUID REFERENCES public.seats(id),
  pc_imaged BOOLEAN DEFAULT false,
  software_installed BOOLEAN DEFAULT false,
  headset_issued BOOLEAN DEFAULT false,
  account_access_provisioned BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance Records table
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.hardware_assets(id),
  seat_id UUID REFERENCES public.seats(id),
  issue_type TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open',
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  technician TEXT,
  downtime_minutes INTEGER DEFAULT 0,
  repair_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security Incidents table
CREATE TABLE public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_type TEXT NOT NULL,
  severity TEXT DEFAULT 'Medium',
  asset_id UUID REFERENCES public.hardware_assets(id),
  seat_id UUID REFERENCES public.seats(id),
  description TEXT,
  status TEXT DEFAULT 'Open',
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  reported_by TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  performed_by TEXT,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hardware_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_hires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create public read policies for now (can be restricted later with auth)
CREATE POLICY "Allow public read access" ON public.hardware_assets FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.hardware_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.hardware_assets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.hardware_assets FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.software_licenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.software_licenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.software_licenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.software_licenses FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.accounts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.accounts FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.seats FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.seats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.seats FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.seats FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.new_hires FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.new_hires FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.new_hires FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.new_hires FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.maintenance_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.maintenance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.maintenance_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.maintenance_records FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.security_incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.security_incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.security_incidents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.security_incidents FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.settings FOR UPDATE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_hardware_assets_updated_at BEFORE UPDATE ON public.hardware_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_software_licenses_updated_at BEFORE UPDATE ON public.software_licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON public.seats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_new_hires_updated_at BEFORE UPDATE ON public.new_hires FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON public.security_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();