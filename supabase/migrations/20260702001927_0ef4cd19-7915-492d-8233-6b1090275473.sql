CREATE OR REPLACE FUNCTION public.get_org_color_by_nickname(_nickname text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.primary_color
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE lower(u.email) = lower(_nickname) || '@chaveirotop.local'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_color_by_nickname(text) TO anon, authenticated;