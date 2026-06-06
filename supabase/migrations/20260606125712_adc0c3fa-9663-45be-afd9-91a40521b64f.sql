
-- Re-grant safe public-ish cols (intentionally social/opt-in)
GRANT SELECT (instagram, linkedin, cidade) ON public.profiles TO authenticated;

-- Keep restricted (no grant): approved_at, approved_by_admin_id, has_password,
-- tutor_consent_at, quiet_hours_start, quiet_hours_end

-- Admin reads any profile fully (owner can use get_my_profile)
CREATE OR REPLACE FUNCTION public.admin_get_profile(_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  SELECT * INTO _row FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  RETURN _row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid) TO authenticated;
