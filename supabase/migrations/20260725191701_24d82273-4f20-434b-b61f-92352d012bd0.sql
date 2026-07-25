-- =====================================================
-- Aula 15 · Suposições e Riscos (Fechamento Trilha Criar)
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module15_suposicoes_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id UUID;
  _pill_id UUID;
  _total_students INT;
  _completed INT;
  _submitted INT := 0;
  _com_3 INT := 0;
  _com_risco_acao INT := 0;
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

  SELECT id INTO _pill_id
  FROM public.module_pills
  WHERE module_id = _module_id
    AND (interaction_schema->>'type') = 'suposicoes_riscos'
  ORDER BY order_index
  LIMIT 1;

  SELECT COUNT(DISTINCT e.user_id) INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON e.course_id = c.id
  WHERE c.slug = _course_slug;

  SELECT COUNT(*) INTO _completed
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id AND smp.completed_at IS NOT NULL;

  IF _pill_id IS NOT NULL THEN
    WITH entregas AS (
      SELECT
        md.user_id,
        md.updated_at,
        (md.content #> ARRAY['suposicoes_riscos_aula15', _pill_id::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'suposicoes_riscos_aula15'
        AND (md.content -> 'suposicoes_riscos_aula15') ? _pill_id::text
    ),
    scored AS (
      SELECT
        e.user_id,
        e.updated_at,
        e.payload,
        (
          CASE WHEN length(coalesce(e.payload #>> ARRAY['suposicoes','publico','descricao'], '')) >= 40 THEN 1 ELSE 0 END
          + CASE WHEN length(coalesce(e.payload #>> ARRAY['suposicoes','proposta','descricao'], '')) >= 40 THEN 1 ELSE 0 END
          + CASE WHEN length(coalesce(e.payload #>> ARRAY['suposicoes','modelo','descricao'], '')) >= 40 THEN 1 ELSE 0 END
        ) AS n_suposicoes,
        (
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(coalesce(e.payload->'riscos', '[]'::jsonb)) r
          WHERE (r->>'impacto') IN ('alto','medio')
            AND (r->>'probabilidade') IN ('alta','media')
        ) AS n_acao
      FROM entregas e
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE n_suposicoes >= 3),
      COUNT(*) FILTER (WHERE n_acao >= 1)
    INTO _submitted, _com_3, _com_risco_acao
    FROM scored;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (
          CASE WHEN length(coalesce(md.content #>> ARRAY['suposicoes_riscos_aula15', _pill_id::text, 'suposicoes','publico','descricao'], '')) >= 40 THEN 1 ELSE 0 END
          + CASE WHEN length(coalesce(md.content #>> ARRAY['suposicoes_riscos_aula15', _pill_id::text, 'suposicoes','proposta','descricao'], '')) >= 40 THEN 1 ELSE 0 END
          + CASE WHEN length(coalesce(md.content #>> ARRAY['suposicoes_riscos_aula15', _pill_id::text, 'suposicoes','modelo','descricao'], '')) >= 40 THEN 1 ELSE 0 END
        ) AS n_suposicoes,
        (
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(coalesce(md.content #> ARRAY['suposicoes_riscos_aula15', _pill_id::text, 'riscos'], '[]'::jsonb)) r
          WHERE (r->>'impacto') IN ('alto','medio')
            AND (r->>'probabilidade') IN ('alta','media')
        ) AS n_riscos_acao,
        md.content #>> ARRAY['suposicoes_riscos_aula15', _pill_id::text, 'suposicoes','publico','descricao'] AS primeira_suposicao,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'suposicoes_riscos_aula15'
        AND (md.content -> 'suposicoes_riscos_aula15') ? _pill_id::text
      ORDER BY md.updated_at DESC
      LIMIT 20
    ) s;
  ELSE
    _samples := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'kpis', jsonb_build_object(
      'total_students', COALESCE(_total_students, 0),
      'completed_count', COALESCE(_completed, 0),
      'submitted_count', _submitted,
      'com_3_suposicoes', _com_3,
      'com_risco_acao', _com_risco_acao
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module15_suposicoes_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module15_suposicoes_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 15 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 15 · o que precisa ser verdade pra seu projeto funcionar?',
  objective = 'mapear 3 suposições críticas em dimensões distintas (público, proposta, modelo) e 3 riscos categorizados na matriz probabilidade × impacto, com plano de mitigação para os riscos de ação imediata.',
  updated_at = now()
WHERE id = '91e30f31-0e92-4b6e-9d60-70815b490650';

DELETE FROM public.module_pills WHERE module_id = '91e30f31-0e92-4b6e-9d60-70815b490650';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura
(
  '91e30f31-0e92-4b6e-9d60-70815b490650', 1, 'pilula_a',
  'o que precisa ser verdade pra seu projeto funcionar?',
  'hoje: 3 suposições críticas + 3 riscos reais.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Fechando a Trilha 3.\n\nVocê tem proposta de valor. Modelo de negócio. Tudo bonito no papel.\n\nAviso: bonito no papel é onde 90% dos projetos morrem. Porque tem coisa que a gente ASSUME sem perceber.\n\nExemplo real: "as pessoas vão querer pedir refeição antecipada". Você ASSUME. Mas talvez elas prefiram decidir na hora, olhando o que tem. Se você não testar essa suposição, você constrói o app inteiro e descobre que ninguém usa.\n\nIsso é suposição crítica. E toda proposta tem 3-5 delas.\n\nDiferente disso é RISCO. Risco é algo que pode dar errado mesmo se suas suposições estiverem certas. Ex: bug no app, atraso de fornecedor, mudança de regulação.\n\nConfundir os dois é comum. Não confunde.\n\nHoje você mapeia: 3 suposições críticas e 3 riscos. Na próxima aula você escolhe UMA suposição pra testar antes de investir mais.\n\nBora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2. conteúdo curado
(
  '91e30f31-0e92-4b6e-9d60-70815b490650', 2, 'pilula_b',
  'lean startup · o que testar antes de construir',
  'referências rápidas: sebrae + riskiest assumption test.',
  true, 8, 12,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'sebrae-lean-startup',
        'title', 'entenda o que é lean startup',
        'source', 'Sebrae',
        'duration', '~7 min',
        'language', 'português',
        'url', 'https://sebrae.com.br/sites/PortalSebrae/artigos/artigoshome/entenda-o-que-e-lean-startup,03ebb2a178c83410VgnVCM1000003b74010aRCRD',
        'description', 'sebrae explica lean startup em pt, com aplicação br. foca no conceito de mvp e ciclo construir-medir-aprender.'
      ),
      jsonb_build_object(
        'id', 'rat-evolvemvp',
        'title', 'riskiest assumption test · o que testar primeiro',
        'source', 'Evolve MVP',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://evolvemvp.com/o-que-e-lean-startup/',
        'description', 'conceito-chave: qual suposição, se for FALSA, mata o projeto? essa é a que se testa primeiro.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-sup-vs-risco',
        'type', 'single_choice',
        'label', 'qual destas é uma SUPOSIÇÃO (não um risco)?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'o servidor pode cair', 'value', 'a'),
          jsonb_build_object('label', 'as pessoas vão pagar R$20 por essa solução', 'value', 'b'),
          jsonb_build_object('label', 'a regulação pode mudar', 'value', 'c'),
          jsonb_build_object('label', 'meu sócio pode desistir', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. suposição é sobre hipótese de comportamento/valor. risco é sobre eventos adversos. as três alternativas erradas são riscos.',
        'feedback_wrong', 'as três erradas são eventos externos — risco. suposição é sobre HIPÓTESE de comportamento ou valor: "as pessoas vão pagar r$20".'
      ),
      jsonb_build_object(
        'id', 'q2-rat',
        'type', 'single_choice',
        'label', 'segundo o RAT, qual suposição TESTAR primeiro?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'a mais fácil de testar', 'value', 'a'),
          jsonb_build_object('label', 'a mais crítica: se for falsa, mata o projeto', 'value', 'b'),
          jsonb_build_object('label', 'a mais barata de testar', 'value', 'c'),
          jsonb_build_object('label', 'a que você mais confia', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'isso. não é sobre o teste fácil — é sobre o teste que evita você gastar 6 meses no que não funciona. se a suposição mais crítica é falsa, você economiza tudo.',
        'feedback_wrong', 'não é fácil, nem barato, nem confortável. é a CRÍTICA: aquela que, se for falsa, mata o projeto inteiro.'
      ),
      jsonb_build_object(
        'id', 'q3-se-falsa',
        'type', 'long_text',
        'label', 'se sua suposição mais crítica for FALSA, o que exatamente acontece com o seu projeto?',
        'min_chars', 100
      )
    )
  )
),
-- 3. PBL · mapa de suposições e riscos
(
  '91e30f31-0e92-4b6e-9d60-70815b490650', 3, 'exercicio_pbl',
  'mapa de suposições e riscos',
  '3 suposições em dimensões diferentes (público, proposta, modelo) + 3 riscos na matriz probabilidade × impacto. puxamos sua proposta da aula 13 e seu bmc da aula 14.',
  true, 22, 32,
  jsonb_build_object(
    'type', 'suposicoes_riscos',
    'proposta_source_module_id', 'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51',
    'bmc_source_module_id', '0b394fff-3c00-4d18-860c-25390e28cceb',
    'dimensoes', jsonb_build_array(
      jsonb_build_object(
        'id', 'publico',
        'titulo', 'sobre o PÚBLICO',
        'hint', 'estou assumindo que [público] realmente [ação/comportamento].',
        'exemplo', 'estou assumindo que alunos do 1º ano querem pedir refeição via app com 1 dia de antecedência.'
      ),
      jsonb_build_object(
        'id', 'proposta',
        'titulo', 'sobre a PROPOSTA DE VALOR',
        'hint', 'estou assumindo que o valor entregue é [valor] e que isso resolve [dor].',
        'exemplo', 'estou assumindo que economizar 15 min na fila é motivo suficiente pra baixar mais um app.'
      ),
      jsonb_build_object(
        'id', 'modelo',
        'titulo', 'sobre o MODELO DE NEGÓCIO',
        'hint', 'estou assumindo que [alguém] paga [quanto] por [motivo].',
        'exemplo', 'estou assumindo que a escola paga r$ 800/mês por licença pra reduzir desperdício na cantina.'
      )
    ),
    'riscos', jsonb_build_object('total', 3, 'min_chars', 20),
    'completion', jsonb_build_object('label', 'entregar mapa')
  )
),
-- 4. checagem
(
  '91e30f31-0e92-4b6e-9d60-70815b490650', 4, 'pilula_c',
  'checagem · suposição × risco',
  '3 perguntas rápidas antes de fechar a trilha.',
  true, 4, 6,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-chuva',
        'type', 'single_choice',
        'label', 'aluno escreveu como suposição: "não vai chover no dia do meu teste". isso é:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'suposição válida', 'value', 'a'),
          jsonb_build_object('label', 'isso é RISCO, não suposição', 'value', 'b'),
          jsonb_build_object('label', 'isso é obstáculo', 'value', 'c'),
          jsonb_build_object('label', 'não conta', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. chuva é evento externo — risco. suposição é sobre valor, comportamento, disposição a pagar.',
        'feedback_wrong', 'chuva é evento externo que independe do seu produto — isso é risco. suposição é sobre valor, comportamento, disposição a pagar.'
      ),
      jsonb_build_object(
        'id', 'q2-sup-bem-escrita',
        'type', 'multi_select',
        'label', 'uma suposição bem escrita:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'pode ser TESTADA com um experimento', 'value', 'a'),
          jsonb_build_object('label', 'tem SUJEITO específico (quem?)', 'value', 'b'),
          jsonb_build_object('label', 'tem AÇÃO específica (o quê?)', 'value', 'c'),
          jsonb_build_object('label', 'pode ser VERDADEIRA ou FALSA', 'value', 'd'),
          jsonb_build_object('label', 'é sempre otimista', 'value', 'e')
        ),
        'correct', jsonb_build_array('a', 'b', 'c', 'd'),
        'feedback_correct', 'exato. suposição boa é falsificável, tem sujeito e ação específicos e cabe num experimento. otimismo não entra na definição.',
        'feedback_wrong', 'as quatro primeiras são verdadeiras. otimismo não entra: suposição boa é neutra, específica e testável.'
      ),
      jsonb_build_object(
        'id', 'q3-mais-riscada',
        'type', 'long_text',
        'label', 'das suas 3 suposições, qual você acha que é MAIS RISCADA (mais chance de estar errada)? por quê? (essa vai virar o experimento da próxima aula.)',
        'min_chars', 100
      )
    )
  )
),
-- 5. bônus
(
  '91e30f31-0e92-4b6e-9d60-70815b490650', 5, 'registro',
  'bônus · o ciclo lean startup em vídeo',
  'prepara trilha 4. se assistir, você chega no encontro 16 mais rápido.',
  false, 8, 15,
  jsonb_build_object(
    'type', 'bonus_text',
    'card', jsonb_build_object(
      'title', 'como testar suas hipóteses · método lean startup',
      'source', 'busca no youtube · português',
      'duration', '~10 min',
      'url', 'https://www.youtube.com/results?search_query=como+testar+hip%C3%B3teses+lean+startup+portugu%C3%AAs',
      'description', 'busca curada em pt de vídeos que explicam o ciclo construir-medir-aprender. escolhe um de 5-10 min e assiste antes do encontro 16.'
    )
  )
);