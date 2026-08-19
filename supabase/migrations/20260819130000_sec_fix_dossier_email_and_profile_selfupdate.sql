-- ============================================================================
-- SEC FIX (2026-08-19) — auditoria RLS sobre o estado efetivo das migrations
--
-- FIX 1 [ALTO/LGPD]: get_public_dossier vazava o e-mail do aluno (auth.users.email)
--   para anon na página pública /dossie/:userId. Remove o campo `email` do payload.
--   O front usa `nome` (COALESCE(display_name, prefixo do email)), que segue populado,
--   então nada quebra. Mantém o dossiê público por UUID (feature intencional).
--
-- FIX 2 [MÉDIO]: profiles tinha UPDATE do próprio perfil SEM WITH CHECK + GRANT UPDATE
--   de tabela inteira -> aluno 'pending' podia se auto-aprovar (status='active').
--   Trigger bloqueia mudança de status/approved_* por quem não é admin.
--
-- Idempotente e seguro pra colar no SQL editor do Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- FIX 1 — get_public_dossier sem e-mail
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_dossier(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_result jsonb;
  v_aluno jsonb;
  v_evidencias jsonb;
  v_stakeholders jsonb;
  v_fluxo jsonb;
  v_proposta jsonb;
  v_bmc jsonb;
  v_impactos jsonb;
  v_suposicoes jsonb;
  v_experimento jsonb;
  v_pitch jsonb;
  v_carta jsonb;
  v_gerado_em text;
  v_mid_4 uuid; v_mid_6 uuid; v_mid_9 uuid; v_mid_10 uuid;
  v_mid_15 uuid; v_mid_17 uuid; v_mid_18 uuid; v_mid_20 uuid;
BEGIN
  -- identifica o curso
  SELECT id INTO v_course_id FROM public.courses WHERE slug='economia-circular' LIMIT 1;
  IF v_course_id IS NULL THEN RETURN NULL; END IF;

  -- dados do aluno
  SELECT jsonb_build_object(
    'nome', COALESCE(p.display_name, split_part(u.email, '@', 1)),
    'avatar_url', p.avatar_url
  ) INTO v_aluno
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = p_user_id;

  IF v_aluno IS NULL THEN RETURN NULL; END IF;

  -- resolve module_ids da eletiva economia-circular
  SELECT id INTO v_mid_4 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=4 LIMIT 1;
  SELECT id INTO v_mid_6 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=6 LIMIT 1;
  SELECT id INTO v_mid_9 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=9 LIMIT 1;
  SELECT id INTO v_mid_10 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=10 LIMIT 1;
  SELECT id INTO v_mid_15 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=15 LIMIT 1;
  SELECT id INTO v_mid_17 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=17 LIMIT 1;
  SELECT id INTO v_mid_18 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=18 LIMIT 1;
  SELECT id INTO v_mid_20 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=20 LIMIT 1;

  -- extrai o primeiro registro de cada mapa (Object.values()[0])
  -- helper inline: pega o primeiro valor de um objeto JSON
  SELECT (SELECT value FROM jsonb_each(COALESCE(content->'caca_evidencias','{}'::jsonb)) LIMIT 1)->'evidencias'
    INTO v_evidencias
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_4;

  SELECT (SELECT value FROM jsonb_each(COALESCE(content->'mapa_fluxo_aula6','{}'::jsonb)) LIMIT 1)
    INTO v_fluxo
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_6;

  SELECT (SELECT value FROM jsonb_each(COALESCE(content->'impactos_aula9','{}'::jsonb)) LIMIT 1)
    INTO v_impactos
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_9;

  SELECT (SELECT value FROM jsonb_each(COALESCE(content->'stakeholders_aula10','{}'::jsonb)) LIMIT 1)
    INTO v_stakeholders
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_10;

  SELECT (SELECT value FROM jsonb_each(COALESCE(content->'suposicoes_riscos_aula15','{}'::jsonb)) LIMIT 1)
    INTO v_suposicoes
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_15;

  SELECT (SELECT value FROM jsonb_each(COALESCE(content->'experimento_resultado_aula17','{}'::jsonb)) LIMIT 1)
    INTO v_experimento
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_17;

  -- aula 18: changelog_aula18 tem proposta_v2 e bmc_v2 aninhados
  SELECT
    (SELECT value FROM jsonb_each(COALESCE(content->'changelog_aula18','{}'::jsonb)) LIMIT 1)->'proposta_v2',
    (SELECT value FROM jsonb_each(COALESCE(content->'changelog_aula18','{}'::jsonb)) LIMIT 1)->'bmc_v2'
    INTO v_proposta, v_bmc
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_18;

  -- aula 20: pitch_final + carta_encerramento + mini_dossie
  SELECT
    (SELECT value FROM jsonb_each(COALESCE(content->'pitch_final','{}'::jsonb)) LIMIT 1),
    (SELECT value FROM jsonb_each(COALESCE(content->'carta_encerramento','{}'::jsonb)) LIMIT 1),
    ((SELECT value FROM jsonb_each(COALESCE(content->'mini_dossie','{}'::jsonb)) LIMIT 1))->>'gerado_em'
    INTO v_pitch, v_carta, v_gerado_em
    FROM public.module_deliverables WHERE user_id=p_user_id AND module_id=v_mid_20;

  -- adapta pitch pra o formato esperado pelo front (usa video_url e blocos)
  IF v_pitch IS NOT NULL THEN
    v_pitch := jsonb_build_object(
      'video_url', v_pitch->>'video_url',
      'hook', v_pitch->>'hook',
      'problema', v_pitch->>'problema',
      'solucao', v_pitch->>'solucao',
      'regenera', v_pitch->>'regenera',
      'modelo', v_pitch->>'modelo',
      'chamada', v_pitch->>'chamada'
    );
  END IF;

  v_result := jsonb_build_object(
    'aluno', v_aluno,
    'gerado_em', v_gerado_em,
    'evidencias', v_evidencias,
    'stakeholders', v_stakeholders,
    'fluxo_circular', v_fluxo,
    'proposta_v2', v_proposta,
    'bmc_v2', v_bmc,
    'impactos', v_impactos,
    'suposicoes', v_suposicoes,
    'riscos', NULL,
    'experimento', v_experimento,
    'pitch', v_pitch,
    'carta', v_carta
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_dossier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_dossier(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- FIX 2 — impede auto-aprovação de perfil (status/approved_* só por admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin pode tudo; demais não podem mexer em status/aprovação do próprio perfil
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by_admin_id IS DISTINCT FROM OLD.approved_by_admin_id THEN
      RAISE EXCEPTION 'sem permissão para alterar status/aprovação do perfil';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_cols() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_cols ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_cols();
