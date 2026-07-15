
-- Tornar receipt_number único por organização (não globalmente)
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_receipt_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS receipts_org_number_unique ON public.receipts (organization_id, receipt_number);

-- Função atômica para obter o próximo número de recibo da organização
CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org uuid := public.current_org_id();
  next_num integer;
  max_existing integer;
BEGIN
  IF org IS NULL THEN
    RAISE EXCEPTION 'organization not found for current user';
  END IF;

  SELECT COALESCE(MAX(receipt_number), 0) INTO max_existing
  FROM public.receipts WHERE organization_id = org;

  INSERT INTO public.app_settings (organization_id, key, value)
  VALUES (org, 'next_receipt_number', to_jsonb(GREATEST(max_existing + 1, 505)))
  ON CONFLICT (organization_id, key) DO UPDATE
    SET value = to_jsonb(GREATEST((public.app_settings.value)::text::int, EXCLUDED.value::text::int))
  RETURNING (value)::text::int INTO next_num;

  -- Garante que não colide com um recibo existente
  next_num := GREATEST(next_num, max_existing + 1);

  UPDATE public.app_settings
     SET value = to_jsonb(next_num + 1)
   WHERE organization_id = org AND key = 'next_receipt_number';

  RETURN next_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_receipt_number() TO authenticated;
