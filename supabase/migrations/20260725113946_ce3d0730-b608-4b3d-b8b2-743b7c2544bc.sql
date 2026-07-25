
-- RPC admin: agregação das regras do jogo da aula 8
CREATE OR REPLACE FUNCTION public.admin_module8_regras_jogo_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 8
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
  _p_dist JSONB;
  _r_dist JSONB;
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
    AND (interaction_schema->>'type') = 'regras_jogo'
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
        (md.content #> ARRAY['regras_jogo_aula8', _pill_id::text]) AS v
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'regras_jogo_aula8'
        AND (md.content -> 'regras_jogo_aula8') ? _pill_id::text
    ),
    validas AS (
      SELECT * FROM entregas
      WHERE (v->>'principio1') IS NOT NULL AND length(trim(v->>'principio1')) > 0
        AND (v->>'principio2') IS NOT NULL AND length(trim(v->>'principio2')) > 0
    ),
    principios_flat AS (
      SELECT (v->>'principio1') AS p FROM validas
      UNION ALL
      SELECT (v->>'principio2') AS p FROM validas
    ),
    rs_flat AS (
      SELECT jsonb_array_elements_text(COALESCE(v->'rs_taticos', '[]'::jsonb)) AS r
      FROM validas
      WHERE jsonb_typeof(v->'rs_taticos') = 'array'
    )
    SELECT
      (SELECT COUNT(*) FROM validas),
      COALESCE((SELECT jsonb_object_agg(p, cnt) FROM (
        SELECT p, COUNT(*) AS cnt FROM principios_flat WHERE p IS NOT NULL AND length(trim(p)) > 0 GROUP BY p
      ) x), '{}'::jsonb),
      COALESCE((SELECT jsonb_object_agg(r, cnt) FROM (
        SELECT r, COUNT(*) AS cnt FROM rs_flat WHERE r IS NOT NULL AND length(trim(r)) > 0 GROUP BY r
      ) y), '{}'::jsonb)
    INTO _submitted, _p_dist, _r_dist;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (md.content #>> ARRAY['regras_jogo_aula8', _pill_id::text, 'principio1']) AS principio1,
        (md.content #>> ARRAY['regras_jogo_aula8', _pill_id::text, 'principio2']) AS principio2,
        CASE WHEN jsonb_typeof(md.content #> ARRAY['regras_jogo_aula8', _pill_id::text, 'rs_taticos']) = 'array'
             THEN ARRAY(SELECT jsonb_array_elements_text(md.content #> ARRAY['regras_jogo_aula8', _pill_id::text, 'rs_taticos']))
             ELSE ARRAY[]::text[] END AS rs_taticos,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'regras_jogo_aula8'
        AND (md.content -> 'regras_jogo_aula8') ? _pill_id::text
      ORDER BY md.updated_at DESC
      LIMIT 20
    ) s;
  ELSE
    _submitted := 0; _p_dist := '{}'::jsonb; _r_dist := '{}'::jsonb; _samples := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'kpis', jsonb_build_object(
      'total_students', COALESCE(_total_students, 0),
      'completed_count', COALESCE(_completed, 0),
      'submitted_count', COALESCE(_submitted, 0)
    ),
    'principio_distribution', COALESCE(_p_dist, '{}'::jsonb),
    'rs_distribution', COALESCE(_r_dist, '{}'::jsonb),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module8_regras_jogo_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module8_regras_jogo_stats(TEXT, INT) TO authenticated;

-- Metadados do módulo 8
UPDATE public.modules
SET
  title = 'encontro 8 · as regras do jogo do meu projeto',
  objective = 'escolher 2 princípios da economia circular + 1 ou 2 R''s como critério pra decidir quais oportunidades perseguir.',
  updated_at = now()
WHERE id = 'ffa5a6e4-a143-4934-9cd7-d730bdb41d87';

-- Seed pills (5 blocos)
DELETE FROM public.module_pills WHERE module_id = 'ffa5a6e4-a143-4934-9cd7-d730bdb41d87';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
(
  'ffa5a6e4-a143-4934-9cd7-d730bdb41d87', 1, 'pilula_a',
  'as 3 regras que separam circular de linear maquiado',
  'hoje você escolhe as suas regras do jogo.',
  true, 3, 5,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Você tem oportunidades mapeadas. Boa. Mas como decidir quais valem a pena perseguir?\n\nVocê precisa de critério. Sem critério, escolhe pela emoção. Pela emoção, escolhe o óbvio.\n\nA Ellen MacArthur Foundation, referência mundial em economia circular, condensou tudo em 3 princípios:\n\n1. eliminar desperdício e poluição desde o design. Não maquiar depois, projetar sem lixo.\n\n2. circular produtos e materiais no valor mais alto possível. Reciclar é o último recurso, não o primeiro. Antes vem reparar, reusar, remanufaturar.\n\n3. regenerar a natureza. Devolver mais do que se tira.\n\nHoje você vai escolher 2 desses 3 pra guiar seu projeto. Só 2. Escolher todos é não escolher.\n\nE vai fazer isso com base nas suas oportunidades da semana passada. Não em teoria abstrata. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
(
  'ffa5a6e4-a143-4934-9cd7-d730bdb41d87', 2, 'pilula_b',
  'os 3 princípios EMF + hierarquia dos 6 R''s',
  'estudo curado direto da Ellen MacArthur Foundation + cartaz dos 6 R''s.',
  true, 12, 18,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'emf-valor',
        'title', 'como a economia circular cria valor',
        'source', 'Ellen MacArthur Foundation',
        'duration', '~8 min',
        'language', 'português',
        'url', 'https://ellenmacarthurfoundation.org/pt/como-a-economia-circular-cria-valor',
        'description', 'página oficial da EMF em português. foca nas seções sobre os 3 princípios. pode pular o resto.'
      ),
      jsonb_build_object(
        'id', 'emf-eliminar',
        'title', 'eliminar resíduos e poluição · diagrama borboleta',
        'source', 'Ellen MacArthur Foundation',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://www.ellenmacarthurfoundation.org/pt/eliminar-residuos-e-poluicao',
        'description', 'detalhamento do princípio 1. se tiver curiosidade, os outros 2 estão linkados na página.'
      )
    ),
    'complement', jsonb_build_object(
      'title', 'os 6 R''s · hierarquia de circularidade',
      'md', E'do mais poderoso ao último recurso:\n\n1. **recusar** — o desperdício que não existe\n2. **reduzir** — usar menos\n3. **reusar** — mesma função, nova vida\n4. **reparar** — estender vida útil\n5. **recuperar** — recondicionar, remanufaturar\n6. **reciclar** — transformar em matéria-prima (último recurso)'
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-hierarquia',
        'type', 'single_choice',
        'label', 'segundo a hierarquia dos 6 R''s, qual é a estratégia mais poderosa mas menos usada no Brasil?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'reciclagem', 'value', 'a'),
          jsonb_build_object('label', 'recusar (o desperdício que não existe)', 'value', 'b'),
          jsonb_build_object('label', 'reparo', 'value', 'c'),
          jsonb_build_object('label', 'reuso', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou o que 99% dos brasileiros não sacaram. reciclagem é o último recurso, vem depois de tudo falhar. recusar (projetar sem o problema) é o topo e é onde tá a inovação real.',
        'feedback_wrong', 'a mais poderosa é RECUSAR: projetar pra que o desperdício simplesmente não aconteça. reciclar é o último recurso da hierarquia, não o primeiro.'
      ),
      jsonb_build_object(
        'id', 'q2-regenerar',
        'type', 'multi_choice',
        'label', 'marque as ações que estão no princípio "regenerar a natureza":',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'compostar restos orgânicos que voltam pra terra', 'value', 'a'),
          jsonb_build_object('label', 'reciclar plástico em nova garrafa', 'value', 'b'),
          jsonb_build_object('label', 'restaurar solo degradado via agricultura regenerativa', 'value', 'c'),
          jsonb_build_object('label', 'substituir monocultura por sistema agroflorestal', 'value', 'd'),
          jsonb_build_object('label', 'coletar seletivamente o lixo comum', 'value', 'e')
        ),
        'correct', jsonb_build_array('a','c','d'),
        'feedback_correct', 'exato. regenerar é devolver ao sistema natural mais do que tira. reciclagem e coleta seletiva são circulares, mas não regenerativas.',
        'feedback_wrong', 'as três de regenerar são: compostagem, restauração de solo e sistemas agroflorestais. reciclar e coletar seletivamente são circulares, mas não regenerativas.'
      ),
      jsonb_build_object(
        'id', 'q3-encaixe',
        'type', 'long_text',
        'label', 'olhando sua oportunidade mais promissora do encontro 7: em qual dos 3 princípios ela se encaixa MELHOR? justifique em 2 frases.',
        'min_chars', 100
      )
    )
  )
),
(
  'ffa5a6e4-a143-4934-9cd7-d730bdb41d87', 3, 'exercicio_pbl',
  'missão 8: regras do jogo do meu projeto',
  'escolha 2 princípios EMF + 1 ou 2 R''s. cada escolha exige justificativa aplicada ao seu problema.',
  true, 18, 28,
  jsonb_build_object(
    'type', 'regras_jogo',
    'briefing_source_module_id', 'b83924a0-91e5-4549-a976-041ca6b28651',
    'matriz_source_module_id', '8bfb2523-7c75-4436-859b-1cc0a547cfd0',
    'min_chars_justificativa', 100,
    'min_chars_exemplo', 40,
    'min_chars_como_ajudam', 80,
    'principios_options', jsonb_build_array(
      jsonb_build_object('value', 'eliminar', 'label', 'eliminar desperdício e poluição desde o design', 'short', 'eliminar'),
      jsonb_build_object('value', 'circular', 'label', 'circular produtos e materiais no valor mais alto', 'short', 'circular'),
      jsonb_build_object('value', 'regenerar', 'label', 'regenerar a natureza', 'short', 'regenerar')
    ),
    'rs_options', jsonb_build_array(
      jsonb_build_object('value', 'recusar', 'label', 'recusar', 'hint', 'não usar, projetar sem o problema'),
      jsonb_build_object('value', 'reduzir', 'label', 'reduzir', 'hint', 'usar menos'),
      jsonb_build_object('value', 'reusar', 'label', 'reusar', 'hint', 'mesma função, nova vida'),
      jsonb_build_object('value', 'reparar', 'label', 'reparar', 'hint', 'estender vida'),
      jsonb_build_object('value', 'recuperar', 'label', 'recuperar', 'hint', 'recondicionar, remanufaturar'),
      jsonb_build_object('value', 'reciclar', 'label', 'reciclar', 'hint', 'último recurso')
    ),
    'completion', jsonb_build_object('label', 'definir minhas regras')
  )
),
(
  'ffa5a6e4-a143-4934-9cd7-d730bdb41d87', 4, 'pilula_c',
  'checagem rápida',
  'três perguntas pra afiar o critério.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-canetas',
        'type', 'single_choice',
        'label', 'um projeto propõe: "vamos criar canetas descartáveis feitas de plástico reciclado com embalagem 100% reciclável". qual crítica mais precisa?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'ótimo — está aplicando o princípio "circular produtos e materiais"', 'value', 'a'),
          jsonb_build_object('label', 'fraco — deveria pensar em RECUSAR (canetas recarregáveis) antes de RECICLAR', 'value', 'b'),
          jsonb_build_object('label', 'ótimo — usa material reciclado', 'value', 'c'),
          jsonb_build_object('label', 'fraco — embalagem reciclável ainda gera lixo', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou a hierarquia. reciclar é bom, mas RECUSAR é melhor. a pergunta certa é: "por que descartável no primeiro lugar?" a caneta recarregável (RECUSAR) elimina o problema na origem.',
        'feedback_wrong', 'a crítica mais precisa é: o projeto pula direto pra reciclar sem passar por recusar. caneta recarregável elimina o descartável na origem — isso é RECUSAR, o topo da hierarquia.'
      ),
      jsonb_build_object(
        'id', 'q2-regenerar-obriga',
        'type', 'multi_choice',
        'label', 'se você escolheu "regenerar a natureza" como princípio, você DEVE:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'ter plano concreto de como devolver ao sistema natural mais do que tira', 'value', 'a'),
          jsonb_build_object('label', 'justificar por que "não degradar" não é suficiente', 'value', 'b'),
          jsonb_build_object('label', 'prever que soluções regenerativas costumam ser mais lentas de escalar', 'value', 'c'),
          jsonb_build_object('label', 'apenas usar embalagens biodegradáveis', 'value', 'd')
        ),
        'correct', jsonb_build_array('a','b','c'),
        'feedback_correct', 'as três primeiras. embalagem biodegradável sozinha é reducionista — não caracteriza regeneração de verdade.',
        'feedback_wrong', 'as três primeiras são obrigatórias. a última (só embalagem biodegradável) é reducionista: não devolve nada, só reduz dano.'
      ),
      jsonb_build_object(
        'id', 'q3-so-um',
        'type', 'long_text',
        'label', 'se você tivesse que ESCOLHER só 1 dos princípios pra guiar seu projeto — e desistir dos outros 2 — qual seria e por quê?',
        'min_chars', 100,
        'no_feedback', true
      )
    )
  )
),
(
  'ffa5a6e4-a143-4934-9cd7-d730bdb41d87', 5, 'registro',
  'bônus: 5 metas de política pública circular',
  'documento oficial EMF pra quem quer entender como circularidade vira política de país.',
  false, 8, 12,
  jsonb_build_object(
    'type', 'bonus_text',
    'badge', 'selo pensa em escala',
    'search_query', 'Universal Circular Economy Policy Goals EMF',
    'search_url', 'https://www.ellenmacarthurfoundation.org/pt/objetivos-universais-de-politicas/visao-geral',
    'disclaimer', 'documento oficial da EMF com 5 metas de política pública. leitura só se quiser mergulhar fundo em como circularidade funciona em escala de país.',
    'response', jsonb_build_object(
      'label', 'depois de ler, registra:',
      'fields', jsonb_build_array(
        jsonb_build_object('id', 'meta_conecta', 'label', 'qual das 5 metas mais se conecta com o problema que você tá trabalhando?', 'min_chars', 40)
      )
    )
  )
);
