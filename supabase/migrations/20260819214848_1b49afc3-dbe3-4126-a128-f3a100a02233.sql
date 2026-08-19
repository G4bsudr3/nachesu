DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'tassiapmg@gmail.com';
  IF uid IS NULL THEN RAISE EXCEPTION 'usuario nao encontrado'; END IF;

  DELETE FROM public.deliverable_messages
   WHERE deliverable_id IN (SELECT id FROM public.module_deliverables WHERE user_id = uid);
  DELETE FROM public.module_deliverables WHERE user_id = uid;
  DELETE FROM public.student_pill_progress WHERE user_id = uid;
  DELETE FROM public.student_module_progress WHERE user_id = uid;
  DELETE FROM public.module_ratings WHERE user_id = uid;
  DELETE FROM public.tutorial_progress WHERE user_id = uid;
  DELETE FROM public.student_alerts WHERE user_id = uid;
END $$;