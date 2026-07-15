
-- Add Lista de Preço columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS codigo integer,
  ADD COLUMN IF NOT EXISTS codigo_fornecedor text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS referencia text;

CREATE UNIQUE INDEX IF NOT EXISTS products_codigo_unique ON public.products(codigo) WHERE codigo IS NOT NULL;

-- Expenses / Compras Estoque table (Balanço Mensal)
CREATE TYPE public.expense_kind AS ENUM ('despesa', 'compra_estoque');

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.expense_kind NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  descricao text,
  produto text,
  fornecedor text,
  valor numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner/admin update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner/admin delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
