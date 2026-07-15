ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_tax_id_key;
DROP INDEX IF EXISTS public.customers_tax_id_key;
ALTER TABLE public.customers ADD CONSTRAINT customers_org_tax_id_key UNIQUE (organization_id, tax_id);