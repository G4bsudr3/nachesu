UPDATE auth.users 
SET encrypted_password = crypt('chora2026', gen_salt('bf'))
WHERE id = 'c88b62b2-309f-4fda-9e39-6466653ea9fd';

UPDATE public.profiles 
SET has_password = true 
WHERE user_id = 'c88b62b2-309f-4fda-9e39-6466653ea9fd';