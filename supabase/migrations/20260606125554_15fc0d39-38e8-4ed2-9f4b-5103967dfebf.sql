
-- 1) fbi_responses: drop anon SELECT/UPDATE
DROP POLICY IF EXISTS "anon lê fbi público próprio" ON public.fbi_responses;
DROP POLICY IF EXISTS "anon atualiza fbi público próprio" ON public.fbi_responses;

-- 2) hub_insights
DROP POLICY IF EXISTS "auth lê insights" ON public.hub_insights;
CREATE POLICY "auth lê próprios insights"
  ON public.hub_insights FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) tutor_settings admin only
DROP POLICY IF EXISTS "auth lê settings do tutor" ON public.tutor_settings;
CREATE POLICY "admin lê settings do tutor"
  ON public.tutor_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) chora_bot_settings: column-level grants
REVOKE SELECT ON public.chora_bot_settings FROM authenticated, anon;
GRANT SELECT (id, enabled, cutoff_at, welcome_message) ON public.chora_bot_settings TO authenticated;
GRANT ALL ON public.chora_bot_settings TO service_role;

-- 5) hub_certificates owner+admin
DROP POLICY IF EXISTS "auth lê certificados" ON public.hub_certificates;
CREATE POLICY "owner lê certificado"
  ON public.hub_certificates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6) module_releases enrolled+admin
DROP POLICY IF EXISTS "module_releases auth lê" ON public.module_releases;
CREATE POLICY "enrolled lê module_releases"
  ON public.module_releases FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.trails t ON t.id = m.trail_id
      JOIN public.enrollments e ON e.course_id = t.course_id
      WHERE m.id = module_releases.module_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- 7) trails enrolled+admin
DROP POLICY IF EXISTS "auth lê trilhas" ON public.trails;
CREATE POLICY "enrolled lê trails"
  ON public.trails FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = trails.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- 8) profiles: column-level grants
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, user_id, display_name, nickname, slug, avatar_url, bio, status, created_at, updated_at
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.* FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_turma_socials()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  nickname text,
  avatar_url text,
  instagram text,
  linkedin text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.nickname, p.avatar_url, p.instagram, p.linkedin
  FROM public.profiles p
  WHERE p.status = 'active'
    AND (p.instagram IS NOT NULL OR p.linkedin IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.get_turma_socials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_turma_socials() TO authenticated;
