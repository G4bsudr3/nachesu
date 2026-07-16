-- Remove o backdoor de bootstrap grant_admin_gabreda (migration 20260716174050).
--
-- Por quê: era um trigger PERMANENTE que dava admin automático a um email
-- hardcoded ('gabreda188@gmail.com') a cada signup/confirmação, e para isso
-- desligava a proteção anti-escalonamento (validate_admin_role_mutation) via
-- `ALTER TABLE public.user_roles DISABLE TRIGGER USER` em todo write de auth.users.
-- Backdoor de email fixo não deve viver em produção.
--
-- Seguro: o grant de admin desse usuário JÁ está persistido em user_roles (linha
-- criada pela migration 20260716174004). Dropar o trigger/função NÃO remove esse
-- acesso — apenas impede novos auto-grants e restaura a proteção anti-escalonamento
-- em todos os writes.

DROP TRIGGER IF EXISTS on_auth_user_created_grant_gabreda ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_gabreda ON auth.users;
DROP FUNCTION IF EXISTS public.grant_admin_gabreda();
