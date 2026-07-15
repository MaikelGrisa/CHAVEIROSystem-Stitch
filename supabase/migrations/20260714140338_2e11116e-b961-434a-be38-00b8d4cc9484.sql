CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  plan text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias assinaturas"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins veem assinaturas da organização"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.current_org_id()
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);