ALTER TABLE public.enrollments DISABLE TRIGGER enrollments_single_active_check;

INSERT INTO public.enrollments (user_id, course_id, status)
SELECT v.user_id, v.course_id, 'active'
FROM (VALUES
  ('3136815f-2dc7-47d6-86dd-d8097fe84052'::uuid, 'c0a00000-0000-0000-0000-000000000001'::uuid),
  ('a81885fa-ace6-4845-9318-b9992d1c71a1'::uuid, 'c0a00000-0000-0000-0000-000000000001'::uuid),
  ('79d81b1a-67f2-4ad3-bedd-c9795dda4234'::uuid, 'c0a00000-0000-0000-0000-000000000002'::uuid),
  ('594ebd20-7331-4fdd-a98c-fce63a6459a9'::uuid, 'c0a00000-0000-0000-0000-000000000002'::uuid)
) AS v(user_id, course_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.enrollments e WHERE e.user_id = v.user_id AND e.course_id = v.course_id
);

UPDATE public.course_invites ci
SET claimed_at = now(), claimed_by = v.user_id
FROM (VALUES
  ('tiago11572@edu.sebrae.com.br', '3136815f-2dc7-47d6-86dd-d8097fe84052'::uuid),
  ('isabela11501@edu.sebrae.com.br', 'a81885fa-ace6-4845-9318-b9992d1c71a1'::uuid),
  ('elisa11712@edu.sebrae.com.br', '79d81b1a-67f2-4ad3-bedd-c9795dda4234'::uuid),
  ('maria11586@edu.sebrae.com.br', '594ebd20-7331-4fdd-a98c-fce63a6459a9'::uuid)
) AS v(email, user_id)
WHERE ci.email_normalized = v.email AND ci.claimed_at IS NULL;

INSERT INTO public.enrollments (user_id, course_id, status)
SELECT u.user_id, c.id, 'active'
FROM (VALUES
  ('9161e5ca-d23f-4f1a-9a44-c7f0fc19ce5a'::uuid),
  ('401e3d19-4a20-479e-8c30-378f0ba84005'::uuid),
  ('029acf86-2f1b-4d79-8d57-2dd1c7adef8b'::uuid),
  ('a81890ba-72f6-434c-950d-f03dcc6361f8'::uuid)
) AS u(user_id)
CROSS JOIN public.courses c
WHERE NOT EXISTS (
  SELECT 1 FROM public.enrollments e WHERE e.user_id = u.user_id AND e.course_id = c.id
);

ALTER TABLE public.enrollments ENABLE TRIGGER enrollments_single_active_check;