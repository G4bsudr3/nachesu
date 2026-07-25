
-- ===== get_public_dossier =====
-- retorna dados agregados do dossiê de um aluno da eletiva economia-circular
-- SECURITY DEFINER porque é lido pela página pública /dossie/:userId
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
    'email', u.email,
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

-- ===== admin_module20_stats =====
CREATE OR REPLACE FUNCTION public.admin_module20_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_mid_20 uuid;
  v_total int;
  v_entregas int;
  v_dim jsonb;
  v_nota numeric;
  v_palavras jsonb;
  v_feedbacks jsonb;
  v_candidatos jsonb;
BEGIN
  -- guard: só admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'apenas administradores';
  END IF;

  SELECT id INTO v_course_id FROM public.courses WHERE slug='economia-circular' LIMIT 1;
  SELECT id INTO v_mid_20 FROM public.modules m JOIN public.trails t ON t.id=m.trail_id WHERE t.course_id=v_course_id AND m.number=20 LIMIT 1;

  SELECT COUNT(*) INTO v_total FROM public.enrollments WHERE course_id=v_course_id;

  -- entregas com fechamento_avaliacao completo
  WITH aval AS (
    SELECT
      d.user_id,
      (SELECT value FROM jsonb_each(COALESCE(d.content->'fechamento_avaliacao','{}'::jsonb)) LIMIT 1) AS av
    FROM public.module_deliverables d
    WHERE d.module_id = v_mid_20
  ),
  aval_ok AS (
    SELECT user_id, av FROM aval WHERE av IS NOT NULL AND av ? 'nota_geral'
  )
  SELECT
    COUNT(*),
    ROUND(AVG((av->>'nota_geral')::numeric), 1),
    jsonb_build_object(
      'dim_conhecimento', ROUND(AVG((av->>'dim_conhecimento')::numeric)::numeric, 1),
      'dim_confianca', ROUND(AVG((av->>'dim_confianca')::numeric)::numeric, 1),
      'dim_pesquisa', ROUND(AVG((av->>'dim_pesquisa')::numeric)::numeric, 1),
      'dim_teste', ROUND(AVG((av->>'dim_teste')::numeric)::numeric, 1),
      'dim_coragem', ROUND(AVG((av->>'dim_coragem')::numeric)::numeric, 1)
    )
  INTO v_entregas, v_nota, v_dim
  FROM aval_ok;

  -- top palavras
  WITH aval AS (
    SELECT
      LOWER(TRIM((SELECT value FROM jsonb_each(COALESCE(d.content->'fechamento_avaliacao','{}'::jsonb)) LIMIT 1)->>'palavra_resumo')) AS palavra
    FROM public.module_deliverables d
    WHERE d.module_id = v_mid_20
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('palavra', palavra, 'n', n) ORDER BY n DESC), '[]'::jsonb)
  INTO v_palavras
  FROM (
    SELECT palavra, COUNT(*) AS n
    FROM aval
    WHERE palavra IS NOT NULL AND palavra <> ''
    GROUP BY palavra
    ORDER BY n DESC
    LIMIT 30
  ) t;

  -- feedbacks
  WITH aval AS (
    SELECT
      d.user_id,
      (SELECT value FROM jsonb_each(COALESCE(d.content->'fechamento_avaliacao','{}'::jsonb)) LIMIT 1) AS av
    FROM public.module_deliverables d
    WHERE d.module_id = v_mid_20
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'aluno', COALESCE(pr.display_name, split_part(u.email, '@', 1)),
      'funcionou', COALESCE(av->>'funcionou',''),
      'mudaria', COALESCE(av->>'mudaria',''),
      'nota', COALESCE((av->>'nota_geral')::int, 0),
      'palavra', COALESCE(av->>'palavra_resumo','')
    ) ORDER BY (av->>'nota_geral')::int DESC NULLS LAST
  ), '[]'::jsonb)
  INTO v_feedbacks
  FROM aval a
  JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = a.user_id
  WHERE a.av IS NOT NULL AND a.av ? 'funcionou';

  -- candidatos a piloto: coragem >= 7 e nota >= 8
  WITH aval AS (
    SELECT
      d.user_id,
      (SELECT value FROM jsonb_each(COALESCE(d.content->'fechamento_avaliacao','{}'::jsonb)) LIMIT 1) AS av,
      (SELECT value FROM jsonb_each(COALESCE(d.content->'pitch_final','{}'::jsonb)) LIMIT 1) AS pf
    FROM public.module_deliverables d
    WHERE d.module_id = v_mid_20
  ),
  changelog AS (
    SELECT
      d.user_id,
      (SELECT value FROM jsonb_each(COALESCE(d.content->'changelog_aula18','{}'::jsonb)) LIMIT 1)->'proposta_v2' AS proposta_v2
    FROM public.module_deliverables d
    JOIN public.modules m ON m.id = d.module_id
    JOIN public.trails t ON t.id = m.trail_id
    WHERE t.course_id = v_course_id AND m.number = 18
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'aluno_id', a.user_id,
      'nome', COALESCE(pr.display_name, split_part(u.email, '@', 1)),
      'frase_ancora', c.proposta_v2->>'frase_ancora',
      'hook', a.pf->>'hook',
      'dim_coragem', (a.av->>'dim_coragem')::int,
      'nota_geral', (a.av->>'nota_geral')::int
    ) ORDER BY (a.av->>'nota_geral')::int DESC
  ), '[]'::jsonb)
  INTO v_candidatos
  FROM aval a
  JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = a.user_id
  LEFT JOIN changelog c ON c.user_id = a.user_id
  WHERE (a.av->>'dim_coragem')::int >= 7
    AND (a.av->>'nota_geral')::int >= 8;

  RETURN jsonb_build_object(
    'total_alunos', v_total,
    'entregas_completas', v_entregas,
    'dim_medias', v_dim,
    'nota_media', v_nota,
    'palavras', v_palavras,
    'feedbacks', v_feedbacks,
    'candidatos_piloto', v_candidatos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module20_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module20_stats() TO authenticated, service_role;
