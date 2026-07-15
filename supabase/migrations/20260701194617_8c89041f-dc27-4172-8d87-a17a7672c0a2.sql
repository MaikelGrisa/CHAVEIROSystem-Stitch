
-- Restaurar execute nas funções (RLS + default precisa disso)
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Adicionar DEFAULT public.current_org_id() em todas as colunas organization_id
ALTER TABLE public.customers           ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.expenses            ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.movements           ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.products            ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.product_references  ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.receipts            ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.service_orders      ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.purchase_list_items ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.app_settings        ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
ALTER TABLE public.profiles            ALTER COLUMN organization_id SET DEFAULT public.current_org_id();
