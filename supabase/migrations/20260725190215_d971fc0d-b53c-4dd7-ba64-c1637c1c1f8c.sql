-- =====================================================
-- Aula 13 · Proposta de Valor Regenerativa
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module13_proposta_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 13
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
  _com_ancora INT := 0;
  _ancora_ok INT := 0;
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
    AND (interaction_schema->>'type') = 'proposta_valor'
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
        (md.content #> ARRAY['proposta_valor_aula13', _pill_id::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'proposta_valor_aula13'
        AND (md.content -> 'proposta_valor_aula13') ? _pill_id::text
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE length(trim(COALESCE(payload->>'frase_ancora',''))) > 0),
      COUNT(*) FILTER (
        WHERE length(trim(COALESCE(payload->>'frase_ancora',''))) > 0
          AND array_length(regexp_split_to_array(trim(payload->>'frase_ancora'), '\s+'), 1) <= 30
      )
    INTO _submitted, _com_ancora, _ancora_ok
    FROM entregas;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        md.content #>> ARRAY['proposta_valor_aula13', _pill_id::text, 'frase_ancora'] AS frase_ancora,
        md.content #>> ARRAY['proposta_valor_aula13', _pill_id::text, 'publico']      AS publico,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'proposta_valor_aula13'
        AND (md.content -> 'proposta_valor_aula13') ? _pill_id::text
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
      'com_ancora', _com_ancora,
      'ancora_ok', _ancora_ok
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module13_proposta_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module13_proposta_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 13 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 13 · o que você oferece',
  objective = 'articular uma proposta de valor regenerativa em 5 blocos + 1 frase-âncora com público específico e por-que-agora.',
  updated_at = now()
WHERE id = 'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51';

DELETE FROM public.module_pills WHERE module_id = 'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura
(
  'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51', 1, 'pilula_a',
  'o que você oferece — de diferente, de melhor, e agora',
  'proposta de valor em 5 blocos + 1 frase-âncora.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Você tem uma ideia refinada. Agora vamos DAR NOME a ela — no sentido estratégico.\n\nProposta de valor é isso: em 3 frases, o que sua solução oferece, pra quem, e por que ela importa AGORA.\n\nA pegadinha tá no "agora". Alguém pode te perguntar: "esse problema existe há 20 anos — por que sua solução vem AGORA?". Se você não tem resposta, a proposta é fraca.\n\nBoa resposta pode ser: agora existe tecnologia. Agora tem regulação. Agora tem consumidor consciente. Agora tem parceiro ecossistêmico. Alguma coisa mudou. Você precisa saber o quê.\n\nVamos usar um Canvas de 5 blocos. É simplificação do que a IDEO e o Strategyzer usam. Você vai preencher: PROBLEMA, PÚBLICO, SOLUÇÃO, COMO CIRCULA/REGENERA, POR QUE AGORA.\n\nNo fim, você tem uma frase-âncora — 1 frase que resume tudo. Sua bandeira. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2. conteúdo curado
(
  'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51', 2, 'pilula_b',
  'value proposition canvas · como preencher',
  'referências rápidas antes de encarar o canvas.',
  true, 8, 12,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'vpc-video',
        'title', 'value proposition canvas em 5 minutos',
        'source', 'busca no YouTube (PT)',
        'duration', '~5 min',
        'language', 'português',
        'url', 'https://www.youtube.com/results?search_query=value+proposition+canvas+em+5+minutos+portugu%C3%AAs',
        'description', 'o clássico de strategyzer explicado em português. foca em: dores, ganhos, aliviadores.'
      ),
      jsonb_build_object(
        'id', 'case-comida-invisivel',
        'title', 'programa comida invisível · proposta na prática',
        'source', 'busca — case brasileiro',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://www.google.com/search?q=Programa+Comida+Invis%C3%ADvel+proposta+de+valor',
        'description', 'como um programa nacional articula problema + público + por-que-agora numa frase só.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-esquecido',
        'type', 'single_choice',
        'label', 'o bloco MAIS FÁCIL de ser esquecido numa proposta de valor é:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'problema', 'value', 'a'),
          jsonb_build_object('label', 'solução', 'value', 'b'),
          jsonb_build_object('label', 'por que agora', 'value', 'c'),
          jsonb_build_object('label', 'público', 'value', 'd')
        ),
        'correct', jsonb_build_array('c'),
        'feedback_correct', 'sacou. "por que agora" força você a articular contexto. sem ele, sua proposta parece qualquer proposta — de 1990, 2010, 2030. boa proposta tem timing embutido.',
        'feedback_wrong', 'o mais esquecido é "por que agora". sem contexto de timing, a proposta pode ser de qualquer época — e por isso não convence.'
      ),
      jsonb_build_object(
        'id', 'q2-publico',
        'type', 'single_choice',
        'label', 'público "estudantes" é:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'bom se for pra escola', 'value', 'a'),
          jsonb_build_object('label', 'vago — precisa segmentar (idade, contexto, comportamento)', 'value', 'b'),
          jsonb_build_object('label', 'suficiente', 'value', 'c'),
          jsonb_build_object('label', 'depende', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'vago. "estudantes do 1º ano do EM técnico do sebrae bh, moradores de bairros com renda média" é operacional. "estudantes" não.',
        'feedback_wrong', 'público precisa ter atributos: idade, contexto, comportamento. "estudantes" sozinho é vago demais pra fazer decisão de produto.'
      ),
      jsonb_build_object(
        'id', 'q3-agora',
        'type', 'long_text',
        'label', 'em 1 frase: por que a solução que você desenhou vem AGORA e não podia vir há 10 anos?',
        'min_chars', 60
      )
    )
  )
),
-- 3. PBL canvas + frase-âncora
(
  'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51', 3, 'exercicio_pbl',
  'canvas de proposta de valor regenerativa',
  '5 blocos + 1 frase-âncora. puxamos sua ideia refinada da aula 12 e os impactos da aula 9.',
  true, 22, 30,
  jsonb_build_object(
    'type', 'proposta_valor',
    'ideia_source_module_id', '726687a4-df3f-4e34-b6af-5cb4f59014ff',
    'impactos_source_module_id', 'aad1f76b-4926-42a2-9525-0dde21769f2a',
    'blocos', jsonb_build_array(
      jsonb_build_object('id', 'problema',     'titulo', 'PROBLEMA',              'hint', '1-2 frases, sem jargão. onde dói.', 'min_chars', 50),
      jsonb_build_object('id', 'publico',      'titulo', 'PÚBLICO',               'hint', 'idade, contexto, comportamento. "estudantes" não vale.', 'min_chars', 50, 'require_atributos', 2),
      jsonb_build_object('id', 'solucao',      'titulo', 'SOLUÇÃO',               'hint', '2-3 frases. o que a pessoa RECEBE.', 'min_chars', 50),
      jsonb_build_object('id', 'como_circula', 'titulo', 'COMO CIRCULA / REGENERA','hint', 'conecta com os princípios EMF da aula 8. cita fluxo da aula 6.', 'min_chars', 50),
      jsonb_build_object('id', 'por_que_agora','titulo', 'POR QUE AGORA',         'hint', '1-2 frases. contexto que abre a janela.', 'min_chars', 50)
    ),
    'frase_ancora', jsonb_build_object(
      'max_palavras', 30,
      'template', '[solução] para [público específico] que [transforma qual fluxo] porque [por que agora].',
      'exemplo', 'app de pedidos antecipados de refeição para alunos do sebrae bh que reduz 40% do desperdício da cantina e composta o restante em hortas urbanas parceiras — agora que belo horizonte tem 12 hortas comunitárias buscando substrato.'
    ),
    'palavras_vagas', jsonb_build_array('sustentável','sustentavel','sustentabilidade','impacto positivo','impacto','comunidade','engajamento','sinergia','holístico','holistico','inovador','disruptivo','transformador','transformar','revolucionário','revolucionario','solução','solucao'),
    'completion', jsonb_build_object('label', 'entregar proposta')
  )
),
-- 4. checagem
(
  'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51', 4, 'pilula_c',
  'checagem · afiando a lâmina',
  '3 perguntas rápidas pra você separar proposta genérica de proposta com arestas.',
  true, 4, 6,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-generica',
        'type', 'single_choice',
        'label', 'proposta: "uma solução sustentável para reduzir desperdício e gerar impacto positivo na comunidade escolar." avalie:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'boa — cobre pontos importantes', 'value', 'a'),
          jsonb_build_object('label', 'fraca — genérica, poderia ser sobre qualquer coisa', 'value', 'b'),
          jsonb_build_object('label', 'boa — usa palavras corretas', 'value', 'c'),
          jsonb_build_object('label', 'boa — foca no que importa', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. cada palavra é generic bag: "solução", "sustentável", "reduzir desperdício", "impacto positivo", "comunidade escolar". podia estar num prospecto de 300 outros projetos. boa proposta tem ARESTAS — nome de público, número, contexto BH.',
        'feedback_wrong', 'é fraca. todas as palavras são genéricas — cabe em 300 propostas diferentes. boa proposta tem arestas: nome de público, número, contexto local.'
      ),
      jsonb_build_object(
        'id', 'q2-boa-ancora',
        'type', 'multi_select',
        'label', 'frases-âncora BOAS costumam ter:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'verbo forte', 'value', 'a'),
          jsonb_build_object('label', 'público específico', 'value', 'b'),
          jsonb_build_object('label', 'elemento de urgência/contexto', 'value', 'c'),
          jsonb_build_object('label', 'palavras corporativas genéricas', 'value', 'd'),
          jsonb_build_object('label', 'métrica (mesmo aproximada)', 'value', 'e')
        ),
        'correct', jsonb_build_array('a', 'b', 'c', 'e'),
        'feedback_correct', 'exato: verbo forte, público específico, urgência e métrica são arestas. palavras corporativas genéricas fazem o oposto — apagam a aresta.',
        'feedback_wrong', 'as boas têm: verbo forte, público específico, urgência e métrica. genéricas corporativas apagam a aresta em vez de destacar.'
      ),
      jsonb_build_object(
        'id', 'q3-reescreve',
        'type', 'long_text',
        'label', 'reescreva sua frase-âncora — versão mais AFIADA que a primeira. corte tudo que é ornamento.',
        'min_chars', 60
      )
    )
  )
),
-- 5. bônus
(
  'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51', 5, 'registro',
  'bônus · value proposition design',
  'osterwalder em palestra — referência mundial em proposta de valor.',
  false, 15, 20,
  jsonb_build_object(
    'type', 'bonus_text',
    'card', jsonb_build_object(
      'title', 'alexander osterwalder · value proposition design',
      'source', 'busca no YouTube (legenda PT)',
      'duration', '~15 min',
      'url', 'https://www.youtube.com/results?search_query=alexander+osterwalder+value+proposition+design+portugu%C3%AAs',
      'description', 'palestras do autor com legendas em português. bom pra ver como profissionais usam o canvas na prática.'
    )
  )
);