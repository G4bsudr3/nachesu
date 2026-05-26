-- 1. Backfill: garantir que todo módulo já "liberado" via module_releases fica publicado
UPDATE public.modules m
SET published = true
WHERE EXISTS (SELECT 1 FROM public.module_releases mr WHERE mr.module_id = m.id)
  AND m.published = false;

-- 2. Simplificar policy de SELECT em modules: remover dependência de module_releases
-- Agora o toggle "publicado" do admin controla 100% da visibilidade.
DROP POLICY IF EXISTS "aluno vê módulos liberados se matriculado" ON public.modules;

CREATE POLICY "aluno vê módulos publicados se matriculado"
ON public.modules
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    published = true
    AND (available_from IS NULL OR available_from <= now())
    AND EXISTS (
      SELECT 1
      FROM trails t
      JOIN enrollments e ON e.course_id = t.course_id
      WHERE t.id = modules.trail_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  )
);

-- 3. Log: registrar momento da publicação automaticamente quando admin liga o toggle
-- (mantém module_releases como histórico, sem ser gatekeeper)
CREATE OR REPLACE FUNCTION public.log_module_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true AND (OLD.published IS DISTINCT FROM true) THEN
    INSERT INTO public.module_releases (module_id, released_by)
    VALUES (NEW.id, auth.uid())
    ON CONFLICT (module_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_module_publish ON public.modules;
CREATE TRIGGER trg_log_module_publish
AFTER UPDATE OF published ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.log_module_publish();