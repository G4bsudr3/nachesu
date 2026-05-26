-- 1. Backfill profile e role para a conta órfã mateusfrattezi@gmail.com
INSERT INTO public.profiles (user_id, display_name, nickname, status)
VALUES ('04bd3c2b-054b-45fb-8301-4f664c7724cf', 'mateus frattezi', 'mateusfrattezi', 'active')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('04bd3c2b-054b-45fb-8301-4f664c7724cf', 'participant')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Ajustar trigger pra admins poderem seedar múltiplas matrículas
CREATE OR REPLACE FUNCTION public.enforce_single_active_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _other_course text;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- admin pode criar múltiplas matrículas (seed, testes)
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = NEW.status
     AND OLD.course_id = NEW.course_id
     AND OLD.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT c.title
    INTO _other_course
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id
  WHERE e.user_id = NEW.user_id
    AND e.status = 'active'
    AND e.course_id <> NEW.course_id
  LIMIT 1;

  IF _other_course IS NOT NULL THEN
    RAISE EXCEPTION
      'este estudante já está matriculado em outra eletiva ("%"). cancele a matrícula anterior antes de adicionar uma nova.',
      _other_course
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;