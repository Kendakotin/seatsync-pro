
-- Fix seats table: restrict to operators and admins only
DROP POLICY IF EXISTS "Authenticated users can view seats" ON public.seats;

CREATE POLICY "Operators and admins can view seats"
ON public.seats FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Fix new_hires table: restrict to operators and admins only
DROP POLICY IF EXISTS "Authenticated users can view new_hires" ON public.new_hires;

CREATE POLICY "Operators and admins can view new_hires"
ON public.new_hires FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'operator') OR 
  public.has_role(auth.uid(), 'admin')
);
