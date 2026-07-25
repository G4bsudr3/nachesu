CREATE OR REPLACE FUNCTION public.admin_module10_stakeholders_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 10
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
  _avg_stake NUMERIC := 0;
  _q_aa INT := 0; _q_ab INT := 0; _q_ba INT := 0; _q_bb INT := 0;
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
    AND (interaction_schema->>'type') = 'stakeholders_matriz'
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
        (md.content #> ARRAY['stakeholders_aula10', _pill_id::text, 'stakeholders']) AS lista
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'stakeholders_aula10'
        AND (md.content -> 'stakeholders_aula10') ? _pill_id::text
    ),
    exploded AS (
      SELECT e.user_id, s AS item
      FROM entregas e, jsonb_array_elements(COALESCE(e.lista, '[]'::jsonb)) s
      WHERE (s->>'nome') IS NOT NULL AND length(trim(s->>'nome')) >= 2
    )
    SELECT
      (SELECT COUNT(*) FROM entregas),
      COALESCE(AVG(cnt), 0),
      COUNT(*) FILTER (WHERE item->>'quadrante' = 'aa'),
      COUNT(*) FILTER (WHERE item->>'quadrante' = 'ab'),
      COUNT(*) FILTER (WHERE item->>'quadrante' = 'ba'),
      COUNT(*) FILTER (WHERE item->>'quadrante' = 'bb')
    INTO _submitted, _avg_stake, _q_aa, _q_ab, _q_ba, _q_bb
    FROM exploded
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS cnt FROM exploded GROUP BY user_id
    ) c ON c.user_id = exploded.user_id;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        jsonb_array_length(COALESCE(md.content #> ARRAY['stakeholders_aula10', _pill_id::text, 'stakeholders'], '[]'::jsonb)) AS total_stake,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'stakeholders_aula10'
        AND (md.content -> 'stakeholders_aula10') ? _pill_id::text
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
      'avg_stakeholders', ROUND(_avg_stake, 1),
      'quadrante_alto_alto', _q_aa,
      'quadrante_alto_baixo', _q_ab,
      'quadrante_baixo_alto', _q_ba,
      'quadrante_baixo_baixo', _q_bb
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module10_stakeholders_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module10_stakeholders_stats(TEXT, INT) TO authenticated;

UPDATE public.modules
SET
  title = 'encontro 10 · ninguém faz nada sozinho',
  objective = 'mapear 8 stakeholders reais (com nome) em 4 categorias e posicioná-los na matriz poder × interesse.',
  updated_at = now()
WHERE id = 'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a';

DELETE FROM public.module_pills WHERE module_id = 'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
(
  'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a', 1, 'pilula_a',
  'ninguém faz nada sozinho',
  'hoje você encontra os aliados do seu projeto — pelo nome.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Fechando a Trilha 2. Você tem fluxo mapeado, oportunidades identificadas, princípios escolhidos, impactos definidos.\n\nFalta uma coisa: PEOPLE.\n\nNa Aula 3 você fez um mapa de atores — quem ganha, quem perde. Hoje a gente expande: quem PODE AJUDAR e quem PODE ATRAPALHAR — pelo nome.\n\nRegra hoje: "a prefeitura", "o Sebrae", "a escola" NÃO valem. Quero nome específico: "Kamila do Sebrae BH", "Prof. João de Educação Ambiental da UFMG", "Dona Marta da cantina", "Ricardo do Instituto Comida Invisível".\n\nPor que específico? Porque nome + sobrenome vira contato. "A prefeitura" é abstração. Kamila do Sebrae é gente que atende WhatsApp.\n\nVocê vai mapear 8 stakeholders no mínimo, distribuídos em 4 categorias: usuários, influenciadores, parceiros, oponentes. E vai posicioná-los numa matriz Poder × Interesse.\n\nIsso não é tarefa — é preparo pra semana 15, quando você vai TESTAR o projeto no mundo real. Sem esse mapa, você não sabe quem procurar.\n\nBora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
(
  'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a', 2, 'pilula_b',
  'análise de stakeholders · a lógica clássica',
  'guia + case brasileiro de parceria improvável.',
  true, 12, 18,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'guia-stakeholders',
        'title', 'guia de análise de stakeholders',
        'source', 'MJV Innovation',
        'duration', '~8 min',
        'language', 'português',
        'url', 'https://www.mjvinnovation.com/pt-br/blog/analise-de-stakeholders/',
        'description', 'mostra a lógica clássica: identificar, categorizar, priorizar. foca na matriz poder × interesse.'
      ),
      jsonb_build_object(
        'id', 'case-catadores',
        'title', 'braskem × cooperativas de catadores',
        'source', 'busca sugerida',
        'duration', '~10 min',
        'language', 'português',
        'url', 'https://www.google.com/search?q=Braskem+cooperativa+catadores+parceria+economia+circular',
        'description', 'case de negócio circular que cresceu porque conectou stakeholders inesperados — grande empresa + coops de catadores.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-matriz',
        'type', 'single_choice',
        'label', 'na matriz poder × interesse, quem MERECE MAIS ATENÇÃO em uma estratégia?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'alto poder + alto interesse — os aliados-chave', 'value', 'a'),
          jsonb_build_object('label', 'alto poder + baixo interesse — os influenciadores dormentes', 'value', 'b'),
          jsonb_build_object('label', 'baixo poder + alto interesse — os apoiadores', 'value', 'c'),
          jsonb_build_object('label', 'baixo poder + baixo interesse — os neutros', 'value', 'd')
        ),
        'correct', jsonb_build_array('a'),
        'feedback_correct', 'sacou. alto poder + alto interesse são seus "campeões" — sem eles nada acontece. mas atenção: "alto poder + baixo interesse" são perigosos — se você não os engajar, viram bloqueadores.',
        'feedback_wrong', 'os aliados-chave (alto poder + alto interesse) são os campeões. mas cuidado com os de alto poder + baixo interesse — se não engajar, viram bloqueadores.'
      ),
      jsonb_build_object(
        'id', 'q2-parceiros-bh',
        'type', 'long_text',
        'label', 'pense em 3 organizações reais em BH (com NOME) que poderiam ser parceiras do seu projeto. pra cada uma, escreva o que elas ganhariam ajudando você.',
        'min_chars', 120
      ),
      jsonb_build_object(
        'id', 'q3-parceiro-bom',
        'type', 'single_choice',
        'label', 'um bom parceiro é aquele que:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'concorda com tudo que você propõe', 'value', 'a'),
          jsonb_build_object('label', 'tem interesse próprio alinhado com o seu', 'value', 'b'),
          jsonb_build_object('label', 'é amigo pessoal', 'value', 'c'),
          jsonb_build_object('label', 'tem o mesmo problema', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'parceria sustentável = interesse mútuo. se ele só te ajuda por bondade, para na primeira dificuldade. se ele ganha algo, fica.',
        'feedback_wrong', 'é interesse mútuo. se ele só te ajuda por bondade, para na primeira dificuldade. parceiro que ganha algo, fica.'
      )
    )
  )
),
(
  'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a', 3, 'exercicio_pbl',
  'missão 10: mapa expandido + matriz poder × interesse',
  '4 categorias · mín. 2 nomes cada · cada nome vai pra um quadrante.',
  true, 22, 32,
  jsonb_build_object(
    'type', 'stakeholders_matriz',
    'mapa_atores_source_module_id', '02fe9a42-6b12-407e-9334-147d3c046f7e',
    'categorias', jsonb_build_array(
      jsonb_build_object('id', 'usuarios', 'label', 'usuários', 'hint', 'quem sente o problema ou usa a solução na pele'),
      jsonb_build_object('id', 'influenciadores', 'label', 'influenciadores', 'hint', 'quem forma opinião mas não decide'),
      jsonb_build_object('id', 'parceiros', 'label', 'parceiros potenciais', 'hint', 'quem pode colaborar de verdade'),
      jsonb_build_object('id', 'oponentes', 'label', 'oponentes', 'hint', 'quem ganha com o status quo ou perde com sua solução')
    ),
    'quadrantes', jsonb_build_array(
      jsonb_build_object('id', 'aa', 'label', 'alto poder · alto interesse', 'hint', 'engajar como aliado'),
      jsonb_build_object('id', 'ab', 'label', 'alto poder · baixo interesse', 'hint', 'monitorar de perto'),
      jsonb_build_object('id', 'ba', 'label', 'baixo poder · alto interesse', 'hint', 'manter satisfeito — podem virar advocates'),
      jsonb_build_object('id', 'bb', 'label', 'baixo poder · baixo interesse', 'hint', 'informar quando precisar')
    ),
    'min_per_categoria', 2,
    'completion', jsonb_build_object('label', 'entregar meu mapa')
  )
),
(
  'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a', 4, 'pilula_c',
  'checagem rápida',
  'três perguntas pra afiar a régua.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-comunidade',
        'type', 'single_choice',
        'label', 'um aluno mapeou como parceiro potencial: "a comunidade escolar". isso é bom mapeamento?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'sim, comunidade é sempre importante', 'value', 'a'),
          jsonb_build_object('label', 'não — "comunidade" não é parceiro específico, é categoria vaga', 'value', 'b'),
          jsonb_build_object('label', 'sim, se especificar depois', 'value', 'c'),
          jsonb_build_object('label', 'depende do projeto', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. "comunidade escolar" não atende WhatsApp. "Dona Marta, coordenadora pedagógica do 1º ano" atende. parceria concreta exige pessoa concreta.',
        'feedback_wrong', 'é categoria vaga. "comunidade escolar" não atende WhatsApp. "Dona Marta, coordenadora pedagógica" atende.'
      ),
      jsonb_build_object(
        'id', 'q2-alto-baixo',
        'type', 'multi_choice',
        'label', 'um stakeholder no quadrante "alto poder + baixo interesse" pode virar risco se você não:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'comunicar o projeto de forma que interesse a ele', 'value', 'a'),
          jsonb_build_object('label', 'descobrir o que ele ganha se der certo', 'value', 'b'),
          jsonb_build_object('label', 'antecipar objeções', 'value', 'c'),
          jsonb_build_object('label', 'ignorar até o momento em que ele agir contra', 'value', 'd')
        ),
        'correct', jsonb_build_array('a','b','c'),
        'feedback_correct', 'exato. as três primeiras. ignorar é justamente o que faz virar risco.',
        'feedback_wrong', 'as três primeiras. ignorar é justamente o que faz virar risco no futuro.'
      ),
      jsonb_build_object(
        'id', 'q3-dificil',
        'type', 'long_text',
        'label', 'qual dos seus stakeholders é o MAIS DIFÍCIL de engajar — e por quê? (vamos usar isso no encontro 15.)',
        'min_chars', 100,
        'no_feedback', true
      )
    )
  )
),
(
  'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a', 5, 'registro',
  'bônus: colaboração em projetos de impacto',
  'stakeholder mapping em impacto socioambiental — Aliança Empreendedora e Instituto Ethos.',
  false, 6, 12,
  jsonb_build_object(
    'type', 'bonus_text',
    'badge', 'destrava o próximo nível',
    'search_query', 'stakeholder mapping impacto socioambiental Aliança Empreendedora Instituto Ethos',
    'search_url', 'https://www.google.com/search?q=stakeholder+mapping+impacto+socioambiental+Alian%C3%A7a+Empreendedora+OR+%22Instituto+Ethos%22',
    'disclaimer', 'artigos sobre a importância da colaboração em projetos de impacto. escolha um e leia até o fim.',
    'response', jsonb_build_object(
      'label', 'depois de ler, registra:',
      'fields', jsonb_build_array(
        jsonb_build_object('id', 'colaboracao_insight', 'label', 'qual ideia sobre colaboração te ajuda a repensar seu mapa de stakeholders?', 'min_chars', 40)
      )
    )
  )
);