
-- Trigger: bloqueia segunda matrícula ativa pro mesmo usuário
CREATE OR REPLACE FUNCTION public.enforce_single_active_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _other_course text;
BEGIN
  IF NEW.status <> 'active' THEN
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
$$;

DROP TRIGGER IF EXISTS enrollments_single_active_check ON public.enrollments;
CREATE TRIGGER enrollments_single_active_check
BEFORE INSERT OR UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_enrollment();

-- Ajusta claim de convites no signup: reivindica todos os convites do e-mail,
-- mas só matricula no curso do convite mais antigo (uma eletiva por estudante).
CREATE OR REPLACE FUNCTION public.claim_course_invites_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text := lower(trim(NEW.email));
  _first_course uuid;
BEGIN
  SELECT ci.course_id
    INTO _first_course
  FROM public.course_invites ci
  WHERE ci.email_normalized = _email
    AND ci.claimed_at IS NULL
  ORDER BY ci.invited_at ASC
  LIMIT 1;

  IF _first_course IS NOT NULL THEN
    INSERT INTO public.enrollments (user_id, course_id)
    VALUES (NEW.id, _first_course)
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;

  UPDATE public.course_invites
     SET claimed_at = now(), claimed_by = NEW.id
   WHERE email_normalized = _email
     AND claimed_at IS NULL;

  RETURN NEW;
END;
$$;
