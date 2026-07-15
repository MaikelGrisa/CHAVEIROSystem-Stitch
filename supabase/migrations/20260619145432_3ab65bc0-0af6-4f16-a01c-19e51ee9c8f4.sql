ALTER TABLE public.payment_fee_history
  ADD COLUMN IF NOT EXISTS boleto_fee numeric NOT NULL DEFAULT 0;

INSERT INTO public.payment_fee_history (effective_date, debit_pct, credit_pct, boleto_fee)
SELECT
  CURRENT_DATE,
  COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='debit_fee_pct'), 0),
  COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='credit_fee_pct'), 0),
  COALESCE((SELECT (value #>> '{}')::numeric FROM public.app_settings WHERE key='boleto_fee'), 0)
ON CONFLICT (effective_date) DO UPDATE
  SET boleto_fee = EXCLUDED.boleto_fee;
