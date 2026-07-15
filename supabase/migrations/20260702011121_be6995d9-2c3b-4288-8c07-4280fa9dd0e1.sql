
-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('trial','monthly','semiannual','annual','free_lifetime');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trial','active','expired','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Colunas em organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_plan NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_status public.subscription_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS blocked_reason text NULL,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz NULL;

-- Backfill: orgs existentes ficam ativas vitalícias (evita bloquear ninguém agora)
UPDATE public.organizations
   SET subscription_plan = 'free_lifetime',
       subscription_status = 'active',
       subscription_expires_at = NULL
 WHERE subscription_status = 'trial'
   AND subscription_expires_at IS NULL;

-- Chaveiro TOP: gratuito vitalício explicitamente
UPDATE public.organizations
   SET subscription_plan = 'free_lifetime',
       subscription_status = 'active',
       subscription_expires_at = NULL,
       blocked_reason = NULL, blocked_at = NULL
 WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3) Trigger: nova org nasce em trial 7 dias (a menos que Super Admin informe outro)
CREATE OR REPLACE FUNCTION public.set_new_org_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;
  IF NEW.subscription_plan IS NULL OR NEW.subscription_plan = 'trial' THEN
    NEW.subscription_plan := 'trial';
    NEW.subscription_status := 'trial';
    NEW.subscription_started_at := COALESCE(NEW.subscription_started_at, now());
    NEW.subscription_expires_at := COALESCE(NEW.subscription_expires_at, now() + interval '7 days');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_new_org_trial ON public.organizations;
CREATE TRIGGER trg_set_new_org_trial
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_new_org_trial();

-- 4) Função is_org_active — usada pelo front (e futuramente por policies)
CREATE OR REPLACE FUNCTION public.is_org_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id
      AND o.subscription_status IN ('active','trial')
      AND (o.subscription_expires_at IS NULL OR o.subscription_expires_at > now())
  )
$$;

-- 5) Tabela de histórico
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  changed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_plan public.subscription_plan NULL,
  new_plan public.subscription_plan NULL,
  old_status public.subscription_status NULL,
  new_status public.subscription_status NULL,
  old_expires_at timestamptz NULL,
  new_expires_at timestamptz NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.subscription_history TO authenticated;
GRANT ALL ON public.subscription_history TO service_role;

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_read_history" ON public.subscription_history;
CREATE POLICY "super_admin_read_history" ON public.subscription_history
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR organization_id = public.current_org_id());

DROP POLICY IF EXISTS "super_admin_insert_history" ON public.subscription_history;
CREATE POLICY "super_admin_insert_history" ON public.subscription_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE INDEX IF NOT EXISTS idx_sub_history_org ON public.subscription_history(organization_id, created_at DESC);

-- 6) Cron diário: marca expiradas
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH expired AS (
    UPDATE public.organizations
       SET subscription_status = 'expired',
           blocked_at = now(),
           blocked_reason = COALESCE(blocked_reason, 'Assinatura expirada automaticamente')
     WHERE subscription_status IN ('active','trial')
       AND subscription_expires_at IS NOT NULL
       AND subscription_expires_at <= now()
    RETURNING id, subscription_plan, subscription_status, subscription_expires_at
  )
  INSERT INTO public.subscription_history
    (organization_id, action, new_status, new_expires_at, reason)
  SELECT id, 'auto_expire', subscription_status, subscription_expires_at, 'Cron: validade vencida'
  FROM expired;
END $$;

-- Agenda (00:05 todo dia)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-overdue-subscriptions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-overdue-subscriptions',
  '5 0 * * *',
  $$ SELECT public.expire_overdue_subscriptions(); $$
);
