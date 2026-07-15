UPDATE public.movements m
SET unit_cost = p.purchase_price
FROM public.products p
WHERE m.product_id = p.id
  AND m.unit_cost IS NULL
  AND p.purchase_price IS NOT NULL;