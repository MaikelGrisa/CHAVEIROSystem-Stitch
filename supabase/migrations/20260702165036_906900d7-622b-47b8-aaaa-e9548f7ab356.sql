
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente text NOT NULL,
  nome_fantasia text NOT NULL,
  cnpj text,
  whatsapp text NOT NULL,
  rua text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  status text NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  activated_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.signup_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.signup_requests TO authenticated;
GRANT ALL ON public.signup_requests TO service_role;

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may submit a signup request.
CREATE POLICY "Anyone can submit signup request"
  ON public.signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only super admins can read/modify/delete requests.
CREATE POLICY "Super admins can read signup requests"
  ON public.signup_requests
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can update signup requests"
  ON public.signup_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete signup requests"
  ON public.signup_requests
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

CREATE TRIGGER signup_requests_touch_updated_at
BEFORE UPDATE ON public.signup_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
