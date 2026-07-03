
CREATE OR REPLACE FUNCTION public.claim_course_invites_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text := lower(trim(NEW.email));
  _course uuid;
BEGIN
  -- desabilita a checagem de eletiva única: convite intencional pra múltiplas é permitido
  ALTER TABLE public.enrollments DISABLE TRIGGER enrollments_single_active_check;

  FOR _course IN
    SELECT ci.course_id
    FROM public.course_invites ci
    WHERE ci.email_normalized = _email
      AND ci.claimed_at IS NULL
    ORDER BY ci.invited_at ASC
  LOOP
    INSERT INTO public.enrollments (user_id, course_id, status)
    VALUES (NEW.id, _course, 'active')
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END LOOP;

  ALTER TABLE public.enrollments ENABLE TRIGGER enrollments_single_active_check;

  UPDATE public.course_invites
     SET claimed_at = now(), claimed_by = NEW.id
   WHERE email_normalized = _email
     AND claimed_at IS NULL;

  RETURN NEW;
END;
$function$;
