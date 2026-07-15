
-- Two separate sequences starting at the required values
CREATE SEQUENCE IF NOT EXISTS public.service_orders_os_seq START 1000 MINVALUE 1000;
CREATE SEQUENCE IF NOT EXISTS public.service_orders_orc_seq START 3000 MINVALUE 3000;

GRANT USAGE ON SEQUENCE public.service_orders_os_seq TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.service_orders_orc_seq TO authenticated, service_role;

-- Drop old default that used the legacy sequence
ALTER TABLE public.service_orders ALTER COLUMN number DROP DEFAULT;

-- Trigger to assign number based on kind
CREATE OR REPLACE FUNCTION public.assign_service_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = 0 THEN
    IF NEW.kind = 'orcamento' THEN
      NEW.number := nextval('public.service_orders_orc_seq');
    ELSE
      NEW.number := nextval('public.service_orders_os_seq');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_orders_assign_number ON public.service_orders;
CREATE TRIGGER trg_service_orders_assign_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_service_order_number();
