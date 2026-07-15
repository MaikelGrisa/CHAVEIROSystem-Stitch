
CREATE TABLE IF NOT EXISTS public.payment_fee_history (
  effective_date date PRIMARY KEY,
  debit_pct numeric NOT NULL DEFAULT 0,
  credit_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_fee_history TO authenticated;
GRANT ALL ON public.payment_fee_history TO service_role;

ALTER TABLE public.payment_fee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read fee history"
  ON public.payment_fee_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage fee history"
  ON public.payment_fee_history FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payment_fee_history_updated_at
  BEFORE UPDATE ON public.payment_fee_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS unit_cost_includes_fee boolean NOT NULL DEFAULT true;

INSERT INTO public.payment_fee_history (effective_date, debit_pct, credit_pct)
SELECT
  CURRENT_DATE,
  COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='debit_fee_pct'), 0),
  COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='credit_fee_pct'), 0)
ON CONFLICT (effective_date) DO UPDATE
  SET debit_pct = EXCLUDED.debit_pct,
      credit_pct = EXCLUDED.credit_pct,
      updated_at = now();

WITH cur AS (
  SELECT
    COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='debit_fee_pct'), 0) AS d,
    COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='credit_fee_pct'), 0) AS c
)
UPDATE public.movements m
SET unit_cost = GREATEST(0, COALESCE(unit_cost,0) - COALESCE(unit_price,0) * (CASE WHEN payment_method='Débito' THEN cur.d ELSE cur.c END) / 100.0),
    unit_cost_includes_fee = false
FROM cur
WHERE m.type = 'out'
  AND m.payment_method IN ('Débito','Crédito')
  AND m.unit_cost_includes_fee = true
  AND (m.occurred_at AT TIME ZONE 'UTC')::date >= CURRENT_DATE;
