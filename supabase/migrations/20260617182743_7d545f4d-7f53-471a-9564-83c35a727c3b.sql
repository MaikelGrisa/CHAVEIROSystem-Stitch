
CREATE TYPE public.service_order_kind AS ENUM ('os', 'orcamento');
CREATE TYPE public.service_order_status AS ENUM ('aberta', 'em_andamento', 'concluida', 'entregue', 'aprovado', 'rejeitado', 'expirado', 'cancelada');

CREATE SEQUENCE IF NOT EXISTS public.service_orders_number_seq START 1;

CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL DEFAULT nextval('public.service_orders_number_seq') UNIQUE,
  kind public.service_order_kind NOT NULL DEFAULT 'os',
  status public.service_order_status NOT NULL DEFAULT 'aberta',
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_doc TEXT,
  customer_address TEXT,
  equipment TEXT,
  problem TEXT,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validity_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.service_orders_number_seq OWNED BY public.service_orders.number;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;
GRANT USAGE ON SEQUENCE public.service_orders_number_seq TO authenticated, service_role;

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view service_orders" ON public.service_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert service_orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update service_orders" ON public.service_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete service_orders" ON public.service_orders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_service_orders_touch BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
