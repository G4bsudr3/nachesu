INSERT INTO public.course_invites (course_id, email_normalized, invited_by, invited_at)
SELECT 'c0a00000-0000-0000-0000-000000000001'::uuid, email, 'eeb9045d-9b35-42dd-98e4-355269f0a082'::uuid, now()
FROM (VALUES
  ('alberto11594@edu.sebrae.com.br'),
  ('arthur.11928@edu.sebrae.com.br'),
  ('arthur11571@edu.sebrae.com.br'),
  ('arthur11834@edu.sebrae.com.br'),
  ('beatriz11513@edu.sebrae.com.br'),
  ('beatriz11670@edu.sebrae.com.br'),
  ('benicio11543@edu.sebrae.com.br'),
  ('catarina11789@edu.sebrae.com.br'),
  ('davi11547@edu.sebrae.com.br'),
  ('elisa11712@edu.sebrae.com.br'),
  ('francisco11506@edu.sebrae.com.br'),
  ('gabriela11681@edu.sebrae.com.br'),
  ('joao11683@edu.sebrae.com.br'),
  ('joao11693@edu.sebrae.com.br'),
  ('lucca11753@edu.sebrae.com.br'),
  ('maria11531@edu.sebrae.com.br'),
  ('mariana11663@edu.sebrae.com.br'),
  ('pedro11635@edu.sebrae.com.br'),
  ('tony11558@edu.sebrae.com.br')
) AS t(email)
ON CONFLICT (course_id, email_normalized) DO NOTHING;