
-- Make each tenant's catalog independent: stop cross-organization replication.
DROP TRIGGER IF EXISTS tr_replicate_products ON public.products;
DROP TRIGGER IF EXISTS tr_replicate_product_references ON public.product_references;
DROP TRIGGER IF EXISTS tr_sync_purchase_price ON public.product_references;
DROP FUNCTION IF EXISTS public.replicate_products();
DROP FUNCTION IF EXISTS public.replicate_product_references();

-- Rewrite the purchase-price sync so it only affects the SAME organization.
CREATE OR REPLACE FUNCTION public.sync_product_purchase_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET purchase_price = NEW.purchase_price,
      updated_at = now()
  WHERE referencia = NEW.name
    AND organization_id = NEW.organization_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_sync_purchase_price
AFTER UPDATE OF purchase_price ON public.product_references
FOR EACH ROW
WHEN (OLD.purchase_price IS DISTINCT FROM NEW.purchase_price)
EXECUTE FUNCTION public.sync_product_purchase_prices();

-- Also remove cross-org seeding of new orgs so they start clean going forward.
-- (Existing rows are kept; new orgs simply don't auto-copy Chaveiro TOP's catalog.)
DROP TRIGGER IF EXISTS tr_seed_new_org_catalog ON public.organizations;
DROP FUNCTION IF EXISTS public.seed_new_org_catalog();
