-- gate de visibilidade do módulo pelo módulo aparecer em module_releases.
-- admin segue vendo tudo. estudante vê só os liberados (matriculado + published + released).

DROP POLICY IF EXISTS "aluno vê módulos publicados se matriculado" ON public.modules;
CREATE POLICY "aluno vê módulos liberados se matriculado"
ON public.modules
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    published = true
    AND (available_from IS NULL OR available_from <= now())
    AND EXISTS (
      SELECT 1 FROM public.module_releases mr WHERE mr.module_id = modules.id
    )
    AND EXISTS (
      SELECT 1 FROM public.trails t
      JOIN public.enrollments e ON e.course_id = t.course_id
      WHERE t.id = modules.trail_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "aluno vê pílulas publicadas de módulos visíveis" ON public.module_pills;
CREATE POLICY "aluno vê pílulas de módulos liberados"
ON public.module_pills
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_pills.module_id
        AND m.published = true
        AND (m.available_from IS NULL OR m.available_from <= now())
        AND EXISTS (SELECT 1 FROM public.module_releases mr WHERE mr.module_id = m.id)
    )
  )
);