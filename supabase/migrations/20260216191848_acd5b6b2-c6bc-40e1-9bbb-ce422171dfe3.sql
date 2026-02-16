
-- Create department-to-account mappings table
CREATE TABLE public.department_account_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_pattern TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_pattern)
);

-- Enable RLS
ALTER TABLE public.department_account_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin/operator access)
CREATE POLICY "Operators and admins can view department_account_mappings"
ON public.department_account_mappings FOR SELECT
USING (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operators and admins can insert department_account_mappings"
ON public.department_account_mappings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operators and admins can update department_account_mappings"
ON public.department_account_mappings FOR UPDATE
USING (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete department_account_mappings"
ON public.department_account_mappings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_department_account_mappings_updated_at
BEFORE UPDATE ON public.department_account_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
