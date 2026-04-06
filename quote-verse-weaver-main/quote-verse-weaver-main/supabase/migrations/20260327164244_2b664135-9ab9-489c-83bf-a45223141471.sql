
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Status enum for RFQs
CREATE TYPE public.rfq_status AS ENUM ('draft', 'sent', 'quoting', 'ai_analysis', 'closed', 'cancelled', 'auto_closed');

-- Profiles table for buyers
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT DEFAULT 'VerticalParts',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  flag TEXT NOT NULL DEFAULT '🏳️',
  email TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  rating NUMERIC(2,1) DEFAULT 0,
  total_quotes INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (true);

-- RFQs table
CREATE TABLE public.rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  dimensions TEXT,
  weight TEXT,
  material TEXT,
  certifications TEXT,
  packaging TEXT,
  usage_context TEXT,
  supplier_code TEXT,
  category TEXT,
  status public.rfq_status NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity INTEGER NOT NULL DEFAULT 1,
  deadline DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own RFQs" ON public.rfqs FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can insert own RFQs" ON public.rfqs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own RFQs" ON public.rfqs FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Junction table: RFQ <-> Suppliers
CREATE TABLE public.rfq_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES public.rfqs(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  secure_token TEXT NOT NULL DEFAULT md5(gen_random_uuid()::text || gen_random_uuid()::text),
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, supplier_id)
);

ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rfq_suppliers" ON public.rfq_suppliers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rfqs WHERE rfqs.id = rfq_suppliers.rfq_id AND rfqs.created_by = auth.uid())
);
CREATE POLICY "Users can insert own rfq_suppliers" ON public.rfq_suppliers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.rfqs WHERE rfqs.id = rfq_suppliers.rfq_id AND rfqs.created_by = auth.uid())
);

-- Quotations table (suppliers submit via public token - anon access)
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES public.rfqs(id) ON DELETE CASCADE NOT NULL,
  rfq_supplier_id UUID REFERENCES public.rfq_suppliers(id) ON DELETE CASCADE NOT NULL,
  cot_code TEXT NOT NULL UNIQUE,
  unit_price NUMERIC(12,4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  moq INTEGER NOT NULL DEFAULT 1,
  production_days INTEGER,
  delivery_days INTEGER,
  incoterm TEXT,
  validity_days INTEGER DEFAULT 30,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  observations TEXT,
  score NUMERIC(5,2),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Authenticated buyers can see quotations for their RFQs
CREATE POLICY "Users can view quotations for own RFQs" ON public.quotations FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.rfqs
    JOIN public.rfq_suppliers ON rfq_suppliers.rfq_id = rfqs.id
    WHERE rfq_suppliers.id = quotations.rfq_supplier_id AND rfqs.created_by = auth.uid()
  )
);

-- Anonymous suppliers can insert quotations via secure token (validated in app logic)
CREATE POLICY "Anyone can insert quotations" ON public.quotations FOR INSERT TO anon WITH CHECK (true);

-- Sequence for RFQ codes
CREATE SEQUENCE public.rfq_code_seq START 43;

-- Function to generate next RFQ code
CREATE OR REPLACE FUNCTION public.generate_rfq_code()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT 'RFQ-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.rfq_code_seq')::TEXT, 4, '0')
$$;

-- Sequence for quotation codes
CREATE SEQUENCE public.cot_code_seq START 83;

CREATE OR REPLACE FUNCTION public.generate_cot_code()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT 'COT-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.cot_code_seq')::TEXT, 4, '0')
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
