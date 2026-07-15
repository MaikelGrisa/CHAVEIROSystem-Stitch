
-- Re-grant column privileges so we can drop the columns cleanly, then drop.
GRANT SELECT (admin_pin, delete_pin), INSERT (admin_pin, delete_pin), UPDATE (admin_pin, delete_pin)
  ON public.organizations TO authenticated;

ALTER TABLE public.organizations DROP COLUMN IF EXISTS admin_pin;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS delete_pin;
