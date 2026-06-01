DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(user_id uuid, email text, display_name text, nickname text, status text, created_at timestamp with time zone, roles text[], is_admin boolean, courses text[], course_slugs text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.user_id,
    au.email::text AS email,
    p.display_name,
    p.nickname,
    p.status,
    p.created_at,
    COALESCE(array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) AS roles,
    COALESCE(bool_or(ur.role = 'admin'::public.app_role), false) AS is_admin,
    COALESCE(array_agg(DISTINCT c.title) FILTER (WHERE c.title IS NOT NULL AND e.status = 'active'), ARRAY[]::text[]) AS courses,
    COALESCE(array_agg(DISTINCT c.slug) FILTER (WHERE c.slug IS NOT NULL AND e.status = 'active'), ARRAY[]::text[]) AS course_slugs
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN public.enrollments e ON e.user_id = p.user_id
  LEFT JOIN public.courses c ON c.id = e.course_id
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  GROUP BY p.user_id, au.email, p.display_name, p.nickname, p.status, p.created_at
  ORDER BY p.created_at DESC;
$function$;