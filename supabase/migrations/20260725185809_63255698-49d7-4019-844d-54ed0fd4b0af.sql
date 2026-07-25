-- =====================================================
-- Aula 12 · Escolher é abandonar
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module12_selecao_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 12
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
  _rara INT := 0;
  _meio_obvia INT := 0;
  _obvia INT := 0;
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
    AND (interaction_schema->>'type') = 'selecao_ideia'
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
        (md.content #> ARRAY['selecao_aula12', _pill_id::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'selecao_aula12'
        AND (md.content -> 'selecao_aula12') ? _pill_id::text
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE payload->>'raridade' = 'rara'),
      COUNT(*) FILTER (WHERE payload->>'raridade' = 'meio_obvia'),
      COUNT(*) FILTER (WHERE payload->>'raridade' = 'obvia')
    INTO _submitted, _rara, _meio_obvia, _obvia
    FROM entregas
    WHERE (payload->>'ideia_final') IS NOT NULL
      AND length(trim(payload->>'ideia_final')) >= 3;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        md.content #>> ARRAY['selecao_aula12', _pill_id::text, 'ideia_final'] AS ideia_final,
        md.content #>> ARRAY['selecao_aula12', _pill_id::text, 'raridade']    AS raridade,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'selecao_aula12'
        AND (md.content -> 'selecao_aula12') ? _pill_id::text
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
      'raridade_rara', _rara,
      'raridade_meio_obvia', _meio_obvia,
      'raridade_obvia', _obvia
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module12_selecao_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module12_selecao_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 12 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 12 · escolher é abandonar',
  objective = 'converter 15-20 ideias em 1 escolha refinada em 3 versões, usando matriz impacto × viabilidade e filtro de raridade.',
  updated_at = now()
WHERE id = '726687a4-df3f-4e34-b6af-5cb4f59014ff';

DELETE FROM public.module_pills WHERE module_id = '726687a4-df3f-4e34-b6af-5cb4f59014ff';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura
(
  '726687a4-df3f-4e34-b6af-5cb4f59014ff', 1, 'pilula_a',
  'escolher é abandonar',
  'hoje uma ideia se torna sua. as outras 19 morrem.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Semana passada você despejou ideias. Hoje escolhe uma. Só uma.\n\nEsse é o momento mais difícil da eletiva — não porque é complexo, mas porque exige coragem. Toda escolha é abandono das outras.\n\nVou te ajudar com dois critérios. Um: IMPACTO. Se der certo, quanto valor gera? Dois: VIABILIDADE. Você consegue fazer em 8 semanas com recursos de aluno de EM?\n\nIdeia de alto impacto + baixa viabilidade = frustração. Ideia de alta viabilidade + baixo impacto = trabalho escolar. Você quer o meio-termo forte.\n\nAviso: existe uma armadilha. Toda turma cai. A ideia MAIS ÓBVIA parece a mais viável. É mentira. Óbvia = todo mundo já tentou = tem barreira que você não vê.\n\nUm critério extra pra ganhar nota alta na eletiva: RARIDADE. Ideia rara vale mais.\n\nDepois de escolher, você vai REFINAR — 3 versões da mesma ideia. Cada uma um pouco diferente. Isso não é enfeite — é como você descobre qual versão é a boa.\n\nBora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2. conteúdo curado
(
  '726687a4-df3f-4e34-b6af-5cb4f59014ff', 2, 'pilula_b',
  'como priorizar e como testar antes de construir',
  '2 leituras rápidas antes de arrastar as ideias na matriz.',
  true, 8, 12,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'matriz-impacto-esforco',
        'title', 'matriz de priorização impacto × esforço',
        'source', 'ProjectBuilder',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://artia.com/blog/matriz-de-priorizacao/',
        'description', 'clássica ferramenta 2x2. aprende a estrutura visual, não a decorar.'
      ),
      jsonb_build_object(
        'id', 'lean-startup-sebrae',
        'title', 'entenda o que é lean startup',
        'source', 'Sebrae',
        'duration', '~5 min',
        'language', 'português',
        'url', 'https://sebrae.com.br/sites/PortalSebrae/artigos/artigoshome/entenda-o-que-e-lean-startup,03ebb2a178c83410VgnVCM1000003b74010aRCRD',
        'description', 'prepara pra aula 16. aqui, foca em: por que testar antes de construir?'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-quadrante',
        'type', 'single_choice',
        'label', 'na matriz impacto × viabilidade, qual quadrante costuma ser a MELHOR ESCOLHA em contexto de eletiva de 8 semanas restantes?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'alto impacto + alta viabilidade', 'value', 'a'),
          jsonb_build_object('label', 'alto impacto + baixa viabilidade', 'value', 'b'),
          jsonb_build_object('label', 'baixo impacto + alta viabilidade', 'value', 'c'),
          jsonb_build_object('label', 'baixo impacto + baixa viabilidade', 'value', 'd')
        ),
        'correct', jsonb_build_array('a'),
        'feedback_correct', 'é esse. mas cuidado: "alto impacto + baixa viabilidade" seduz — parece ambicioso. e "baixo impacto + alta viabilidade" engana — parece produtivo. você quer ambicioso E realista.',
        'feedback_wrong', 'em 8 semanas, o alvo é o cruzamento alto impacto + alta viabilidade. os outros quadrantes ou frustram ou viram trabalho escolar.'
      ),
      jsonb_build_object(
        'id', 'q2-refinamento',
        'type', 'single_choice',
        'label', 'refinamento (3 versões da mesma ideia) serve pra:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'impressionar o professor', 'value', 'a'),
          jsonb_build_object('label', 'descobrir qual versão da ideia é a mais forte', 'value', 'b'),
          jsonb_build_object('label', 'fazer trabalho parecer maior', 'value', 'c'),
          jsonb_build_object('label', 'cobrir opções', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'a ideia inicial quase nunca é a melhor versão dela mesma. refinamento é escultura.',
        'feedback_wrong', 'refinar em 3 versões não é enfeite: é como você descobre qual versão da ideia realmente é a mais forte.'
      ),
      jsonb_build_object(
        'id', 'q3-4semanas',
        'type', 'long_text',
        'label', 'se você tivesse SÓ 4 semanas — não 8 — pra fazer o projeto, qual das suas 20 ideias seria a escolha? justifique.',
        'min_chars', 80
      )
    )
  )
),
-- 3. PBL matriz + refinamento
(
  '726687a4-df3f-4e34-b6af-5cb4f59014ff', 3, 'exercicio_pbl',
  'matriz impacto × viabilidade + refinamento em 3 versões',
  'arrasta as 20 ideias da aula 11. escolhe uma no quadrante ideal. refina em 3 variações.',
  true, 22, 28,
  jsonb_build_object(
    'type', 'selecao_ideia',
    'ideias_source_module_id', '36a1a1fb-9934-4562-83d0-96aab209bda8',
    'quadrantes', jsonb_build_array(
      jsonb_build_object('id', 'mata_gigante',  'titulo', 'MATA GIGANTE', 'subtitulo', 'alto impacto · baixa viabilidade', 'hint', 'não faz em 8 semanas'),
      jsonb_build_object('id', 'ideal',         'titulo', 'IDEAL',        'subtitulo', 'alto impacto · alta viabilidade',  'hint', 'escolhe aqui'),
      jsonb_build_object('id', 'esquecer',      'titulo', 'ESQUECER',     'subtitulo', 'baixo impacto · baixa viabilidade', 'hint', 'deixa ir'),
      jsonb_build_object('id', 'quick_win',     'titulo', 'QUICK WIN',    'subtitulo', 'baixo impacto · alta viabilidade',  'hint', 'bom mas pequeno')
    ),
    'raridade_opcoes', jsonb_build_array(
      jsonb_build_object('value', 'rara',       'label', 'rara — poucos pensariam assim'),
      jsonb_build_object('value', 'meio_obvia', 'label', 'meio óbvia — vou compensar com profundidade'),
      jsonb_build_object('value', 'obvia',      'label', 'óbvia mesmo — mas a única viável')
    ),
    'similarity_warn_ratio', 0.7,
    'completion', jsonb_build_object('label', 'entregar seleção')
  )
),
-- 4. checagem
(
  '726687a4-df3f-4e34-b6af-5cb4f59014ff', 4, 'pilula_c',
  'checagem · testando a régua',
  '3 perguntas rápidas pra fixar impacto × viabilidade e o que é uma boa variação.',
  true, 4, 6,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-lixeira',
        'type', 'single_choice',
        'label', 'aluno escolheu "colocar lixeiras coloridas de reciclagem em todas as salas". isso é uma ideia:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'alta viabilidade, alto impacto', 'value', 'a'),
          jsonb_build_object('label', 'alta viabilidade, mas baixo impacto — muitos já tentaram e não muda comportamento', 'value', 'b'),
          jsonb_build_object('label', 'baixa viabilidade, alto impacto', 'value', 'c'),
          jsonb_build_object('label', 'impossível avaliar', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'exato. lixeira colorida sem mudar comportamento = decoração. milhares de escolas tentaram — e o índice de erro na separação continua alto. ideia parece ação, mas é sintoma.',
        'feedback_wrong', 'lixeira colorida sem trabalho de comportamento é decoração. viável de instalar, mas impacto real baixo — milhares de escolas já tentaram.'
      ),
      jsonb_build_object(
        'id', 'q2-versao-b',
        'type', 'multi_select',
        'label', 'uma boa versão B (variação de escala) da ideia original pode ser:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'mesma ideia mas em UMA sala, não em todas', 'value', 'a'),
          jsonb_build_object('label', 'mesma ideia mas por 1 semana, não permanente', 'value', 'b'),
          jsonb_build_object('label', 'mesma ideia mas 10× maior', 'value', 'c'),
          jsonb_build_object('label', 'ideia totalmente diferente', 'value', 'd')
        ),
        'correct', jsonb_build_array('a', 'b'),
        'feedback_correct', 'boa. variação de escala normalmente é MENOR pra testar rápido: uma sala em vez de todas, uma semana em vez de sempre.',
        'feedback_wrong', 'variação de escala serve pra testar rápido — normalmente é menor: uma sala, uma semana. não é aumentar 10× nem trocar por outra ideia.'
      ),
      jsonb_build_object(
        'id', 'q3-plano-b',
        'type', 'long_text',
        'label', 'se sua versão A falhar, qual das versões (B ou C) você acha que tem mais chance? por quê?',
        'min_chars', 60
      )
    )
  )
),
-- 5. bônus
(
  '726687a4-df3f-4e34-b6af-5cb4f59014ff', 5, 'registro',
  'bônus · 22 tipos de MVP',
  'formas variadas de testar ideia sem construir tudo. prepara pra aula 16.',
  false, 8, 12,
  jsonb_build_object(
    'type', 'bonus_text',
    'card', jsonb_build_object(
      'title', 'o que é lean startup e MVP',
      'source', 'Evolve MVP',
      'duration', '~8 min',
      'url', 'https://evolvemvp.com/o-que-e-lean-startup/',
      'description', '22 tipos de MVP na prática — de teste de fumaça a concierge. bom repertório antes da aula 16.'
    )
  )
);