CREATE OR REPLACE FUNCTION public.sync_product_purchase_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.products
  SET purchase_price = NEW.purchase_price,
      updated_at = now()
  WHERE referencia = NEW.name;
  RETURN NEW;
END;
$function$;