-- Fix overly permissive RLS SELECT policies for sensitive tables
-- This restricts read access based on user roles

-- 1. AUDIT_LOGS - Should only be readable by admins
DROP POLICY IF EXISTS "Authenticated users can view audit_logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. SECURITY_INCIDENTS - Should only be readable by operators and admins
DROP POLICY IF EXISTS "Authenticated users can view security_incidents" ON public.security_incidents;

CREATE POLICY "Operators and admins can view security_incidents"
ON public.security_incidents FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);

-- 3. SOFTWARE_LICENSES - Restrict to operators and admins (contains license keys)
DROP POLICY IF EXISTS "Authenticated users can view software_licenses" ON public.software_licenses;

CREATE POLICY "Operators and admins can view software_licenses"
ON public.software_licenses FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);

-- 4. MAINTENANCE_RECORDS - Restrict to operators and admins
DROP POLICY IF EXISTS "Authenticated users can view maintenance_records" ON public.maintenance_records;

CREATE POLICY "Operators and admins can view maintenance_records"
ON public.maintenance_records FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);

-- 5. HARDWARE_ASSETS - Restrict to operators and admins (contains serial numbers, security posture)
DROP POLICY IF EXISTS "Authenticated users can view hardware_assets" ON public.hardware_assets;

CREATE POLICY "Operators and admins can view hardware_assets"
ON public.hardware_assets FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);

-- 6. ACCOUNTS - Restrict to operators and admins (contains client data)
DROP POLICY IF EXISTS "Authenticated users can view accounts" ON public.accounts;

CREATE POLICY "Operators and admins can view accounts"
ON public.accounts FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);