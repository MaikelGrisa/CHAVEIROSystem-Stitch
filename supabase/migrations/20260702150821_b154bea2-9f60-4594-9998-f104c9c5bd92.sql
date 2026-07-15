
-- Audit table for price changes across products and product_references.
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('product','product_reference')),
  entity_id uuid NOT NULL,
  entity_name text,
  field text NOT NULL CHECK (field IN ('sale_price','purchase_price')),
  old_value numeric,
  new_value numeric,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_history org read"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (organization_id = public.current_org_id() OR public.is_super_admin());

CREATE INDEX IF NOT EXISTS idx_price_history_org_entity
  ON public.price_history (organization_id, entity_type, entity_id, changed_at DESC);

-- Trigger: log every price change on products
CREATE OR REPLACE FUNCTION public.log_product_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sale_price IS DISTINCT FROM NEW.sale_price THEN
    INSERT INTO public.price_history(organization_id, entity_type, entity_id, entity_name, field, old_value, new_value, changed_by)
    VALUES (NEW.organization_id, 'product', NEW.id, NEW.name, 'sale_price', OLD.sale_price, NEW.sale_price, auth.uid());
  END IF;
  IF OLD.purchase_price IS DISTINCT FROM NEW.purchase_price THEN
    INSERT INTO public.price_history(organization_id, entity_type, entity_id, entity_name, field, old_value, new_value, changed_by)
    VALUES (NEW.organization_id, 'product', NEW.id, NEW.name, 'purchase_price', OLD.purchase_price, NEW.purchase_price, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_log_product_price_change ON public.products;
CREATE TRIGGER tr_log_product_price_change
AFTER UPDATE OF sale_price, purchase_price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_product_price_change();

-- Trigger: log purchase_price changes on product_references
CREATE OR REPLACE FUNCTION public.log_product_reference_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.purchase_price IS DISTINCT FROM NEW.purchase_price THEN
    INSERT INTO public.price_history(organization_id, entity_type, entity_id, entity_name, field, old_value, new_value, changed_by)
    VALUES (NEW.organization_id, 'product_reference', NEW.id, NEW.name, 'purchase_price', OLD.purchase_price, NEW.purchase_price, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_log_product_reference_price_change ON public.product_references;
CREATE TRIGGER tr_log_product_reference_price_change
AFTER UPDATE OF purchase_price ON public.product_references
FOR EACH ROW
EXECUTE FUNCTION public.log_product_reference_price_change();

REVOKE EXECUTE ON FUNCTION public.log_product_price_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_product_reference_price_change() FROM PUBLIC, anon, authenticated;
