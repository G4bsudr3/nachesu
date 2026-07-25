
-- =====================================================
-- Aula 18 · o que você aprendeu, e o que vai mudar
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module18_changelog_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 18
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id UUID;
  _pill UUID;
  _total_students INT;
  _completed INT;
  _entregas INT := 0;
  _pivot INT := 0;
  _persevere INT := 0;
  _desistir INT := 0;
  _media NUMERIC := 0;
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

  SELECT id INTO _pill
  FROM public.module_pills
  WHERE module_id = _module_id
    AND (interaction_schema->>'type') = 'changelog_v2'
  ORDER BY order_index
  LIMIT 1;

  SELECT COUNT(DISTINCT e.user_id) INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON e.course_id = c.id
  WHERE c.slug = _course_slug;

  SELECT COUNT(*) INTO _completed
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id AND smp.completed_at IS NOT NULL;

  IF _pill IS NOT NULL THEN
    WITH entregas AS (
      SELECT
        md.user_id,
        md.updated_at,
        (md.content #> ARRAY['changelog_aula18', _pill::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'changelog_aula18'
        AND (md.content -> 'changelog_aula18') ? _pill::text
    ),
    scored AS (
      SELECT
        e.user_id,
        e.updated_at,
        e.payload,
        (e.payload #>> ARRAY['diagnostico', 'resultado']) AS resultado,
        (e.payload #>> ARRAY['diagnostico', 'decisao']) AS decisao,
        COALESCE(jsonb_array_length(e.payload -> 'mudancas'), 0) AS n_mudancas
      FROM entregas e
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE resultado = 'refutou' AND decisao = 'pivot'),
      COUNT(*) FILTER (WHERE resultado = 'validou'),
      COUNT(*) FILTER (WHERE resultado = 'refutou' AND decisao = 'desistir'),
      COALESCE(ROUND(AVG(n_mudancas)::numeric, 1), 0)
    INTO _entregas, _pivot, _persevere, _desistir, _media
    FROM scored;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (md.content #>> ARRAY['changelog_aula18', _pill::text, 'diagnostico', 'resultado']) AS resultado,
        (md.content #>> ARRAY['changelog_aula18', _pill::text, 'diagnostico', 'decisao']) AS decisao,
        COALESCE(jsonb_array_length(md.content #> ARRAY['changelog_aula18', _pill::text, 'mudancas']), 0) AS n_mudancas,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'changelog_aula18'
        AND (md.content -> 'changelog_aula18') ? _pill::text
      ORDER BY md.updated_at DESC
      LIMIT 20
    ) s;
  ELSE
    _samples := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill,
    'kpis', jsonb_build_object(
      'total_students', COALESCE(_total_students, 0),
      'completed_count', COALESCE(_completed, 0),
      'entregas', _entregas,
      'pivot', _pivot,
      'persevere', _persevere,
      'desistir', _desistir,
      'media_mudancas', _media
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module18_changelog_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module18_changelog_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 18 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 18 · o que você aprendeu, e o que vai mudar',
  objective = 'transformar o resultado do experimento em versão 2 do projeto: diagnóstico honesto (pivot × persevere), changelog com mínimo 3 mudanças justificadas por dado, e proposta/BMC atualizados.',
  updated_at = now()
WHERE id = '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1';

DELETE FROM public.module_pills WHERE module_id = '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1 · abertura
(
  '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1', 1, 'pilula_a',
  'dado não é aprendizado',
  'aprendizado é quando você MUDA algo por causa do dado.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Você tem dados. Boa. Mas dado não é aprendizado. Aprendizado é quando você MUDA algo por causa do dado.\n\nNo Lean Startup tem 2 opções depois do teste. Uma: PIVOT, mudança estrutural, porque a suposição foi refutada e você precisa mudar de direção. Duas: PERSEVERE, continua no caminho, porque a suposição foi validada.\n\nErro comum: se experimento validou, aluno acha que não precisa iterar. Mentira. Toda validação abre novas perguntas.\n\nOutro erro: se experimento refutou, aluno joga tudo fora. Também errado. Pivot é mudar UMA coisa, não deletar o projeto.\n\nHoje você faz "registro de alterações", versão 2 da proposta e do modelo. Mínimo 3 mudanças justificadas por dados. Cada mudança amarrada a UM dado. "Achei melhor" não vale. "Porque 4 de 5 entrevistados disseram X" vale. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2 · conteúdo curado + quiz
(
  '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1', 2, 'pilula_b',
  'pivot × persevere · lean startup na vida real',
  'aprofunda o ciclo construir-medir-aprender e assiste casos brasileiros de pivot.',
  true, 8, 15,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'lean-infomoney',
        'title', 'lean startup · o ciclo construir-medir-aprender',
        'source', 'InfoMoney',
        'duration', '~8 min de leitura',
        'language', 'português',
        'url', 'https://www.infomoney.com.br/guias/lean-startup-metodologia-startup-enxuta/',
        'description', 'guia completo sobre o método enxuto. Foca na parte de pivot × persevere.'
      ),
      jsonb_build_object(
        'id', 'nubank-pivot',
        'title', 'a história do Nubank · pivots até virar o maior banco digital',
        'source', 'YouTube',
        'duration', '~10 min',
        'language', 'português',
        'url', 'https://www.youtube.com/results?search_query=nubank+historia+pivot',
        'description', 'case nacional famoso. Nubank testou várias hipóteses antes do cartão sem anuidade.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-pivot',
        'type', 'single_choice',
        'label', 'PIVOT significa:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'desistir do projeto'),
          jsonb_build_object('id', 'b', 'label', 'mudança estrutural em UM elemento chave (público, proposta, modelo) mantendo o resto', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'refazer tudo do zero'),
          jsonb_build_object('id', 'd', 'label', 'aceitar que estava errado')
        ),
        'feedback_correct', 'sacou. pivot é mudança cirúrgica, não amputação. instagram começou como app de check-in (burbn) e pivotou pra fotos mantendo a base de usuários e a infraestrutura.',
        'feedback_incorrect', 'pivot ≠ desistir. muda 1 elemento chave e preserva o resto.'
      ),
      jsonb_build_object(
        'id', 'q2-validou',
        'type', 'single_choice',
        'label', 'se experimento VALIDOU a suposição, você:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'não precisa mudar nada'),
          jsonb_build_object('id', 'b', 'label', 'persevera e identifica próxima suposição pra testar', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'segue direto pra construir tudo'),
          jsonb_build_object('id', 'd', 'label', 'comemora')
        ),
        'feedback_correct', 'validação é permissão pra investir MAIS TEMPO, e a atenção vai pra próxima suposição riscada. não é chegada.',
        'feedback_incorrect', 'validou = passe pro próximo risco. nunca é ponto final.'
      ),
      jsonb_build_object(
        'id', 'q3-manter',
        'type', 'long_text',
        'label', 'se você tivesse que MANTER SÓ 1 coisa da proposta original, o que seria?',
        'min_length', 30,
        'placeholder', 'a semente que sobrevive a qualquer pivot.'
      )
    )
  )
),
-- 3 · PBL changelog + v2
(
  '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1', 3, 'exercicio_pbl',
  'changelog + versão 2',
  'diagnóstico honesto, mínimo 3 mudanças com dado citado, e v2 da proposta e do BMC.',
  true, 20, 30,
  jsonb_build_object(
    'type', 'changelog_v2',
    'resultado_source_module_id', 'cc641e88-9f76-4e9d-836f-d85355d6d6c6',
    'proposta_source_module_id', 'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51',
    'bmc_source_module_id', '0b394fff-3c00-4d18-860c-25390e28cceb',
    'min_mudancas', 3,
    'completion', jsonb_build_object('label', 'entregar versão 2')
  )
),
-- 4 · checagem
(
  '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1', 4, 'pilula_c',
  'checagem · pivot bem justificado',
  'antes de fechar, calibra seu critério de "pivot bem feito".',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'p1-cenario',
        'type', 'single_choice',
        'label', 'aluno teve 8 de 10 entrevistados dizendo que NÃO usariam o app. escreveu: "mudei o público de alunos pra professores". isso é:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'bom pivot'),
          jsonb_build_object('id', 'b', 'label', 'pivot mal justificado, os dados dizem "não usariam" mas não apontam professores como novo público', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'perseverar'),
          jsonb_build_object('id', 'd', 'label', 'desistir')
        ),
        'feedback_correct', 'sacou. dado "alunos não usariam" NÃO IMPLICA "professores usariam". pra pivotar pra professores, precisa de dado que APONTE pra eles. sem isso, é adivinhação.',
        'feedback_incorrect', 'todo pivot precisa de dado que aponte pra nova direção, não só evidência de que a antiga falhou.'
      ),
      jsonb_build_object(
        'id', 'p2-changelog',
        'type', 'multi_choice',
        'label', 'um bom changelog:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'cita dado específico pra cada mudança', 'correct', true),
          jsonb_build_object('id', 'b', 'label', 'distingue mudança pequena de estrutural', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'assume que estar errado faz parte', 'correct', true),
          jsonb_build_object('id', 'd', 'label', 'muda tudo se der errado'),
          jsonb_build_object('id', 'e', 'label', 'explica em 1 frase por que a mudança agora', 'correct', true)
        ),
        'feedback_correct', 'bom changelog é honesto, cita dado, distingue tamanho da mudança e explica o porquê. mudar tudo é pânico, não iteração.',
        'feedback_incorrect', 'reveja: mudar tudo NÃO faz parte. o resto sim.'
      )
    )
  )
),
-- 5 · bônus
(
  '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1', 5, 'pilula_c',
  'bônus · slack começou como vídeo game',
  'cases históricos ajudam a normalizar pivot. não é falha, é aprendizado.',
  false, 4, 8,
  jsonb_build_object(
    'type', 'bonus',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'slack-glitch',
        'title', 'slack nasceu de um jogo fracassado (glitch)',
        'source', 'YouTube · search',
        'duration', '~10 min',
        'language', 'português / inglês legendado',
        'url', 'https://www.youtube.com/results?search_query=historia+do+slack+glitch+pivot',
        'description', 'stewart butterfield tentou fazer um jogo. o jogo morreu. a ferramenta interna de comunicação virou o slack.'
      ),
      jsonb_build_object(
        'id', 'instagram-burbn',
        'title', 'instagram começou como burbn (check-in por localização)',
        'source', 'Endeavor',
        'duration', '~5 min de leitura',
        'language', 'português',
        'url', 'https://endeavor.org.br/estrategia-e-gestao/instagram-pivot/',
        'description', 'pivotou eliminando 90% das features e focando SÓ em fotos com filtro.'
      )
    ),
    'reflection', jsonb_build_object(
      'label', 'qual desses cases se parece mais com o SEU projeto agora?',
      'min_length', 50,
      'optional', true
    )
  )
),
-- 6 · fechamento
(
  '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1', 6, 'pilula_a',
  'próxima semana: pitch',
  'versão 2 na mão. hora de preparar como contar a história.',
  true, 2, 3,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Você tem a v2. Boa. Semana que vem: pitch.\n\nPitch não é vender. É fazer alguém entender em 2 minutos o problema, quem sente essa dor, o que você propõe e por que agora.\n\nTrabalho de casa até lá: pratica contar seu projeto em voz alta pra 1 pessoa que não conhece. Cronometra. Se passou de 3 minutos, você tá enrolando.\n\nAté a próxima.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'finalizar módulo')
  )
);
