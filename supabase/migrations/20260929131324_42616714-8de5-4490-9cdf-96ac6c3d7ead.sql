CREATE OR REPLACE FUNCTION public.get_my_official_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.full_name
  FROM public.student_roster r
  JOIN auth.users u ON lower(u.email) = r.email_normalized
  WHERE u.id = auth.uid()
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_my_official_name() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_official_name() TO authenticated;