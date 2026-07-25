
-- RPC admin: agregação das matrizes vazamento → oportunidade da aula 7
CREATE OR REPLACE FUNCTION public.admin_module7_matriz_valor_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 7
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
  _submitted INT;
  _with_named INT;
  _avg_tipos NUMERIC;
  _tipo_dist JSONB;
  _samples JSONB;
  _bloqueio TEXT[] := ARRAY['todos','todo mundo','sociedade','comunidade','as pessoas','gente','a sociedade','a comunidade'];
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
    AND (interaction_schema->>'type') = 'matriz_valor'
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
        (md.content #> ARRAY['matriz_valor_aula7', _pill_id::text, 'linhas']) AS linhas
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'matriz_valor_aula7'
        AND (md.content -> 'matriz_valor_aula7') ? _pill_id::text
    ),
    linhas_flat AS (
      SELECT
        e.user_id,
        (l->>'tipo') AS tipo,
        (l->>'beneficiario') AS beneficiario,
        (l->>'oportunidade') AS oportunidade,
        (l->>'vazamento') AS vazamento
      FROM entregas e
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.linhas, '[]'::jsonb)) AS l
      WHERE COALESCE(jsonb_typeof(e.linhas), 'null') = 'array'
    ),
    por_usuario AS (
      SELECT
        user_id,
        COUNT(*) FILTER (WHERE tipo IS NOT NULL AND length(trim(tipo)) > 0) AS linhas_com_tipo,
        COUNT(DISTINCT tipo) FILTER (WHERE tipo IS NOT NULL AND length(trim(tipo)) > 0) AS tipos_diferentes,
        BOOL_AND(
          beneficiario IS NULL
          OR length(trim(beneficiario)) = 0
          OR NOT (lower(trim(beneficiario)) = ANY(_bloqueio))
        ) AS todos_beneficiarios_ok
      FROM linhas_flat
      GROUP BY user_id
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE todos_beneficiarios_ok),
      COALESCE(AVG(tipos_diferentes), 0)
    INTO _submitted, _with_named, _avg_tipos
    FROM por_usuario;

    SELECT COALESCE(jsonb_object_agg(tipo, cnt), '{}'::jsonb)
    INTO _tipo_dist
    FROM (
      SELECT tipo, COUNT(*) AS cnt
      FROM linhas_flat
      WHERE tipo IS NOT NULL AND length(trim(tipo)) > 0
      GROUP BY tipo
    ) x;
  ELSE
    _submitted := 0; _with_named := 0; _avg_tipos := 0; _tipo_dist := '{}'::jsonb;
  END IF;

  IF _pill_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        CASE WHEN jsonb_typeof(md.content #> ARRAY['matriz_valor_aula7', _pill_id::text, 'linhas']) = 'array'
             THEN jsonb_array_length(md.content #> ARRAY['matriz_valor_aula7', _pill_id::text, 'linhas'])
             ELSE 0 END AS linhas_count,
        (
          SELECT COUNT(DISTINCT l->>'tipo')
          FROM jsonb_array_elements(
                 COALESCE(md.content #> ARRAY['matriz_valor_aula7', _pill_id::text, 'linhas'], '[]'::jsonb)
               ) AS l
          WHERE (l->>'tipo') IS NOT NULL AND length(trim(l->>'tipo')) > 0
        ) AS tipos_count,
        (
          SELECT l->>'oportunidade'
          FROM jsonb_array_elements(
                 COALESCE(md.content #> ARRAY['matriz_valor_aula7', _pill_id::text, 'linhas'], '[]'::jsonb)
               ) AS l
          WHERE (l->>'oportunidade') IS NOT NULL AND length(trim(l->>'oportunidade')) > 0
          LIMIT 1
        ) AS primeira_oportunidade,
        (
          SELECT l->>'beneficiario'
          FROM jsonb_array_elements(
                 COALESCE(md.content #> ARRAY['matriz_valor_aula7', _pill_id::text, 'linhas'], '[]'::jsonb)
               ) AS l
          WHERE (l->>'beneficiario') IS NOT NULL AND length(trim(l->>'beneficiario')) > 0
          LIMIT 1
        ) AS primeiro_beneficiario,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'matriz_valor_aula7'
        AND (md.content -> 'matriz_valor_aula7') ? _pill_id::text
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
      'submitted_count', COALESCE(_submitted, 0),
      'with_named_beneficiary_count', COALESCE(_with_named, 0),
      'avg_tipos_diferentes', COALESCE(_avg_tipos, 0)
    ),
    'tipo_distribution', COALESCE(_tipo_dist, '{}'::jsonb),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module7_matriz_valor_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module7_matriz_valor_stats(TEXT, INT) TO authenticated;

-- Metadados do módulo 7
UPDATE public.modules
SET
  title = 'encontro 7 · vazamento vira oportunidade',
  objective = 'transformar cada vazamento do seu mapa em uma oportunidade concreta, com valor perdido mensurado e beneficiário nomeado.',
  updated_at = now()
WHERE id = '8bfb2523-7c75-4436-859b-1cc0a547cfd0';

-- Seed pills (5 blocos)
DELETE FROM public.module_pills WHERE module_id = '8bfb2523-7c75-4436-859b-1cc0a547cfd0';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
(
  '8bfb2523-7c75-4436-859b-1cc0a547cfd0', 1, 'pilula_a',
  'onde há vazamento, há valor não capturado',
  'hoje seu problema vira lista de oportunidades.',
  true, 3, 5,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Semana passada você desenhou o fluxo do seu problema. Viu onde vaza.\n\nAgora eu quero te ensinar uma virada de mentalidade que economista sem formação humanista não sacou ainda: cada vazamento é oportunidade.\n\nNão é filosofia. É contabilidade.\n\nPapel que vai pro lixo com 30% em branco é papel comprado que virou custo sem virar valor. Comida que sobra é fornecedor pago sem entrega no prato. Tempo de pessoa parada é folha de pagamento sem contrapartida.\n\nOnde tem vazamento, tem valor esperando pra ser capturado. Por VOCÊ ou por outra pessoa.\n\nHoje você vai pegar cada vazamento do seu Mapa e transformar em oportunidade. Cinco linhas, no mínimo. E cada oportunidade tem que ter nome, tem que ter beneficiário. "É melhor pra todo mundo" não vale. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
(
  '8bfb2523-7c75-4436-859b-1cc0a547cfd0', 2, 'pilula_b',
  'os desperdícios que ninguém enxerga',
  'os 7 desperdícios do Lean + um case brasileiro de escala pra abrir a cabeça.',
  true, 12, 18,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'lean-7-desperdicios',
        'title', 'Os 7 desperdícios do Lean Manufacturing',
        'source', 'Voitto',
        'duration', '~8 min de leitura',
        'language', 'português',
        'url', 'https://www.voitto.com.br/blog/artigo/7-desperdicios-do-lean-manufacturing',
        'description', 'os 7 desperdícios clássicos da Toyota são a base pra pensar oportunidade. não precisa decorar — pega a lógica: superprodução, espera, transporte, processamento excessivo, estoque, movimento, defeitos.'
      ),
      jsonb_build_object(
        'id', 'ambev-zero-aterro',
        'title', 'Ambev e o Programa Zero Aterro',
        'source', 'busca aberta · use termos abaixo',
        'duration', '~5-10 min',
        'language', 'português',
        'url', 'https://www.google.com/search?q=Ambev+%22Zero+Aterro%22+programa+circular+economia',
        'description', 'case brasileiro de empresa que transformou vazamento (resíduos) em valor (subprodutos vendidos). exemplo B2B de escala.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-menos-obvio',
        'type', 'single_choice',
        'label', 'qual destes é o desperdício MENOS óbvio de reconhecer em um sistema?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'material que vira lixo', 'value', 'a'),
          jsonb_build_object('label', 'tempo de pessoa parada', 'value', 'b'),
          jsonb_build_object('label', 'potencial de aprendizado não capturado', 'value', 'c'),
          jsonb_build_object('label', 'energia elétrica em equipamento ligado sem uso', 'value', 'd')
        ),
        'correct', jsonb_build_array('c'),
        'feedback_correct', 'sacou o mais invisível. empresa perde MILHÕES em conhecimento não sistematizado, feedback ignorado, insight não registrado. é o vazamento que ninguém vê porque não vem em fatura.',
        'feedback_wrong', 'material, tempo e energia todo mundo vê. o vazamento mais invisível é o potencial de aprendizado — conhecimento que se perde entre etapas, feedback ignorado, insight não registrado. é onde tá o maior valor não capturado.'
      ),
      jsonb_build_object(
        'id', 'q2-invisivel',
        'type', 'long_text',
        'label', 'no seu problema, qual é o vazamento que provavelmente ninguém consegue enxergar sem fazer o exercício de sair pro mundo, como você fez no encontro 4?',
        'min_chars', 80
      ),
      jsonb_build_object(
        'id', 'q3-cliente-pagante',
        'type', 'long_text',
        'label', 'se seu vazamento principal fosse transformado em oportunidade capturada por um negócio, quem seria o cliente pagante? não "a sociedade" — nome específico.',
        'min_chars', 60
      )
    )
  )
),
(
  '8bfb2523-7c75-4436-859b-1cc0a547cfd0', 3, 'exercicio_pbl',
  'missão 7: matriz vazamento → oportunidade',
  'cinco linhas. uma pra cada vazamento do seu mapa. cada oportunidade com nome e beneficiário específico.',
  true, 18, 28,
  jsonb_build_object(
    'type', 'matriz_valor',
    'mapa_source_module_id', '29e2d414-53ad-494f-8856-3d4a7caed582',
    'min_linhas', 5,
    'min_tipos_diferentes', 3,
    'beneficiario_bloqueio', jsonb_build_array('todos','todo mundo','sociedade','comunidade','as pessoas','gente','a sociedade','a comunidade'),
    'completion', jsonb_build_object('label', 'entregar matriz')
  )
),
(
  '8bfb2523-7c75-4436-859b-1cc0a547cfd0', 4, 'pilula_c',
  'checagem rápida',
  'três perguntas pra separar objetivo de oportunidade e escolher onde apostar.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-oportunidade-acionavel',
        'type', 'single_choice',
        'label', 'um aluno mapeou: "vazamento = alunos jogam fora 30% da comida". ele escreveu como oportunidade: "reduzir desperdício". isso é oportunidade acionável?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'sim, tá claro', 'value', 'a'),
          jsonb_build_object('label', 'não — é redescrição do vazamento em positivo, não é oportunidade', 'value', 'b'),
          jsonb_build_object('label', 'sim, se tiver meta', 'value', 'c'),
          jsonb_build_object('label', 'depende do contexto', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'exato. "reduzir desperdício" é objetivo. oportunidade tem que ser CAPTURAR VALOR ATRAVÉS DE X. ex: "transformar 8kg de sobras diárias em ração/composto vendido pra hortas urbanas de BH", "criar sistema de pedido antecipado que reduz superprodução em 40%".',
        'feedback_wrong', 'repensa: "reduzir desperdício" é só o vazamento escrito ao contrário. oportunidade acionável tem ação, objeto e beneficiário. ex: "vender 8kg de sobras diárias como composto pra hortas urbanas".'
      ),
      jsonb_build_object(
        'id', 'q2-acionaveis',
        'type', 'multi_choice',
        'label', 'marque as oportunidades acionáveis:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'melhorar a coleta seletiva', 'value', 'a'),
          jsonb_build_object('label', 'vender resíduo orgânico como composto pra hortas urbanas', 'value', 'b'),
          jsonb_build_object('label', 'conscientizar as pessoas', 'value', 'c'),
          jsonb_build_object('label', 'criar app de pedido de refeição sob demanda que reduz sobra', 'value', 'd'),
          jsonb_build_object('label', 'sensibilizar a comunidade', 'value', 'e')
        ),
        'correct', jsonb_build_array('b','d'),
        'feedback_correct', 'sacou. as verdadeiras têm ação, objeto e beneficiário. "melhorar", "conscientizar", "sensibilizar" são boas intenções sem alavanca.',
        'feedback_wrong', 'as acionáveis são "vender resíduo orgânico como composto" e "criar app de pedido sob demanda". as outras são boas intenções sem ação clara, objeto específico ou beneficiário nomeado.'
      ),
      jsonb_build_object(
        'id', 'q3-mais-promissora',
        'type', 'long_text',
        'label', 'das suas 5 oportunidades, qual você acha que é a MAIS PROMISSORA — e por quê? (vamos usar isso pra guiar a aula 8.)',
        'min_chars', 100,
        'no_feedback', true
      )
    )
  )
),
(
  '8bfb2523-7c75-4436-859b-1cc0a547cfd0', 5, 'registro',
  'bônus: podcast café com ESG',
  'escolha 1 episódio com case brasileiro de circular economy e registra o insight.',
  false, 8, 12,
  jsonb_build_object(
    'type', 'bonus_text',
    'badge', 'selo caçador de oportunidade',
    'search_query', 'podcast café com ESG negócios circulares brasileiros',
    'search_url', 'https://open.spotify.com/search/caf%C3%A9%20com%20ESG%20economia%20circular',
    'disclaimer', 'os episódios variam com o tempo. escolha um com case brasileiro de circular economy e responda abaixo.',
    'response', jsonb_build_object(
      'label', 'depois de ouvir, registra:',
      'fields', jsonb_build_array(
        jsonb_build_object('id', 'oportunidade_case', 'label', 'que oportunidade eles capturaram que ninguém tinha capturado antes?', 'min_chars', 40)
      )
    )
  )
);
