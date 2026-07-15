
-- Migração 2/2: multi-tenancy completo
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  street TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#eab308',
  delete_pin TEXT DEFAULT '1234',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.organizations (id, name, slug, primary_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'Chaveiro TOP', 'chaveiro-top', '#eab308')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customers             ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.expenses              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.movements             ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.products              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.product_references    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.receipts              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.service_orders        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.purchase_list_items   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.app_settings          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.profiles            SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.customers           SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.expenses            SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.movements           SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.products            SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.product_references  SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.receipts            SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.service_orders      SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.purchase_list_items SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.app_settings        SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE public.profiles           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.customers          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.expenses           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.movements          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.products           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.product_references ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.receipts           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.service_orders     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.purchase_list_items ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.app_settings ADD PRIMARY KEY (organization_id, key);

CREATE INDEX IF NOT EXISTS idx_customers_org           ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org            ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_movements_org           ON public.movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org            ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_references_org  ON public.product_references(organization_id);
CREATE INDEX IF NOT EXISTS idx_receipts_org            ON public.receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_org      ON public.service_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_list_items_org ON public.purchase_list_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org            ON public.profiles(organization_id);

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1 $$;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') $$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO postgres, service_role;

DROP POLICY IF EXISTS "org select"  ON public.organizations;
DROP POLICY IF EXISTS "org update"  ON public.organizations;
DROP POLICY IF EXISTS "org insert"  ON public.organizations;
DROP POLICY IF EXISTS "org delete"  ON public.organizations;

CREATE POLICY "org select" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_super_admin() OR id = public.current_org_id());
CREATE POLICY "org insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "org update" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR (id = public.current_org_id() AND public.has_role(auth.uid(),'admin')))
  WITH CHECK (public.is_super_admin() OR (id = public.current_org_id() AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "org delete" ON public.organizations FOR DELETE TO authenticated
  USING (public.is_super_admin());

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customers','expenses','movements','products','product_references',
    'receipts','service_orders','purchase_list_items','app_settings'
  ]) LOOP
    EXECUTE format('DO $inner$ DECLARE p RECORD; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname=''public'' AND tablename=%L LOOP EXECUTE format(''DROP POLICY IF EXISTS %%I ON public.%I'', p.policyname); END LOOP; END $inner$;', t, t);
    EXECUTE format('CREATE POLICY "tenant select %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_super_admin() OR organization_id = public.current_org_id())', t);
    EXECUTE format('CREATE POLICY "tenant insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_super_admin() OR organization_id = public.current_org_id())', t);
    EXECUTE format('CREATE POLICY "tenant update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_super_admin() OR organization_id = public.current_org_id()) WITH CHECK (public.is_super_admin() OR organization_id = public.current_org_id())', t);
    EXECUTE format('CREATE POLICY "tenant delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_super_admin() OR organization_id = public.current_org_id())', t);
  END LOOP;
END $$;

DO $inner$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p.policyname);
  END LOOP;
END $inner$;
CREATE POLICY "profiles select" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin() OR (organization_id = public.current_org_id() AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "profiles update" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin() OR (organization_id = public.current_org_id() AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "profiles insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR user_id = auth.uid());

DO $inner$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', p.policyname);
  END LOOP;
END $inner$;
CREATE POLICY "roles select" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = user_roles.user_id AND pr.organization_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "roles write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT; is_first BOOLEAN; target_org UUID; target_role app_role; dname TEXT;
BEGIN
  SELECT count(*) INTO user_count FROM public.user_roles;
  is_first := (user_count = 0);
  dname := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  target_org := NULLIF(NEW.raw_user_meta_data->>'organization_id','')::UUID;
  IF target_org IS NULL THEN target_org := '00000000-0000-0000-0000-000000000001'::UUID; END IF;
  IF is_first THEN target_role := 'super_admin';
  ELSE target_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'user')::app_role;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, target_role);
  INSERT INTO public.profiles(user_id, display_name, email, provider, approved, organization_id)
    VALUES (NEW.id, dname, NEW.email, COALESCE(NEW.raw_app_meta_data->>'provider','email'), true, target_org);
  RETURN NEW;
END; $$;

DO $$
DECLARE uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'go.plus.digital@chaveirotop.local';
  IF uid IS NULL THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated','authenticated',
      'go.plus.digital@chaveirotop.local',
      crypt('GO5780', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}', false
    );
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'super_admin');
    UPDATE public.profiles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE user_id = uid;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'super_admin');
  END IF;
END $$;
