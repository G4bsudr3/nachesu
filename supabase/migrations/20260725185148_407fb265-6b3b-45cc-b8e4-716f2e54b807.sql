-- =====================================================
-- Aula 11 · Sprint de Ideação
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module11_ideacao_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 11
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
  _avg_ideias NUMERIC := 0;
  _atingiu20 INT := 0;
  _r1 INT := 0; _r2 INT := 0; _r3 INT := 0; _r4 INT := 0;
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
    AND (interaction_schema->>'type') = 'sprint_ideacao'
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
        (md.content #> ARRAY['ideias_aula11', _pill_id::text, 'ideias']) AS lista
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'ideias_aula11'
        AND (md.content -> 'ideias_aula11') ? _pill_id::text
    ),
    exploded AS (
      SELECT e.user_id, s AS item
      FROM entregas e, jsonb_array_elements(COALESCE(e.lista, '[]'::jsonb)) s
      WHERE (s->>'texto') IS NOT NULL AND length(trim(s->>'texto')) >= 3
    ),
    per_user AS (
      SELECT user_id, COUNT(*) AS cnt FROM exploded GROUP BY user_id
    )
    SELECT
      (SELECT COUNT(*) FROM entregas),
      COALESCE((SELECT AVG(cnt) FROM per_user), 0),
      COALESCE((SELECT COUNT(*) FROM per_user WHERE cnt >= 20), 0),
      COUNT(*) FILTER (WHERE (item->>'rodada')::int = 1),
      COUNT(*) FILTER (WHERE (item->>'rodada')::int = 2),
      COUNT(*) FILTER (WHERE (item->>'rodada')::int = 3),
      COUNT(*) FILTER (WHERE (item->>'rodada')::int = 4)
    INTO _submitted, _avg_ideias, _atingiu20, _r1, _r2, _r3, _r4
    FROM exploded;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        jsonb_array_length(COALESCE(md.content #> ARRAY['ideias_aula11', _pill_id::text, 'ideias'], '[]'::jsonb)) AS total_ideias,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'ideias_aula11'
        AND (md.content -> 'ideias_aula11') ? _pill_id::text
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
      'avg_ideias', ROUND(_avg_ideias, 1),
      'atingiu_20', _atingiu20,
      'ideias_r1', _r1,
      'ideias_r2', _r2,
      'ideias_r3', _r3,
      'ideias_r4', _r4
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module11_ideacao_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module11_ideacao_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 11 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 11 · criatividade não é dom, é volume',
  objective = 'abrir a trilha 3 gerando 15-20 ideias em 4 rodadas cronometradas, sem julgar durante a corrida.',
  updated_at = now()
WHERE id = '36a1a1fb-9934-4562-83d0-96aab209bda8';

DELETE FROM public.module_pills WHERE module_id = '36a1a1fb-9934-4562-83d0-96aab209bda8';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura
(
  '36a1a1fb-9934-4562-83d0-96aab209bda8', 1, 'pilula_a',
  'criatividade não é dom. é volume.',
  'hoje: 4 rodadas de 5 min. meta 20 ideias.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Beleza. Trilha 3. Chegou a hora de CRIAR.\n\nE aqui tem um erro que 90% das pessoas comete: começa a criar julgando. "Essa é boa", "essa é ruim", "essa não vai dar certo". Mata a criatividade na origem.\n\nRegra hoje: PROIBIDO julgar. Você vai despejar ideias no papel — boas, ruins, doidas, óbvias. Todas valem.\n\nPor quê? Porque a terceira, quarta, quinta ideia é a melhor. As duas primeiras são as óbvias. Se você julga cedo, corta o caminho pra ideia boa.\n\nVocê vai fazer 4 rodadas de 5 minutos. Cada rodada com um ângulo diferente. Meta: 20 ideias no fim. Se sair com 12, você foi tímido demais.\n\nRegra do Osborn — o cara que criou brainstorming em 1953: quantidade gera qualidade. Ele estava certo. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar sprint')
  )
),
-- 2. conteúdo curado
(
  '36a1a1fb-9934-4562-83d0-96aab209bda8', 2, 'pilula_b',
  'técnicas · SCAMPER e as regras clássicas',
  '2 leituras rápidas antes de destravar o cronômetro.',
  true, 8, 12,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'scamper-video',
        'title', 'SCAMPER: técnica de brainstorming em 5 min',
        'source', 'busca no YouTube',
        'duration', '~5 min',
        'language', 'português',
        'url', 'https://www.youtube.com/results?search_query=SCAMPER+t%C3%A9cnica+brainstorming+portugu%C3%AAs',
        'description', 'SCAMPER é 7 provocações: Substitua, Combine, Adapte, Modifique, Prescreva outro uso, Elimine, Reverta. Assista e usa na Rodada 1.'
      ),
      jsonb_build_object(
        'id', 'regras-brainstorming',
        'title', 'regras clássicas do brainstorming',
        'source', 'IDEO Design Kit / Sebrae',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://www.designkit.org/methods/28.html',
        'description', 'adie o julgamento, busque quantidade, encoraje ideia doida, construa em cima da ideia do outro.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-quinta-ideia',
        'type', 'single_choice',
        'label', 'segundo pesquisa de criatividade, a melhor ideia costuma aparecer:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'na primeira tentativa', 'value', 'a'),
          jsonb_build_object('label', 'na segunda ou terceira', 'value', 'b'),
          jsonb_build_object('label', 'depois da quinta', 'value', 'c'),
          jsonb_build_object('label', 'aleatoriamente', 'value', 'd')
        ),
        'correct', jsonb_build_array('c'),
        'feedback_correct', 'isso. as primeiras ideias são as decoradas — as que você já traz na cabeça. as seguintes são as construídas. e as depois da 10ª frequentemente são as mais originais.',
        'feedback_wrong', 'as primeiras ideias são as decoradas. as construídas vêm depois — e as mais originais aparecem só depois da quinta ou décima.'
      ),
      jsonb_build_object(
        'id', 'q2-julgar',
        'type', 'single_choice',
        'label', 'julgar ideias durante o brainstorm é ruim porque:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'pode ofender colegas', 'value', 'a'),
          jsonb_build_object('label', 'ativa a área do cérebro que INIBE a criatividade', 'value', 'b'),
          jsonb_build_object('label', 'perde tempo', 'value', 'c'),
          jsonb_build_object('label', 'deixa o ambiente pesado', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. neurociência: julgar ativa o córtex pré-frontal em modo crítico. criatividade precisa de córtex em modo divergente. não dá pra ter os dois ao mesmo tempo.',
        'feedback_wrong', 'na real é neurociência: julgar ativa o córtex pré-frontal em modo crítico e desliga o modo divergente. os dois não coexistem.'
      )
    )
  )
),
-- 3. PBL sprint de ideação
(
  '36a1a1fb-9934-4562-83d0-96aab209bda8', 3, 'exercicio_pbl',
  'sprint de ideação · 4 rodadas × 5 min',
  'HMW + oportunidade puxados. 4 ângulos, meta 20 ideias. sem julgar durante a corrida.',
  true, 22, 28,
  jsonb_build_object(
    'type', 'sprint_ideacao',
    'briefing_source_module_id', 'b83924a0-91e5-4549-a976-041ca6b28651',
    'matriz_source_module_id', '8bfb2523-7c75-4436-859b-1cc0a547cfd0',
    'seconds_per_round', 300,
    'min_total_ideias', 15,
    'target_total_ideias', 20,
    'rodadas', jsonb_build_array(
      jsonb_build_object(
        'id', 'r1',
        'numero', 1,
        'titulo', 'SCAMPER',
        'meta', 5,
        'provocacoes', jsonb_build_array(
          'e se você SUBSTITUÍSSE alguém do processo?',
          'e se COMBINASSE com outra solução existente?',
          'e se ADAPTASSE algo de outro setor?',
          'e se MODIFICASSE o tamanho, cor, contexto?',
          'e se ELIMINASSE uma etapa do processo?',
          'e se REVERTESSE quem paga por quem?'
        )
      ),
      jsonb_build_object(
        'id', 'r2',
        'numero', 2,
        'titulo', 'biomimética',
        'meta', 5,
        'provocacoes', jsonb_build_array(
          'como a NATUREZA resolve problemas parecidos?',
          'termitas fazem ventilação sem eletricidade — e você?',
          'florestas processam resíduo sem lixo — e você?',
          'formigueiros coordenam sem chefe — e você?'
        )
      ),
      jsonb_build_object(
        'id', 'r3',
        'numero', 3,
        'titulo', 'deslocamento',
        'meta', 5,
        'provocacoes', jsonb_build_array(
          'e se fosse GRATUITO pro usuário?',
          'e se você tivesse R$1 MILHÃO pra investir?',
          'e se você tivesse SÓ R$100?'
        )
      ),
      jsonb_build_object(
        'id', 'r4',
        'numero', 4,
        'titulo', 'analogias corporativas',
        'meta', 5,
        'provocacoes', jsonb_build_array(
          'o que o Nubank faria? (experiência sem fricção)',
          'o que o Magazine Luiza faria? (confiança + comunidade)',
          'o que a Natura faria? (impacto + tradição regional)',
          'o que o Uber faria? (conexão sob demanda)',
          'o que a Localiza faria? (uso × propriedade)'
        )
      )
    ),
    'completion', jsonb_build_object('label', 'entregar sprint')
  )
),
-- 4. checagem
(
  '36a1a1fb-9934-4562-83d0-96aab209bda8', 4, 'pilula_c',
  'checagem · o que aconteceu na sua cabeça',
  '3 perguntas rápidas pra fixar o método.',
  true, 4, 6,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-fluencia',
        'type', 'single_choice',
        'label', 'um aluno gerou 8 ideias na rodada 1 mas só 3 nas demais. o que provavelmente aconteceu?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'ele é criativo mas cansa', 'value', 'a'),
          jsonb_build_object('label', 'ele começou a JULGAR e cortou ideias mentalmente', 'value', 'b'),
          jsonb_build_object('label', 'ele não entendeu as rodadas seguintes', 'value', 'c'),
          jsonb_build_object('label', 'as técnicas seguintes são piores', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'provavelmente sacou. quando a fluência cai brusca, é sinal de auto-censura. a técnica não é o problema — é o julgamento entrando no meio.',
        'feedback_wrong', 'quando a fluência cai brusca entre rodadas, quase sempre é o julgamento entrando — não a técnica. auto-censura corta a corrente.'
      ),
      jsonb_build_object(
        'id', 'q2-verdades',
        'type', 'multi_select',
        'label', 'marque as afirmações VERDADEIRAS sobre ideação:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'ideia doida pode virar ideia boa depois de refinada', 'value', 'a'),
          jsonb_build_object('label', 'construir em cima da ideia do outro é bom (yes, and...)', 'value', 'b'),
          jsonb_build_object('label', 'a melhor ideia é sempre a primeira que vem', 'value', 'c'),
          jsonb_build_object('label', 'volume aumenta a chance de qualidade', 'value', 'd')
        ),
        'correct', jsonb_build_array('a', 'b', 'd'),
        'feedback_correct', 'exato: doida vira boa depois, "yes, and..." constrói junto, volume gera qualidade. só a "primeira ideia é a melhor" é mito.',
        'feedback_wrong', 'as verdadeiras são: doida vira boa, "yes, and..." constrói junto, volume gera qualidade. "primeira é a melhor" é mito.'
      ),
      jsonb_build_object(
        'id', 'q3-doida',
        'type', 'long_text',
        'label', 'qual foi a ideia MAIS DOIDA que você teve hoje? (não descarte — só descreve.)',
        'placeholder', 'a mais absurda. a que você quase não escreveu.',
        'min_chars', 40
      )
    )
  )
),
-- 5. bônus
(
  '36a1a1fb-9934-4562-83d0-96aab209bda8', 5, 'registro',
  'bônus · confiança criativa',
  '18 min do David Kelley (IDEO) sobre por que quase todo mundo acha que "não é criativo".',
  false, 15, 20,
  jsonb_build_object(
    'type', 'bonus_text',
    'card', jsonb_build_object(
      'title', 'David Kelley · how to build your creative confidence',
      'source', 'TED (legendas PT)',
      'duration', '~11 min',
      'url', 'https://www.ted.com/talks/david_kelley_how_to_build_your_creative_confidence?language=pt-br',
      'description', 'fundador da IDEO explica por que a maioria acha que "não é criativa" — e por que estão errados.'
    )
  )
);