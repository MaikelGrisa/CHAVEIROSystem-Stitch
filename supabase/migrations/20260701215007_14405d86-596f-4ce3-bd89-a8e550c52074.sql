
ALTER TABLE public.payment_fee_history
  ADD COLUMN IF NOT EXISTS debit_pct_other numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_pct_other numeric NOT NULL DEFAULT 0;

-- Backfill: default "other" rates to the existing single rate
UPDATE public.payment_fee_history
  SET debit_pct_other = debit_pct
  WHERE debit_pct_other = 0 AND debit_pct <> 0;
UPDATE public.payment_fee_history
  SET credit_pct_other = credit_pct
  WHERE credit_pct_other = 0 AND credit_pct <> 0;

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS card_brand text;

ALTER TABLE public.movements
  DROP CONSTRAINT IF EXISTS movements_card_brand_check;
ALTER TABLE public.movements
  ADD CONSTRAINT movements_card_brand_check
  CHECK (card_brand IS NULL OR card_brand IN ('visa_master','other'));
