CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES ('next_receipt_number', '505'::jsonb);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_id TEXT UNIQUE NOT NULL, -- CPF or CNPJ
  name TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number INTEGER NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  customer_data JSONB NOT NULL, -- Snapshot at time of print
  items JSONB NOT NULL, -- List of items from movements
  total_amount NUMERIC(10,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT ALL ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.receipts FOR ALL TO authenticated USING (true);
