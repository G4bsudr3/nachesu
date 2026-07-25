
-- =====================================================
-- Aula 17 · Mãos à obra (2 sessões · execução + registro)
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module17_registro_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 17
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id UUID;
  _pill_registro UUID;
  _pill_em_campo UUID;
  _total_students INT;
  _completed INT;
  _entregas INT := 0;
  _em_campo INT := 0;
  _atingiu INT := 0;
  _parcial INT := 0;
  _nao_atingiu INT := 0;
  _atalho INT := 0;
  _samples JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT m.id INTO _module_id
  FROM public.modules m
  JOIN public.trails t ON m.trail_id = t.id
  JOIN public.courses c ON t.course_id = c.id
  WHERE c.slug = _course_slug AND m.number = _module_number
  LIMIT 1;

  IF _module_id IS NULL THEN
    RETURN jsonb_build_object('error', 'module not found');
  END IF;

  SELECT id INTO _pill_registro
  FROM public.module_pills
  WHERE module_id = _module_id
    AND (interaction_schema->>'type') = 'registro_resultado'
  ORDER BY order_index
  LIMIT 1;

  SELECT id INTO _pill_em_campo
  FROM public.module_pills
  WHERE module_id = _module_id
    AND (interaction_schema->>'type') = 'em_campo'
  ORDER BY order_index
  LIMIT 1;

  SELECT COUNT(DISTINCT e.user_id) INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON e.course_id = c.id
  WHERE c.slug = _course_slug;

  SELECT COUNT(*) INTO _completed
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id AND smp.completed_at IS NOT NULL;

  IF _pill_em_campo IS NOT NULL THEN
    SELECT COUNT(*) INTO _em_campo
    FROM public.module_deliverables md
    WHERE md.module_id = _module_id
      AND md.content ? 'em_campo_aula17'
      AND (md.content -> 'em_campo_aula17') ? _pill_em_campo::text;
  END IF;

  IF _pill_registro IS NOT NULL THEN
    WITH entregas AS (
      SELECT
        md.user_id,
        md.updated_at,
        (md.content #> ARRAY['experimento_resultado_aula17', _pill_registro::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'experimento_resultado_aula17'
        AND (md.content -> 'experimento_resultado_aula17') ? _pill_registro::text
    ),
    scored AS (
      SELECT
        e.user_id,
        e.updated_at,
        e.payload,
        (e.payload->>'criterio_resultado') AS criterio,
        (e.payload->>'honestidade_atalho') AS honestidade
      FROM entregas e
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE criterio = 'atingiu'),
      COUNT(*) FILTER (WHERE criterio = 'parcial'),
      COUNT(*) FILTER (WHERE criterio = 'nao_atingiu'),
      COUNT(*) FILTER (WHERE honestidade = 'sim')
    INTO _entregas, _atingiu, _parcial, _nao_atingiu, _atalho
    FROM scored;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (md.content #>> ARRAY['experimento_resultado_aula17', _pill_registro::text, 'criterio_resultado']) AS criterio_resultado,
        (md.content #>> ARRAY['experimento_resultado_aula17', _pill_registro::text, 'honestidade_atalho']) AS honestidade_atalho,
        (md.content #>> ARRAY['experimento_resultado_aula17', _pill_registro::text, 'o_que_fez']) AS o_que_fez,
        COALESCE(jsonb_array_length(md.content #> ARRAY['experimento_resultado_aula17', _pill_registro::text, 'evidencias']), 0) AS n_evidencias,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'experimento_resultado_aula17'
        AND (md.content -> 'experimento_resultado_aula17') ? _pill_registro::text
      ORDER BY md.updated_at DESC
      LIMIT 20
    ) s;
  ELSE
    _samples := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_registro,
    'kpis', jsonb_build_object(
      'total_students', COALESCE(_total_students, 0),
      'completed_count', COALESCE(_completed, 0),
      'em_campo', _em_campo,
      'entregas', _entregas,
      'atingiu', _atingiu,
      'parcial', _parcial,
      'nao_atingiu', _nao_atingiu,
      'admitiu_atalho', _atalho
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module17_registro_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module17_registro_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 17 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 17 · mãos à obra',
  objective = 'executar o experimento planejado na aula 16, com instrumento de coleta adequado ao método, e voltar pra registrar resultados com evidências e critério auditados.',
  updated_at = now()
WHERE id = 'cc641e88-9f76-4e9d-836f-d85355d6d6c6';

DELETE FROM public.module_pills WHERE module_id = 'cc641e88-9f76-4e9d-836f-d85355d6d6c6';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura parte 1
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 1, 'pilula_a',
  'mãos à obra',
  'hoje você larga. depois volta pra registrar.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Aula diferente hoje. A maior parte do trabalho acontece FORA daqui.\n\nVocê planejou o experimento. Agora vai FAZER.\n\nRegra 1: não conta pra ninguém envolvido no teste o que você está esperando. Se você contar, vai enviesar.\n\nRegra 2: registra TUDO. Foto, áudio, número. Mesmo o que parece irrelevante. Detalhe pode importar.\n\nRegra 3: se der um resultado que você não gosta, RESISTA à tentação de mudar critério. Critério é sagrado, foi definido antes.\n\nVocê tem 5-10 dias pra executar. Depois volta aqui e registra. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'planejar registro')
  )
),
-- 2. conteúdo curado + pergunta única
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 2, 'pilula_b',
  'como registrar bem · observação × interpretação',
  'revisita o design kit (ideo) com foco em COMO registrar, e um lembrete sobre feedback negativo.',
  true, 6, 10,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'ideo-registro',
        'title', 'design kit ideo · métodos de coleta',
        'source', 'IDEO / Aela',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://www.aela.io/design-thinking-metodos-e-ferramentas/',
        'description', 'revisita o material da aula 4 focando agora em COMO REGISTRAR: entrevista, observação, foto/áudio, ficha.'
      ),
      jsonb_build_object(
        'id', 'feedback-negativo',
        'title', 'a importância do feedback negativo',
        'source', 'Endeavor Brasil',
        'duration', '~5 min',
        'language', 'português',
        'url', 'https://endeavor.org.br/estrategia-e-gestao/feedback-negativo/',
        'description', 'feedback negativo é o mais valioso. aprender a receber sem se defender.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-registro',
        'type', 'multi_choice',
        'label', 'marca as regras do bom registro:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'registro EM TEMPO REAL, não depois de memória', 'correct', true),
          jsonb_build_object('id', 'b', 'label', 'separa OBSERVAÇÃO (fato) de INTERPRETAÇÃO (leitura)', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'aceita silêncio como dado', 'correct', true),
          jsonb_build_object('id', 'd', 'label', 'anota o que INCOMODA, geralmente é o mais valioso', 'correct', true),
          jsonb_build_object('id', 'e', 'label', 'foca só no que confirma sua hipótese')
        ),
        'feedback_correct', 'boa. registro é dado, não é redação. tempo real, fato antes de leitura, e o incômodo revela mais do que o elogio.',
        'feedback_incorrect', 'foca só no que confirma é viés de confirmação. o resto vale.'
      )
    )
  )
),
-- 3. PBL parte 1 · instrumento de coleta
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 3, 'exercicio_pbl',
  'instrumento de coleta · parte 1',
  'monta o instrumento certo pro método que você escolheu na aula 16 + cronograma refinado.',
  true, 15, 25,
  jsonb_build_object(
    'type', 'instrumento_coleta',
    'plano_source_module_id', '7160cf7c-e416-4122-bb77-b6958c3171b0',
    'completion', jsonb_build_object('label', 'salvar e ir executar')
  )
),
-- 4. checagem parte 1
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 4, 'pilula_c',
  'observação × interpretação',
  'antes de sair, calibra o olho pra separar fato de leitura.',
  true, 4, 7,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'p1-obs',
        'type', 'multi_choice',
        'label', 'ao registrar dados, marca o que é OBSERVAÇÃO (não interpretação):',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', '"5 pessoas clicaram no botão"', 'correct', true),
          jsonb_build_object('id', 'b', 'label', '"as pessoas ficaram animadas"'),
          jsonb_build_object('id', 'c', 'label', '"entrevistado A pausou por 4 segundos antes de responder"', 'correct', true),
          jsonb_build_object('id', 'd', 'label', '"meu projeto foi bem aceito"'),
          jsonb_build_object('id', 'e', 'label', '"3 de 5 entrevistados usaram a palavra ''complicado''"', 'correct', true)
        ),
        'feedback_correct', 'boa. observações são fatos verificáveis: número, pausa medida, palavra específica. "ficou animado" e "foi bem aceito" são leituras suas, entram depois.',
        'feedback_incorrect', 'observação = verificável por outra pessoa. interpretação = leitura sua. separa os dois no registro.'
      )
    )
  )
),
-- 5. em campo (tela de espera)
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 5, 'pilula_c',
  'experimento em campo',
  'você pode fechar essa aba e voltar quando terminar de executar.',
  true, 1, 2,
  jsonb_build_object(
    'type', 'em_campo',
    'headline', 'experimento em campo',
    'body', 'sua missão: executar o experimento e registrar tudo. quando terminar, volta aqui e libera a parte 2. sem pressa, mas sem eterno.',
    'completion', jsonb_build_object('label', 'voltei, quero registrar')
  )
),
-- 6. abertura parte 2
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 6, 'pilula_a',
  'voltou. e aí, cientista?',
  'antes de registrar, uma respirada honesta.',
  true, 2, 3,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Você voltou. Ótimo.\n\nAntes de registrar, respira. E responde honestamente:\n\nVocê EXECUTOU como planejou? Ou tomou atalho?\n\nO critério de sucesso, você respeitou? Ou tentou "flexibilizar" porque não gostou dos números?\n\nNão julgo, mas quero honestidade. Ciência só funciona com honestidade sobre o que aconteceu de verdade. Bora registrar.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'ir pro registro')
  )
),
-- 7. PBL parte 2 · registro resultado
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 7, 'exercicio_pbl',
  'registro dos resultados · parte 2',
  'formulário estruturado com evidências (mín 2), critério e honestidade.',
  true, 15, 25,
  jsonb_build_object(
    'type', 'registro_resultado',
    'plano_source_module_id', '7160cf7c-e416-4122-bb77-b6958c3171b0',
    'min_evidencias', 2,
    'max_evidencias', 6,
    'completion', jsonb_build_object('label', 'entregar resultado')
  )
),
-- 8. bônus podcast
(
  'cc641e88-9f76-4e9d-836f-d85355d6d6c6', 8, 'pilula_c',
  'bônus · fracassos que ensinaram',
  'escuta gente que testou e falhou, e como isso virou aprendizado.',
  false, 4, 8,
  jsonb_build_object(
    'type', 'bonus',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'como-eu-fiz-isso',
        'title', 'como eu fiz isso · endeavor',
        'source', 'Endeavor Brasil',
        'duration', 'episódios de ~30 min',
        'language', 'português',
        'url', 'https://endeavor.org.br/podcast-endeavor-brasil/',
        'description', 'empreendedores contam o que deu errado antes de dar certo. se seu experimento falhou, você tá em ótima companhia.'
      )
    ),
    'reflection', jsonb_build_object(
      'label', 'que "fracasso" seu virou aprendizado dessa vez?',
      'min_length', 50,
      'optional', true
    )
  )
);
