
-- 1) Prevent duplicate profiles per user (blocks inserting a second profile with a different organization_id)
-- Only add if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 2) Tighten profiles INSERT policy: regular users should not create their own profile row
-- (handle_new_user trigger is SECURITY DEFINER and bypasses RLS)
DROP POLICY IF EXISTS "profiles insert" ON public.profiles;
CREATE POLICY "profiles insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- 3) Revoke EXECUTE from anon and PUBLIC on SECURITY DEFINER functions that shouldn't be public.
-- Keep get_org_color_by_nickname callable by anon (used on the public login screen).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_active(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_receipt_number() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions() FROM anon, authenticated, PUBLIC;

-- Trigger-only functions: revoke from everyone except service_role/owner
REVOKE EXECUTE ON FUNCTION public.replicate_product_references() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.replicate_products() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_new_org_catalog() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_new_org_trial() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_product_purchase_prices() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_service_order_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
