
-- Revogar execução pública e conceder apenas aos roles que disparam os triggers
REVOKE ALL ON FUNCTION public.auto_link_fbi_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_link_builder_card_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auto_link_fbi_user() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.auto_link_builder_card_user() TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.auto_link_fbi_user() IS
  'Trigger BEFORE INSERT/UPDATE em fbi_responses. SECURITY DEFINER necessário para consultar auth.users por email e preencher user_id automaticamente quando ausente. search_path fixo em public para prevenir hijack via schemas maliciosos.';

COMMENT ON FUNCTION public.auto_link_builder_card_user() IS
  'Trigger BEFORE INSERT/UPDATE em builder_cards. SECURITY DEFINER necessário para resolver invited_participants.id em auth.users.id e remover cards duplicados. search_path fixo em public para prevenir hijack via schemas maliciosos.';
