
-- =========================================================================
-- 1. search_path mutável
-- =========================================================================
ALTER FUNCTION public.scope_forbidden_terms(text) SET search_path = public;
ALTER FUNCTION public.trg_module_publish_scope_check() SET search_path = public;
ALTER FUNCTION public.trg_release_scope_check() SET search_path = public;

-- =========================================================================
-- 2. mover pgvector pra schema dedicado
-- =========================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;

-- garantir que funções que usam o tipo vector continuem resolvendo
ALTER FUNCTION public.match_chora_bot_chunks(extensions.vector, integer, numeric)
  SET search_path = public, extensions;

-- =========================================================================
-- 3. revogar EXECUTE de funções SECURITY DEFINER internas
-- =========================================================================

-- triggers (rodam como owner, ninguém precisa chamar via RPC)
REVOKE EXECUTE ON FUNCTION public.auto_link_builder_card_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_link_fbi_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_course_invites_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_hub_engagement_for_target() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_chora_bot_cutoff() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_single_active_enrollment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_deliverable_reviewed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_module_released() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_module_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_admin_role_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_hub_engagement_target() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_project_vote() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_module_publish_scope_check() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_release_scope_check() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_autofill_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_invited_participant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_tutorial_idea() FROM PUBLIC, anon, authenticated;

-- internas / só edge function com service_role
REVOKE EXECUTE ON FUNCTION public.assert_module_in_scope(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_chora_bot_chunks(extensions.vector, integer, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_user_by_email(text) FROM PUBLIC, anon, authenticated;

-- admin RPCs — só authenticated (admin valida via has_role dentro da função)
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_pending_profiles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_module_metrics(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.scope_check_course(uuid) FROM PUBLIC, anon;

-- RPCs do estudante logado — revogar de anon
REVOKE EXECUTE ON FUNCTION public.get_my_card_state() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_future_letter_group(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_future_letter_response(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_project_vote_result(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_future_letter_response(uuid, text, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.seal_future_letter(uuid, text, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_future_letter_group_open(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_future_letter_group_open_and_owned(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_project_voting_top_ten(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_share_token() FROM PUBLIC, anon;

-- has_role, is_future_letter_group_member, can_submit_public_fbi e get_public_card_by_token / mark_card_first_view / lookup_invited_canonical
-- mantêm grants atuais pois são usadas em RLS ou em telas pré-login

-- =========================================================================
-- 4. buckets públicos listáveis — remover policies amplas de SELECT
--    (leitura via URL pública continua funcionando — não passa por RLS)
-- =========================================================================
DROP POLICY IF EXISTS "auth lista hub-materials" ON storage.objects;
DROP POLICY IF EXISTS "auth lista hub-project-covers" ON storage.objects;
DROP POLICY IF EXISTS "anexos de pílula são públicos pra leitura" ON storage.objects;
DROP POLICY IF EXISTS "artworks publicamente legíveis" ON storage.objects;
DROP POLICY IF EXISTS "certificados públicos pra leitura" ON storage.objects;
DROP POLICY IF EXISTS "mascotes turma públicos" ON storage.objects;
DROP POLICY IF EXISTS "público lê imagens de cartas" ON storage.objects;
DROP POLICY IF EXISTS "álbum público leitura" ON storage.objects;
