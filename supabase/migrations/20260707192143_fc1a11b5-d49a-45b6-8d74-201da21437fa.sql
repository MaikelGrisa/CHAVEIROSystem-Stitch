
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS stock_control_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_controlled boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 0;
