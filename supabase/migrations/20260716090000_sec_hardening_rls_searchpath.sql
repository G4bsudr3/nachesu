-- SobreAI hardening — RLS + search_path
-- SEC-03: remove a policy de INSERT anônimo remanescente em fbi_responses.
-- SEC-09: fixa search_path nas 4 funções de fila SECURITY DEFINER.
-- Todas as operações são idempotentes e não afetam fluxos existentes:
--   * a escrita pública de FBI continua funcionando via edge function
--     submit-public-fbi (service role, que bypassa RLS);
--   * as funções de fila continuam com o mesmo corpo — só ganham search_path fixo.

-- ── SEC-03 ────────────────────────────────────────────────────────────────
-- A migration de 06/06 removeu o SELECT/UPDATE anônimos, mas o INSERT anônimo
-- ficou ativo (permitia inserir respostas FBI para qualquer email convidado via
-- PostgREST direto). Removido aqui; a submissão pública segue pela edge function.
DROP POLICY IF EXISTS "anon insere fbi público" ON public.fbi_responses;

-- ── SEC-09 ────────────────────────────────────────────────────────────────
-- Fixa search_path para evitar sequestro de resolução de nome em funções
-- SECURITY DEFINER. Envolto em DO/EXCEPTION para ser resiliente caso alguma
-- assinatura difira no ambiente (não falha a migration inteira).
DO $$ BEGIN
  ALTER FUNCTION public.enqueue_email(text, jsonb)
    SET search_path = public, pgmq, extensions;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'enqueue_email(text,jsonb) não encontrada — ignorando';
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.read_email_batch(text, integer, integer)
    SET search_path = public, pgmq, extensions;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'read_email_batch(text,integer,integer) não encontrada — ignorando';
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.delete_email(text, bigint)
    SET search_path = public, pgmq, extensions;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'delete_email(text,bigint) não encontrada — ignorando';
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb)
    SET search_path = public, pgmq, extensions;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'move_to_dlq(text,text,bigint,jsonb) não encontrada — ignorando';
END $$;
