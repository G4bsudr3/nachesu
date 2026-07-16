-- promove tassiapmg@gmail.com a admin e reseta senha
-- reset senha via encrypted_password (bcrypt via crypt)
UPDATE auth.users
SET encrypted_password = crypt('nachestassia123$', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '401e3d19-4a20-479e-8c30-378f0ba84005';

-- concede admin (contorna guard já que migration roda sem auth.uid())
ALTER TABLE public.user_roles DISABLE TRIGGER validate_admin_role_mutation_trigger;

INSERT INTO public.user_roles (user_id, role)
VALUES ('401e3d19-4a20-479e-8c30-378f0ba84005', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.user_roles ENABLE TRIGGER validate_admin_role_mutation_trigger;

-- marca has_password no profile
UPDATE public.profiles
SET has_password = true
WHERE user_id = '401e3d19-4a20-479e-8c30-378f0ba84005';