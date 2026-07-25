
-- ============================================================
-- Aula 3 · Economia Circular: Iceberg + Mapa de Atores
-- Reescreve as 5 pílulas do módulo 3 e cria RPC pro admin.
-- ============================================================

-- 1. metadados do módulo
UPDATE public.modules
SET title = 'o problema não é o lixo, é o sistema',
    objective = 'sair do sintoma. mapear a estrutura e as pessoas que sustentam o problema que você escolheu.'
WHERE id = '02fe9a42-6b12-407e-9334-147d3c046f7e';

-- 2. Pílula 1 · abertura (video_with_transcript)
UPDATE public.module_pills SET
  order_index = 1,
  kind = 'pilula_a',
  title = 'abertura: o sintoma engana',
  required = true,
  duration_min_low = 4,
  duration_min_high = 6,
  video_url = NULL,
  attachment_url = NULL,
  body_md = 'vamos sair do sintoma e ir pra raiz.',
  interaction_schema = $json${
    "type": "video_with_transcript",
    "video_placeholder": true,
    "transcript_collapsible": true,
    "transcript": "E aí. Você já classificou. Já sabe diferenciar linear, circular, regenerativo. Boa.\n\nMas se eu te perguntar agora 'por que esse problema que você escolheu existe?', tem uma chance grande de você responder algo do tipo 'porque as pessoas não se importam' ou 'porque falta educação'.\n\nResposta errada. Não no sentido de moral, no sentido de inutilidade. Essas respostas não te ajudam a fazer nada.\n\nPensamento sistêmico é o oposto disso. É olhar pro problema e perguntar: o que tá segurando esse problema no lugar? Por que ele resiste? Quem ganha com ele existir do jeito que existe?\n\nPorque te garanto: se um problema existe há anos sem ser resolvido, é porque alguém ganha com ele. Pode ser dinheiro, pode ser conforto, pode ser hábito, mas alguém ganha.\n\nHoje você vai aprender a ferramenta mais útil que existe pra isso. Chama Iceberg. E no fim da aula você vai ter um Mapa de Atores do seu problema. Não ator de novela, ator no sentido de 'quem age' nesse sistema.\n\nAh, e prepare-se pra um momento desconfortável: você vai descobrir que pra resolver seu problema, alguém vai ter que perder algo. Vai ter resistência. Faz parte. Bora.",
    "completion": { "label": "começar" }
  }$json$::jsonb
WHERE id = '8a1e8862-b385-4530-99f9-68e1c6ac39f0';

-- 3. Pílula 2 · conteúdo curado (com iceberg_four_levels + single_choice com feedback)
UPDATE public.module_pills SET
  order_index = 2,
  kind = 'pilula_b',
  title = 'duas ferramentas pra você levar pra vida',
  required = true,
  duration_min_low = 10,
  duration_min_high = 14,
  video_url = NULL,
  attachment_url = NULL,
  body_md = 'assiste, lê, e depois preenche as 3 perguntas-guia. sem preencher, o próximo bloco fica trancado.',
  interaction_schema = $json${
    "type": "curated_content_with_questions",
    "cards": [
      {
        "id": "iceberg-video",
        "title": "the iceberg model for systems thinkers",
        "source": "thesystemsview",
        "url": "https://www.youtube.com/watch?v=9I5YvLm5KXI",
        "duration": "~6 min",
        "language": "inglês (legendas auto pt)",
        "description": "disclaimer: legenda é automática (não revisada), pode ter imprecisões pontuais. mas o modelo é tão visual que você pega rápido. foca nos 4 níveis: eventos → padrões → estruturas → modelos mentais."
      },
      {
        "id": "napratica-artigo",
        "title": "pensamento sistêmico: aprenda a enxergar conexões invisíveis",
        "source": "na prática",
        "url": "https://napratica.org.br/noticias/pensamento-sistemico-aprenda-enxergar-conexoes-invisiveis-e-tomar-melhores-decisoes",
        "duration": "~5 min de leitura",
        "description": "tradução do conceito pra português, com exemplos do mundo do trabalho."
      }
    ],
    "questions": [
      {
        "id": "iceberg-4-niveis",
        "type": "iceberg_four_levels",
        "label": "o iceberg tem 4 níveis: eventos (o que vemos), padrões (o que se repete), estruturas (regras, recursos, incentivos que sustentam o padrão) e modelos mentais (crenças que sustentam a estrutura). pegue o problema que você escolheu na aula 1 e descreva, em 1 frase cada, o que estaria em cada nível.",
        "min_chars": 20
      },
      {
        "id": "erro-comum",
        "type": "single_choice",
        "label": "segundo o pensamento sistêmico, quando algo dá errado num sistema, o erro mais comum é:",
        "options": [
          { "label": "não ter dado mais dinheiro pro problema", "value": "a" },
          { "label": "atacar o evento (sintoma) sem olhar a estrutura que o sustenta", "value": "b" },
          { "label": "não ter pessoas suficientes envolvidas", "value": "c" },
          { "label": "não ter usado tecnologia", "value": "d" }
        ],
        "correct": ["b"],
        "feedback_correct": "essa é A armadilha. atacamos o sintoma e o problema volta. pensamento sistêmico vai pra estrutura, onde a mudança é dolorosa mas duradoura.",
        "feedback_wrong": "repensa: dinheiro, gente, tecnologia são todos recursos pra atacar o evento. pensamento sistêmico vai mais fundo, pergunta o que sustenta o evento."
      },
      {
        "id": "quem-ganha",
        "type": "long_text",
        "label": "pense no problema que você escolheu. quem ganha com ele existindo do jeito que está hoje? (pode ser dinheiro, conforto, hábito, poder.) não me venha com 'ninguém', pensa direito.",
        "min_chars": 50
      }
    ]
  }$json$::jsonb
WHERE id = 'cd034752-0efe-41bd-af17-1155a99e2a19';

-- 4. Pílula 3 · PBL Mapa de Atores (novo tipo mapa_atores_2x2)
UPDATE public.module_pills SET
  order_index = 3,
  kind = 'exercicio_pbl',
  title = 'missão 3: mapa de atores',
  required = true,
  duration_min_low = 18,
  duration_min_high = 28,
  video_url = NULL,
  attachment_url = NULL,
  body_md = 'seu problema, agora com nome e endereço. quem ganha, quem perde, quem decide, quem some.',
  interaction_schema = $json${
    "type": "mapa_atores_2x2",
    "radar_source_module_id": "d89dc321-328c-47a9-a97f-e72def107fe9",
    "intro_md": "o problema que você escolheu envolve gente. sempre.\n\nsua missão hoje é mapear quem está nesse jogo. pra cada um dos 4 quadrantes, liste pelo menos 2 atores (pessoas, grupos ou instituições) com nome o mais específico possível.\n\n\"a sociedade\" não vale. \"os pais dos alunos do sebrae\" vale. \"o dono do bar do ronaldo\" vale ainda mais.",
    "aviso_md": "REGRA: o quadrante 'ganha com o problema' precisa ter pelo menos 1 ator. se você acha que ninguém ganha com o problema existindo, você ainda não pegou a parada, volta no iceberg e pensa de novo.",
    "quadrantes": [
      { "id": "ganha", "label": "ganha com o problema", "hint": "perderia com a solução", "min": 2, "hard_required": true, "accent": "#F25E3D" },
      { "id": "perde", "label": "perde com o problema", "hint": "ganharia com a solução", "min": 2, "hard_required": true, "accent": "#75BF9C" },
      { "id": "decide", "label": "decide sobre o problema", "hint": "quem tem poder", "min": 2, "hard_required": true, "accent": "#448FF2" },
      { "id": "invisivel", "label": "afetado mas invisível", "hint": "sem voz no jogo", "min": 2, "hard_required": true, "accent": "#8A85BF" }
    ],
    "completion": { "label": "entregar mapa" }
  }$json$::jsonb
WHERE id = '69867c7b-4cd1-4e1a-ac32-448566a272af';

-- 5. Pílula 4 · checagem rápida (quiz)
UPDATE public.module_pills SET
  order_index = 4,
  kind = 'pilula_c',
  title = 'fechando a aula 3',
  required = true,
  duration_min_low = 5,
  duration_min_high = 8,
  video_url = NULL,
  attachment_url = NULL,
  body_md = '3 perguntas rápidas pra amarrar o iceberg e o mapa.',
  interaction_schema = $json${
    "type": "quiz",
    "questions": [
      {
        "id": "cenario-enchente",
        "type": "single_choice",
        "label": "numa cidade, há um problema crônico de enchente em um bairro pobre. o prefeito anuncia: 'vamos comprar mais 5 caminhões pra desentupir os bueiros.' segundo o iceberg, essa solução está atacando qual nível?",
        "options": [
          { "label": "modelo mental", "value": "a" },
          { "label": "estrutura", "value": "b" },
          { "label": "padrão", "value": "c" },
          { "label": "evento", "value": "d" }
        ],
        "correct": ["d"],
        "feedback_correct": "boa. caminhão de desentupir é solução de evento. a enchente vai voltar. a estrutura (drenagem, ocupação irregular, fiscalização) e o modelo mental (bairro pobre tem menos prioridade) seguem intocados.",
        "feedback_wrong": "repensa: caminhão de desentupir age depois da enchente acontecer. isso é evento. estrutura seria mudar o sistema de drenagem ou o zoneamento. modelo mental seria mudar como a cidade enxerga aquele bairro."
      },
      {
        "id": "tradeoff-regenerativo",
        "type": "multi_choice",
        "label": "marque TODAS as afirmações verdadeiras sobre trade-off em projetos regenerativos:",
        "options": [
          { "label": "toda solução regenerativa cria pelo menos um perdedor", "value": "1" },
          { "label": "se um projeto regenerativo não tem nenhum perdedor, provavelmente ele não muda nada de verdade", "value": "2" },
          { "label": "quem perde com a mudança vai resistir, é normal e esperado", "value": "3" },
          { "label": "a melhor solução é a que faz todo mundo ganhar", "value": "4" }
        ],
        "correct": ["1", "2", "3"],
        "feedback_correct": "trade-off é a marca de uma mudança de verdade. se ninguém perde, ninguém muda. isso não é cinismo, é realismo sistêmico.",
        "feedback_wrong": "repensa: a 4ª é falsa. soluções 'todos ganham' geralmente não mexem em nada estrutural. as 3 primeiras são a realidade."
      },
      {
        "id": "resistencia",
        "type": "long_text",
        "label": "olha seu mapa de atores. quem você acha que vai resistir mais à sua solução? como você vai lidar com isso?",
        "min_chars": 60,
        "no_feedback": true,
        "saved_for": "encontro 10 · stakeholders expandidos"
      }
    ]
  }$json$::jsonb
WHERE id = 'b7929902-d136-4c14-aa56-85a4ff9e768d';

-- 6. Pílula 5 · bônus opcional (bonus_text)
UPDATE public.module_pills SET
  order_index = 5,
  kind = 'registro',
  title = 'quer ver o iceberg em ação?',
  required = false,
  duration_min_low = 6,
  duration_min_high = 10,
  video_url = NULL,
  attachment_url = NULL,
  body_md = 'opcional. ~8 min. iceberg aplicado à indústria da água engarrafada.',
  interaction_schema = $json${
    "type": "bonus_text",
    "search_query": "story of bottled water portuguese",
    "search_url": "https://www.youtube.com/results?search_query=story+of+bottled+water+portuguese",
    "badge": "selo iceberg aplicado",
    "response": {
      "label": "se assistiu: aplique o iceberg ao seu próprio problema. qual modelo mental sustenta esse problema?",
      "fields": [
        { "id": "modelo_mental", "label": "modelo mental que sustenta o problema", "min_chars": 40 }
      ]
    }
  }$json$::jsonb
WHERE id = 'cab912c1-474c-4d7e-ae61-70e7db4e172a';

-- 7. RPC pro painel admin da aula 3
CREATE OR REPLACE FUNCTION public.admin_module3_mapa_atores_stats(
  _course_slug text DEFAULT 'economia-circular',
  _module_number int DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id uuid;
  _pill_id uuid;
  _pill_schema jsonb;
  _total_students int;
  _completed_count int;
  _submitted_count int;
  _per_quadrante jsonb;
  _top_atores jsonb;
  _samples_ganha jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT m.id INTO _module_id
  FROM public.modules m
  JOIN public.trails t ON t.id = m.trail_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE c.slug = _course_slug AND m.number = _module_number
  LIMIT 1;

  IF _module_id IS NULL THEN
    RETURN jsonb_build_object('error', 'module_not_found');
  END IF;

  SELECT mp.id, mp.interaction_schema
    INTO _pill_id, _pill_schema
  FROM public.module_pills mp
  WHERE mp.module_id = _module_id
    AND mp.interaction_schema->>'type' = 'mapa_atores_2x2'
  ORDER BY mp.order_index
  LIMIT 1;

  IF _pill_id IS NULL THEN
    RETURN jsonb_build_object('error', 'mapa_pill_not_found');
  END IF;

  SELECT count(*)::int INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  WHERE c.slug = _course_slug AND e.status = 'active';

  SELECT count(*) FILTER (WHERE completed_at IS NOT NULL)::int
    INTO _completed_count
  FROM public.student_module_progress
  WHERE module_id = _module_id;

  SELECT count(*)::int INTO _submitted_count
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND (d.content->'mapa_atores_aula3'->_pill_id::text) IS NOT NULL;

  -- exploded: user × quadrante × ator
  WITH per_student AS (
    SELECT
      d.user_id,
      d.content->'mapa_atores_aula3'->_pill_id::text AS map_obj,
      COALESCE(d.updated_at, d.created_at) AS ts
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND jsonb_typeof(d.content->'mapa_atores_aula3'->_pill_id::text) = 'object'
  ),
  quadrantes_list AS (
    SELECT ps.user_id, ps.ts, q.key AS quadrante, q.value AS atores
    FROM per_student ps,
         LATERAL jsonb_each(ps.map_obj) q
    WHERE jsonb_typeof(q.value) = 'array'
  ),
  atores_list AS (
    SELECT
      ql.user_id,
      ql.ts,
      ql.quadrante,
      ator->>'nome' AS ator_nome,
      ator->>'descricao' AS ator_descricao
    FROM quadrantes_list ql,
         LATERAL jsonb_array_elements(ql.atores) ator
    WHERE ator IS NOT NULL
      AND length(trim(coalesce(ator->>'nome', ''))) > 0
  ),
  per_q_totals AS (
    SELECT
      quadrante,
      count(*)::int AS total_atores,
      count(DISTINCT user_id)::int AS unique_students
    FROM atores_list
    GROUP BY quadrante
  ),
  top_atores_raw AS (
    SELECT
      quadrante,
      lower(trim(ator_nome)) AS ator_key,
      max(ator_nome) AS ator_display,
      count(*)::int AS mentions,
      count(DISTINCT user_id)::int AS unique_mentions
    FROM atores_list
    GROUP BY quadrante, lower(trim(ator_nome))
  ),
  ranked_atores AS (
    SELECT
      *,
      row_number() OVER (PARTITION BY quadrante ORDER BY mentions DESC, ator_display) AS rn
    FROM top_atores_raw
  ),
  samples_ganha_raw AS (
    SELECT
      al.ator_nome,
      al.ator_descricao,
      al.ts,
      COALESCE(p.nickname, p.display_name, 'estudante') AS nickname,
      row_number() OVER (ORDER BY al.ts DESC) AS rn
    FROM atores_list al
    LEFT JOIN public.profiles p ON p.user_id = al.user_id
    WHERE al.quadrante = 'ganha'
      AND length(trim(coalesce(al.ator_descricao, ''))) >= 10
  )
  SELECT
    COALESCE(jsonb_object_agg(pq.quadrante, jsonb_build_object(
      'total_atores', pq.total_atores,
      'unique_students', pq.unique_students,
      'avg_per_student', ROUND((pq.total_atores::numeric / NULLIF(pq.unique_students, 0)), 2)
    )), '{}'::jsonb),
    COALESCE((
      SELECT jsonb_object_agg(quadrante, atores)
      FROM (
        SELECT quadrante, jsonb_agg(jsonb_build_object(
          'nome', ator_display,
          'mentions', mentions,
          'unique_mentions', unique_mentions
        ) ORDER BY mentions DESC, ator_display) AS atores
        FROM ranked_atores WHERE rn <= 20
        GROUP BY quadrante
      ) x
    ), '{}'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nickname', nickname,
        'ator', ator_nome,
        'descricao', ator_descricao
      ) ORDER BY ts DESC)
      FROM samples_ganha_raw WHERE rn <= 12
    ), '[]'::jsonb)
    INTO _per_quadrante, _top_atores, _samples_ganha
  FROM per_q_totals pq;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'quadrantes', COALESCE(_pill_schema->'quadrantes', '[]'::jsonb),
    'kpis', jsonb_build_object(
      'total_students', _total_students,
      'completed_count', _completed_count,
      'submitted_count', _submitted_count
    ),
    'per_quadrante', COALESCE(_per_quadrante, '{}'::jsonb),
    'top_atores', COALESCE(_top_atores, '{}'::jsonb),
    'samples_ganha', COALESCE(_samples_ganha, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_module3_mapa_atores_stats(text, int) TO authenticated;
