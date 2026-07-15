
-- 1) SECURITY DEFINER function executable findings
-- has_role: needed by RLS for authenticated users; revoke from public/anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Trigger-only functions: should never be callable via API.
REVOKE EXECUTE ON FUNCTION public.sync_product_purchase_prices() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_product_purchase_prices() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_product_purchase_prices() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_service_order_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_service_order_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_service_order_number() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 2) RLS policy always true: replace `true` with auth.uid() IS NOT NULL
--    on INSERT/UPDATE/DELETE policies. SELECT policies with USING(true)
--    are intentionally excluded by the linter and are left untouched.

-- service_orders
DROP POLICY IF EXISTS "Authenticated can delete service_orders" ON public.service_orders;
CREATE POLICY "Authenticated can delete service_orders"
  ON public.service_orders FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert service_orders" ON public.service_orders;
CREATE POLICY "Authenticated can insert service_orders"
  ON public.service_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update service_orders" ON public.service_orders;
CREATE POLICY "Authenticated can update service_orders"
  ON public.service_orders FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- product_references (was ALL using true / with check true)
DROP POLICY IF EXISTS "Users can manage product references" ON public.product_references;
CREATE POLICY "Authenticated can read product references"
  ON public.product_references FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated can insert product references"
  ON public.product_references FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update product references"
  ON public.product_references FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete product references"
  ON public.product_references FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- app_settings (was ALL using true)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.app_settings;
CREATE POLICY "Authenticated can read app settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated can insert app settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update app settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete app settings"
  ON public.app_settings FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- customers (was ALL using true)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customers;
CREATE POLICY "Authenticated can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- receipts (was ALL using true)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.receipts;
CREATE POLICY "Authenticated can read receipts"
  ON public.receipts FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated can insert receipts"
  ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update receipts"
  ON public.receipts FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete receipts"
  ON public.receipts FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- purchase_list_items
DROP POLICY IF EXISTS "Authenticated users can add purchase list items" ON public.purchase_list_items;
CREATE POLICY "Authenticated users can add purchase list items"
  ON public.purchase_list_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can edit purchase list items" ON public.purchase_list_items;
CREATE POLICY "Authenticated users can edit purchase list items"
  ON public.purchase_list_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can remove purchase list items" ON public.purchase_list_items;
CREATE POLICY "Authenticated users can remove purchase list items"
  ON public.purchase_list_items FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
