CREATE TABLE public.purchase_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  codigo text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  checked boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_list_items TO authenticated;
GRANT ALL ON public.purchase_list_items TO service_role;

ALTER TABLE public.purchase_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read purchase list"
ON public.purchase_list_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can add purchase list items"
ON public.purchase_list_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can edit purchase list items"
ON public.purchase_list_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can remove purchase list items"
ON public.purchase_list_items
FOR DELETE
TO authenticated
USING (true);

CREATE TRIGGER touch_purchase_list_items_updated_at
BEFORE UPDATE ON public.purchase_list_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_list_items;