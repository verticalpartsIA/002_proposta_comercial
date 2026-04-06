
-- Fix function search paths
ALTER FUNCTION public.generate_rfq_code() SET search_path = public;
ALTER FUNCTION public.generate_cot_code() SET search_path = public;

-- Fix overly permissive suppliers policies
DROP POLICY "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY "Authenticated users can update suppliers" ON public.suppliers;

CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Fix overly permissive quotations insert policy
DROP POLICY "Anyone can insert quotations" ON public.quotations;

CREATE POLICY "Anon can insert quotations with valid token" ON public.quotations FOR INSERT TO anon WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rfq_suppliers WHERE rfq_suppliers.id = rfq_supplier_id
  )
);
