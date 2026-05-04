
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.user_roles DISABLE TRIGGER USER;

DO $$
DECLARE
  _emails text[] := ARRAY['duduobregon@gmail.com','hey@frattz.com'];
  _email text;
  _uid uuid;
  _password text := 'Noxers13';
BEGIN
  FOREACH _email IN ARRAY _emails LOOP
    SELECT id INTO _uid FROM auth.users WHERE lower(email) = _email LIMIT 1;

    IF _uid IS NULL THEN
      _uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change, email_change_token_new
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        _uid, 'authenticated', 'authenticated', _email,
        crypt(_password, gen_salt('bf')), now(),
        jsonb_build_object('provider','email','providers',ARRAY['email']),
        '{}'::jsonb,
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), _uid,
        jsonb_build_object('sub', _uid::text, 'email', _email, 'email_verified', true),
        'email', _uid::text,
        now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = crypt(_password, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = _uid;
    END IF;

    INSERT INTO public.profiles (user_id, display_name, nickname, status, has_password)
    VALUES (_uid, split_part(_email,'@',1), split_part(_email,'@',1), 'active', true)
    ON CONFLICT (user_id) DO UPDATE SET has_password = true, status = 'active';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

ALTER TABLE public.user_roles ENABLE TRIGGER USER;
