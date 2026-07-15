
-- Receipts: start from 1 per organization
CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org uuid := public.current_org_id();
  max_existing integer;
  next_num integer;
BEGIN
  IF org IS NULL THEN
    RAISE EXCEPTION 'organization not found for current user';
  END IF;

  SELECT COALESCE(MAX(receipt_number), 0) INTO max_existing
  FROM public.receipts WHERE organization_id = org;

  next_num := max_existing + 1;

  INSERT INTO public.app_settings (organization_id, key, value)
  VALUES (org, 'next_receipt_number', to_jsonb(next_num + 1))
  ON CONFLICT (organization_id, key) DO UPDATE
    SET value = to_jsonb(next_num + 1);

  RETURN next_num;
END;
$$;

-- Service orders: numbering per organization + kind, starting from 1
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_number_key;
DROP INDEX IF EXISTS public.service_orders_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS service_orders_org_kind_number_unique
  ON public.service_orders (organization_id, kind, number);

CREATE OR REPLACE FUNCTION public.assign_service_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_existing integer;
BEGIN
  IF NEW.number IS NULL OR NEW.number = 0 THEN
    SELECT COALESCE(MAX(number), 0) INTO max_existing
    FROM public.service_orders
    WHERE organization_id = NEW.organization_id
      AND kind = NEW.kind;
    NEW.number := max_existing + 1;
  END IF;
  RETURN NEW;
END;
$$;
