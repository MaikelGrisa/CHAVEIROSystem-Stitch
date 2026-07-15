UPDATE auth.users
SET email = 'go.plus@chaveirotop.local'
WHERE email = 'go.plus.digital@chaveirotop.local';

GRANT EXECUTE ON FUNCTION public.get_org_color_by_nickname(text) TO anon, authenticated;