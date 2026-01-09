
-- Drop existing permissive policies and replace with authenticated user policies
-- This fixes the security warnings about overly permissive RLS policies

-- accounts table
DROP POLICY IF EXISTS "Allow public delete access" ON public.accounts;
DROP POLICY IF EXISTS "Allow public insert access" ON public.accounts;
DROP POLICY IF EXISTS "Allow public read access" ON public.accounts;
DROP POLICY IF EXISTS "Allow public update access" ON public.accounts;

CREATE POLICY "Authenticated users can view accounts"
ON public.accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert accounts"
ON public.accounts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update accounts"
ON public.accounts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete accounts"
ON public.accounts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- seats table
DROP POLICY IF EXISTS "Allow public delete access" ON public.seats;
DROP POLICY IF EXISTS "Allow public insert access" ON public.seats;
DROP POLICY IF EXISTS "Allow public read access" ON public.seats;
DROP POLICY IF EXISTS "Allow public update access" ON public.seats;

CREATE POLICY "Authenticated users can view seats"
ON public.seats FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert seats"
ON public.seats FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update seats"
ON public.seats FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete seats"
ON public.seats FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- hardware_assets table
DROP POLICY IF EXISTS "Allow public delete access" ON public.hardware_assets;
DROP POLICY IF EXISTS "Allow public insert access" ON public.hardware_assets;
DROP POLICY IF EXISTS "Allow public read access" ON public.hardware_assets;
DROP POLICY IF EXISTS "Allow public update access" ON public.hardware_assets;

CREATE POLICY "Authenticated users can view hardware_assets"
ON public.hardware_assets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert hardware_assets"
ON public.hardware_assets FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update hardware_assets"
ON public.hardware_assets FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hardware_assets"
ON public.hardware_assets FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- software_licenses table
DROP POLICY IF EXISTS "Allow public delete access" ON public.software_licenses;
DROP POLICY IF EXISTS "Allow public insert access" ON public.software_licenses;
DROP POLICY IF EXISTS "Allow public read access" ON public.software_licenses;
DROP POLICY IF EXISTS "Allow public update access" ON public.software_licenses;

CREATE POLICY "Authenticated users can view software_licenses"
ON public.software_licenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert software_licenses"
ON public.software_licenses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update software_licenses"
ON public.software_licenses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete software_licenses"
ON public.software_licenses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- new_hires table
DROP POLICY IF EXISTS "Allow public delete access" ON public.new_hires;
DROP POLICY IF EXISTS "Allow public insert access" ON public.new_hires;
DROP POLICY IF EXISTS "Allow public read access" ON public.new_hires;
DROP POLICY IF EXISTS "Allow public update access" ON public.new_hires;

CREATE POLICY "Authenticated users can view new_hires"
ON public.new_hires FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert new_hires"
ON public.new_hires FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update new_hires"
ON public.new_hires FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete new_hires"
ON public.new_hires FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- maintenance_records table
DROP POLICY IF EXISTS "Allow public delete access" ON public.maintenance_records;
DROP POLICY IF EXISTS "Allow public insert access" ON public.maintenance_records;
DROP POLICY IF EXISTS "Allow public read access" ON public.maintenance_records;
DROP POLICY IF EXISTS "Allow public update access" ON public.maintenance_records;

CREATE POLICY "Authenticated users can view maintenance_records"
ON public.maintenance_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert maintenance_records"
ON public.maintenance_records FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update maintenance_records"
ON public.maintenance_records FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete maintenance_records"
ON public.maintenance_records FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- security_incidents table
DROP POLICY IF EXISTS "Allow public delete access" ON public.security_incidents;
DROP POLICY IF EXISTS "Allow public insert access" ON public.security_incidents;
DROP POLICY IF EXISTS "Allow public read access" ON public.security_incidents;
DROP POLICY IF EXISTS "Allow public update access" ON public.security_incidents;

CREATE POLICY "Authenticated users can view security_incidents"
ON public.security_incidents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators and admins can insert security_incidents"
ON public.security_incidents FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators and admins can update security_incidents"
ON public.security_incidents FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete security_incidents"
ON public.security_incidents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs table - read only for users, service role can insert
DROP POLICY IF EXISTS "Allow public insert access" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public read access" ON public.audit_logs;

CREATE POLICY "Authenticated users can view audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can insert audit_logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- settings table
DROP POLICY IF EXISTS "Allow public insert access" ON public.settings;
DROP POLICY IF EXISTS "Allow public read access" ON public.settings;
DROP POLICY IF EXISTS "Allow public update access" ON public.settings;

CREATE POLICY "Authenticated users can view settings"
ON public.settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert settings"
ON public.settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
