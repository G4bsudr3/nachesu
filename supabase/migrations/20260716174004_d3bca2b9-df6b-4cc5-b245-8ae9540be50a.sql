DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'gabreda188@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'usuário não existe ainda; peça pra ele solicitar o magic link primeiro';
  ELSE
    ALTER TABLE public.user_roles DISABLE TRIGGER USER;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    ALTER TABLE public.user_roles ENABLE TRIGGER USER;

    UPDATE public.profiles
       SET status = 'active',
           approved_at = COALESCE(approved_at, now())
     WHERE user_id = v_uid;
  END IF;
END $$;