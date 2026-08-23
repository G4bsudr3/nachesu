-- consentimento versionado (LGPD)
-- antes só guardávamos profiles.tutor_consent_at (data). agora registramos também
-- QUAL versão do aviso o aluno aceitou, pra dar prova de consentimento versionado
-- e permitir re-consentimento quando o texto do aviso mudar.
--
-- get_my_profile() faz SELECT p.* FROM profiles, então a coluna nova flui
-- automaticamente pro RPC sem precisar recriar a função.

alter table public.profiles
  add column if not exists tutor_consent_version text;

comment on column public.profiles.tutor_consent_version is
  'versão do aviso de privacidade do tutor aceita pelo aluno (ex.: "2026-08-23"). '
  'null = consentimento legado (aceito antes do versionamento) ou nunca aceito.';
