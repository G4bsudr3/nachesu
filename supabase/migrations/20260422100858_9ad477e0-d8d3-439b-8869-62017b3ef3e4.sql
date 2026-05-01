-- Define senha temporária pro Mauricio (moberto@grupopanvel.com.br)
-- Ele deve trocar em /app/conta após o primeiro login
UPDATE auth.users
SET 
  encrypted_password = crypt('chora2026', gen_salt('bf')),
  updated_at = now()
WHERE email = 'moberto@grupopanvel.com.br';

-- Marca no profile que ele tem senha (pra esconder o card de "definir senha")
UPDATE public.profiles
SET has_password = true, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'moberto@grupopanvel.com.br');