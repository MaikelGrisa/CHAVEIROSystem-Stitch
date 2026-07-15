
ALTER TABLE public.payment_fee_history
  ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
