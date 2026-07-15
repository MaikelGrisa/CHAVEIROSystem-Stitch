
-- 1) Relax global unique constraints so the same catalog can live in every org
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_codigo_key;
DROP INDEX IF EXISTS public.products_codigo_unique;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE public.product_references DROP CONSTRAINT IF EXISTS product_references_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS products_org_codigo_uniq
  ON public.products(organization_id, codigo) WHERE codigo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_org_sku_uniq
  ON public.products(organization_id, sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_references_org_name_uniq
  ON public.product_references(organization_id, name);

-- 2) Backfill: copy full catalog from source org to every other org (idempotent)
DO $$
DECLARE
  src_org uuid := '00000000-0000-0000-0000-000000000001';
  o record;
BEGIN
  FOR o IN SELECT id FROM public.organizations WHERE id <> src_org LOOP
    INSERT INTO public.product_references (name, purchase_price, organization_id)
    SELECT pr.name, pr.purchase_price, o.id
    FROM public.product_references pr
    WHERE pr.organization_id = src_org
    ON CONFLICT (organization_id, name) DO NOTHING;

    INSERT INTO public.products
      (sku, name, supplier, category, purchase_price, sale_price, stock,
       codigo, codigo_fornecedor, marca, referencia, organization_id)
    SELECT
      CASE WHEN p.sku IS NULL THEN NULL ELSE p.sku || '-' || substr(o.id::text,1,4) END,
      p.name, p.supplier, p.category, p.purchase_price, p.sale_price, 0,
      p.codigo, p.codigo_fornecedor, p.marca, p.referencia, o.id
    FROM public.products p
    WHERE p.organization_id = src_org
      AND NOT EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.organization_id = o.id
          AND p2.codigo IS NOT DISTINCT FROM p.codigo
          AND p2.name = p.name
      );
  END LOOP;
END$$;

-- 3) Replication triggers: any change in any org mirrors to all other orgs.
--    Match rows across orgs by codigo when present, otherwise by name.

CREATE OR REPLACE FUNCTION public.replicate_products()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record;
BEGIN
  IF current_setting('app.replicating_catalog', true) = '1' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  PERFORM set_config('app.replicating_catalog', '1', true);

  IF TG_OP = 'INSERT' THEN
    FOR o IN SELECT id FROM public.organizations WHERE id <> NEW.organization_id LOOP
      INSERT INTO public.products
        (sku, name, supplier, category, purchase_price, sale_price, stock,
         codigo, codigo_fornecedor, marca, referencia, organization_id)
      SELECT
        CASE WHEN NEW.sku IS NULL THEN NULL ELSE NEW.sku || '-' || substr(o.id::text,1,4) END,
        NEW.name, NEW.supplier, NEW.category, NEW.purchase_price, NEW.sale_price, 0,
        NEW.codigo, NEW.codigo_fornecedor, NEW.marca, NEW.referencia, o.id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.organization_id = o.id
          AND p.codigo IS NOT DISTINCT FROM NEW.codigo
          AND p.name = NEW.name
      );
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.products p SET
      name = NEW.name,
      supplier = NEW.supplier,
      category = NEW.category,
      purchase_price = NEW.purchase_price,
      sale_price = NEW.sale_price,
      codigo = NEW.codigo,
      codigo_fornecedor = NEW.codigo_fornecedor,
      marca = NEW.marca,
      referencia = NEW.referencia,
      updated_at = now()
    WHERE p.organization_id <> NEW.organization_id
      AND (
        (OLD.codigo IS NOT NULL AND p.codigo = OLD.codigo)
        OR (OLD.codigo IS NULL AND p.codigo IS NULL AND p.name = OLD.name)
      );

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.products p
    WHERE p.organization_id <> OLD.organization_id
      AND (
        (OLD.codigo IS NOT NULL AND p.codigo = OLD.codigo)
        OR (OLD.codigo IS NULL AND p.codigo IS NULL AND p.name = OLD.name)
      );
  END IF;

  PERFORM set_config('app.replicating_catalog', '0', true);
  RETURN COALESCE(NEW, OLD);
END$$;

DROP TRIGGER IF EXISTS tr_replicate_products ON public.products;
CREATE TRIGGER tr_replicate_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.replicate_products();

CREATE OR REPLACE FUNCTION public.replicate_product_references()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record;
BEGIN
  IF current_setting('app.replicating_catalog', true) = '1' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  PERFORM set_config('app.replicating_catalog', '1', true);

  IF TG_OP = 'INSERT' THEN
    FOR o IN SELECT id FROM public.organizations WHERE id <> NEW.organization_id LOOP
      INSERT INTO public.product_references (name, purchase_price, organization_id)
      VALUES (NEW.name, NEW.purchase_price, o.id)
      ON CONFLICT (organization_id, name) DO NOTHING;
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.product_references r SET
      name = NEW.name,
      purchase_price = NEW.purchase_price,
      updated_at = now()
    WHERE r.organization_id <> NEW.organization_id
      AND r.name = OLD.name;

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.product_references r
    WHERE r.organization_id <> OLD.organization_id
      AND r.name = OLD.name;
  END IF;

  PERFORM set_config('app.replicating_catalog', '0', true);
  RETURN COALESCE(NEW, OLD);
END$$;

DROP TRIGGER IF EXISTS tr_replicate_product_references ON public.product_references;
CREATE TRIGGER tr_replicate_product_references
AFTER INSERT OR UPDATE OR DELETE ON public.product_references
FOR EACH ROW EXECUTE FUNCTION public.replicate_product_references();

-- 4) When a new organization is created, seed it with the full catalog
CREATE OR REPLACE FUNCTION public.seed_new_org_catalog()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  src_org uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NEW.id = src_org THEN RETURN NEW; END IF;
  PERFORM set_config('app.replicating_catalog', '1', true);

  INSERT INTO public.product_references (name, purchase_price, organization_id)
  SELECT pr.name, pr.purchase_price, NEW.id
  FROM public.product_references pr
  WHERE pr.organization_id = src_org
  ON CONFLICT (organization_id, name) DO NOTHING;

  INSERT INTO public.products
    (sku, name, supplier, category, purchase_price, sale_price, stock,
     codigo, codigo_fornecedor, marca, referencia, organization_id)
  SELECT
    CASE WHEN p.sku IS NULL THEN NULL ELSE p.sku || '-' || substr(NEW.id::text,1,4) END,
    p.name, p.supplier, p.category, p.purchase_price, p.sale_price, 0,
    p.codigo, p.codigo_fornecedor, p.marca, p.referencia, NEW.id
  FROM public.products p
  WHERE p.organization_id = src_org;

  PERFORM set_config('app.replicating_catalog', '0', true);
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS tr_seed_new_org_catalog ON public.organizations;
CREATE TRIGGER tr_seed_new_org_catalog
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.seed_new_org_catalog();

-- 5) The existing sync_product_purchase_prices trigger updates products across
--    all orgs by referencia name, which is compatible with replication — leave as is.
