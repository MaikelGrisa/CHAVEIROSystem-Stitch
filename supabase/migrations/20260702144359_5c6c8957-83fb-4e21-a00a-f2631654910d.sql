
-- 1) Fix SUPA_anon_security_definer_function_executable
REVOKE EXECUTE ON FUNCTION public.get_org_color_by_nickname(text) FROM anon, PUBLIC;

-- 2) Fix organizations_pin_exposure: restrict PIN columns to service_role only
REVOKE SELECT (admin_pin, delete_pin), INSERT (admin_pin, delete_pin), UPDATE (admin_pin, delete_pin)
  ON public.organizations FROM authenticated;
REVOKE SELECT (admin_pin, delete_pin), INSERT (admin_pin, delete_pin), UPDATE (admin_pin, delete_pin)
  ON public.organizations FROM anon;

-- 3) Fix payment_fee_history_cross_tenant_read: add per-org scoping
ALTER TABLE public.payment_fee_history ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Backfill: replicate every existing (global) row for every organization
INSERT INTO public.payment_fee_history
  (organization_id, effective_date, debit_pct, credit_pct, debit_pct_other, credit_pct_other, boleto_fee)
SELECT o.id, h.effective_date, h.debit_pct, h.credit_pct, h.debit_pct_other, h.credit_pct_other, h.boleto_fee
FROM public.payment_fee_history h
CROSS JOIN public.organizations o
WHERE h.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- Drop the original global rows
DELETE FROM public.payment_fee_history WHERE organization_id IS NULL;

ALTER TABLE public.payment_fee_history ALTER COLUMN organization_id SET NOT NULL;

-- Replace primary key / uniqueness to include organization_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_fee_history_pkey' AND conrelid = 'public.payment_fee_history'::regclass) THEN
    ALTER TABLE public.payment_fee_history DROP CONSTRAINT payment_fee_history_pkey;
  END IF;
END $$;

ALTER TABLE public.payment_fee_history
  ADD CONSTRAINT payment_fee_history_pkey PRIMARY KEY (organization_id, effective_date);

-- Replace overly permissive SELECT policy with tenant-scoped one
DROP POLICY IF EXISTS "Authenticated can read fee history" ON public.payment_fee_history;
DROP POLICY IF EXISTS "Admins manage fee history" ON public.payment_fee_history;

CREATE POLICY "tenant select payment_fee_history"
  ON public.payment_fee_history FOR SELECT
  USING (public.is_super_admin() OR organization_id = public.current_org_id());

CREATE POLICY "tenant admin manage payment_fee_history"
  ON public.payment_fee_history FOR ALL
  USING (public.is_super_admin() OR (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (organization_id = public.current_org_id() AND public.has_role(auth.uid(), 'admin')));
