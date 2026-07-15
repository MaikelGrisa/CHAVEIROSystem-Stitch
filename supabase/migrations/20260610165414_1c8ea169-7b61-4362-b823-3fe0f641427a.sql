-- 1. Create the function to update product purchase prices
CREATE OR REPLACE FUNCTION public.sync_product_purchase_prices()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET purchase_price = NEW.purchase_price,
      updated_at = now()
  WHERE referencia = NEW.name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on product_references
DROP TRIGGER IF EXISTS tr_sync_purchase_price ON public.product_references;
CREATE TRIGGER tr_sync_purchase_price
AFTER UPDATE OF purchase_price ON public.product_references
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_purchase_prices();

-- 3. Initial sync: Update products that already have a reference
UPDATE public.products p
SET purchase_price = r.purchase_price
FROM public.product_references r
WHERE p.referencia = r.name;
