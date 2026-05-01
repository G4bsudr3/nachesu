CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  nickname text,
  status text,
  created_at timestamptz,
  roles text[],
  is_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    au.email::text AS email,
    p.display_name,
    p.nickname,
    p.status,
    p.created_at,
    COALESCE(array_agg(ur.role::text ORDER BY ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) AS roles,
    COALESCE(bool_or(ur.role = 'admin'::public.app_role), false) AS is_admin
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY p.user_id, au.email, p.display_name, p.nickname, p.status, p.created_at
  ORDER BY p.created_at DESC;
$$;