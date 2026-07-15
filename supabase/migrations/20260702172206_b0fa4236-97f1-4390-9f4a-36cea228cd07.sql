CREATE OR REPLACE FUNCTION public.cnpj_already_registered(_cnpj text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.signup_requests
    WHERE regexp_replace(coalesce(cnpj,''), '\D', '', 'g') = regexp_replace(coalesce(_cnpj,''), '\D', '', 'g')
      AND regexp_replace(coalesce(_cnpj,''), '\D', '', 'g') <> ''
  ) OR EXISTS(
    SELECT 1 FROM public.organizations
    WHERE regexp_replace(coalesce(cnpj,''), '\D', '', 'g') = regexp_replace(coalesce(_cnpj,''), '\D', '', 'g')
      AND regexp_replace(coalesce(_cnpj,''), '\D', '', 'g') <> ''
  );
$$;

REVOKE EXECUTE ON FUNCTION public.cnpj_already_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cnpj_already_registered(text) TO anon, authenticated;