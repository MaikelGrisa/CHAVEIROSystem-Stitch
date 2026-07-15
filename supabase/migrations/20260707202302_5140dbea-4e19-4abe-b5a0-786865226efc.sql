INSERT INTO public.products (
  id, sku, name, supplier, category, purchase_price, sale_price, stock,
  codigo, codigo_fornecedor, marca, referencia, organization_id,
  stock_controlled, min_stock
)
SELECT
  gen_random_uuid(), sku, name, supplier, category, purchase_price, sale_price, 0,
  codigo, codigo_fornecedor, marca, referencia,
  '5d6e33e2-9bbf-4f1b-99a4-f3849be5a3eb'::uuid,
  stock_controlled, min_stock
FROM public.products
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM public.products p2
    WHERE p2.organization_id = '5d6e33e2-9bbf-4f1b-99a4-f3849be5a3eb'
      AND p2.sku IS NOT DISTINCT FROM public.products.sku
      AND p2.name = public.products.name
  );