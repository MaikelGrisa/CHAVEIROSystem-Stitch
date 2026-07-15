
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create role on signup: first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  supplier TEXT,
  category TEXT,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Movements
CREATE TYPE public.movement_type AS ENUM ('in', 'out');

CREATE TABLE public.movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.movement_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movements TO authenticated;
GRANT ALL ON public.movements TO service_role;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read movements" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert movements" ON public.movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Auth update own movements" ON public.movements FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin/owner delete movements" ON public.movements FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_movements_occurred_at ON public.movements(occurred_at DESC);
CREATE INDEX idx_movements_product ON public.movements(product_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
