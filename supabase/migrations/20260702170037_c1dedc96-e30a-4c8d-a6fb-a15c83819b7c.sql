
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_organization_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_organization_id_fkey;
ALTER TABLE public.movements ADD CONSTRAINT movements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_organization_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.product_references DROP CONSTRAINT IF EXISTS product_references_organization_id_fkey;
ALTER TABLE public.product_references ADD CONSTRAINT product_references_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_organization_id_fkey;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_organization_id_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_organization_id_fkey;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_organization_id_fkey;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_list_items DROP CONSTRAINT IF EXISTS purchase_list_items_organization_id_fkey;
ALTER TABLE public.purchase_list_items ADD CONSTRAINT purchase_list_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
