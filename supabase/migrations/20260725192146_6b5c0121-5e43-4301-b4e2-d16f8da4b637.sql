
-- =====================================================
-- Aula 16 · Plano de Experimento (Abertura Trilha Testar)
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module16_plano_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 16
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
  _com_criterio INT := 0;
  _m_landing INT := 0;
  _m_entrevista INT := 0;
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
    AND (interaction_schema->>'type') = 'plano_experimento'
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
        (md.content #> ARRAY['experimento_plano_aula16', _pill_id::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'experimento_plano_aula16'
        AND (md.content -> 'experimento_plano_aula16') ? _pill_id::text
    ),
    scored AS (
      SELECT
        e.user_id,
        e.updated_at,
        e.payload,
        (e.payload->>'metodo') AS metodo,
        (e.payload->>'criterio_sucesso') AS criterio,
        (e.payload->>'criterio_sucesso') ~ '\d' AS has_number
      FROM entregas e
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE has_number),
      COUNT(*) FILTER (WHERE metodo = 'landing'),
      COUNT(*) FILTER (WHERE metodo = 'entrevista')
    INTO _submitted, _com_criterio, _m_landing, _m_entrevista
    FROM scored;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (md.content #>> ARRAY['experimento_plano_aula16', _pill_id::text, 'metodo']) AS metodo,
        (md.content #>> ARRAY['experimento_plano_aula16', _pill_id::text, 'suposicao_key']) AS suposicao_key,
        (md.content #>> ARRAY['experimento_plano_aula16', _pill_id::text, 'criterio_sucesso']) AS criterio_sucesso,
        ((md.content #>> ARRAY['experimento_plano_aula16', _pill_id::text, 'criterio_sucesso']) ~ '\d') AS has_number,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'experimento_plano_aula16'
        AND (md.content -> 'experimento_plano_aula16') ? _pill_id::text
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
      'com_criterio_numero', _com_criterio,
      'metodo_landing', _m_landing,
      'metodo_entrevista', _m_entrevista
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module16_plano_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module16_plano_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 16 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 16 · não adivinhe. teste.',
  objective = 'planejar um experimento leve (< R$100, < 2 semanas) pra testar a suposição mais crítica, com método adequado, métrica quantitativa e critério de sucesso definido antes do teste.',
  updated_at = now()
WHERE id = '7160cf7c-e416-4122-bb77-b6958c3171b0';

DELETE FROM public.module_pills WHERE module_id = '7160cf7c-e416-4122-bb77-b6958c3171b0';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura em vídeo
(
  '7160cf7c-e416-4122-bb77-b6958c3171b0', 1, 'pilula_a',
  'não adivinhe. teste.',
  'hoje: plano de 1 experimento leve. amanhã: execução.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Trilha 4. Você tem quase tudo pronto, mas ainda não testou nada no mundo real.\n\nSe você entregasse o projeto agora, seria PLANO. Bonito. Mas não é PROJETO. Projeto tem contato com realidade.\n\nVocê tem 5 semanas restantes. Vamos usar bem.\n\nHoje: plano de UM experimento leve pra testar sua suposição mais crítica. Não vai construir o app. Não vai lançar produto. Vai TESTAR se a suposição é verdade, com o mínimo esforço possível.\n\nTem 5 tipos que você pode escolher: entrevista, protótipo de papel, landing page falsa, MVP concierge (fazer manualmente pra 3-5 pessoas), fake door.\n\nRegra: menos de R$100 gastos. Menos de 2 semanas de execução. E critério de sucesso DEFINIDO ANTES do teste.\n\nSem critério prévio, você vira advogado da sua ideia, tenta convencer os dados. Com critério prévio, você é cientista, os dados falam. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2. conteúdo curado + perguntas guia
(
  '7160cf7c-e416-4122-bb77-b6958c3171b0', 2, 'pilula_b',
  'método > opinião · testar antes de construir',
  'referências rápidas: entrevista de validação + tipos de mvp.',
  true, 8, 12,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'sebrae-pesquisa-mercado',
        'title', 'como fazer entrevista de validação',
        'source', 'Sebrae',
        'duration', '~8 min',
        'language', 'português',
        'url', 'https://sebrae.com.br/sites/PortalSebrae/artigos/artigoshome/como-elaborar-uma-pesquisa-de-mercado,97a24a2fc16f2410VgnVCM100000b272010aRCRD',
        'description', 'método #1 pra testar suposição sobre público. como perguntar sem induzir a resposta.'
      ),
      jsonb_build_object(
        'id', 'evolvemvp-tipos',
        'title', 'lean startup · 22 tipos de mvp',
        'source', 'Evolve MVP',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://evolvemvp.com/o-que-e-lean-startup/',
        'description', 'menu de tipos de teste rápido. escolhe 1 pra usar hoje.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-metodo',
        'type', 'single_choice',
        'label', 'qual método MELHOR testa a suposição "as pessoas querem pedir refeição antecipada"?',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'construir o app completo'),
          jsonb_build_object('id', 'b', 'label', 'landing page falsa: página do app, botão "pedir refeição", mede quantos clicam', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'pesquisa múltipla escolha ("você usaria?")'),
          jsonb_build_object('id', 'd', 'label', 'focus group')
        ),
        'feedback_correct', 'sacou. landing page falsa mede COMPORTAMENTO (clique), não INTENÇÃO declarada. pesquisa e focus group medem intenção. intenção mente. comportamento não.',
        'feedback_incorrect', 'pensa de novo: você quer medir se as pessoas AGEM, não se elas DIZEM que agiriam.'
      ),
      jsonb_build_object(
        'id', 'q2-criterio',
        'type', 'single_choice',
        'label', 'critério de sucesso PRÉ-DEFINIDO serve pra:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'impressionar avaliador'),
          jsonb_build_object('id', 'b', 'label', 'impedir que você racionalize dados que não gostou', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'deixar tudo organizado'),
          jsonb_build_object('id', 'd', 'label', 'mostrar rigor científico')
        ),
        'feedback_correct', 'isso. sem critério prévio, resultados "meia-boca" viram "promissores". com critério, 3 de 10 é fracasso, 7 de 10 é sucesso. preto no branco.',
        'feedback_incorrect', 'a função é te blindar contra viés de confirmação, não decorar o processo.'
      ),
      jsonb_build_object(
        'id', 'q3-fracasso',
        'type', 'long_text',
        'label', 'se seu experimento fracassar, o que isso te ensina de POSITIVO sobre o projeto?',
        'min_length', 80
      )
    )
  )
),
-- 3. PBL plano de experimento
(
  '7160cf7c-e416-4122-bb77-b6958c3171b0', 3, 'exercicio_pbl',
  'plano de 1 experimento leve',
  'puxa suas 3 suposições da aula 15. escolhe UMA e planeja como testar com o mínimo de esforço.',
  true, 20, 30,
  jsonb_build_object(
    'type', 'plano_experimento',
    'suposicoes_source_module_id', '91e30f31-0e92-4b6e-9d60-70815b490650',
    'completion', jsonb_build_object('label', 'entregar plano')
  )
),
-- 4. checagem
(
  '7160cf7c-e416-4122-bb77-b6958c3171b0', 4, 'pilula_c',
  'sanidade do plano',
  'confere se o experimento planejado sobrevive ao mundo real.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'p1-amigos',
        'type', 'single_choice',
        'label', 'aluno vai testar: "pedir pra 5 amigos opinarem sobre a ideia". isso é:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'bom experimento, feedback qualitativo'),
          jsonb_build_object('id', 'b', 'label', 'fraco, amigos elogiam por educação, não é dado real', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'ok como piloto'),
          jsonb_build_object('id', 'd', 'label', 'depende dos amigos')
        ),
        'feedback_correct', 'isso. amigos são o público mais enviesado que existe. vão puxar sua sardinha. experimento precisa envolver STRANGERS, pessoas que não conhecem você e não têm compromisso emocional.',
        'feedback_incorrect', 'amigos elogiam por educação. dado enviesado. precisa envolver quem não te deve nada.'
      ),
      jsonb_build_object(
        'id', 'p2-leve',
        'type', 'multi_choice',
        'label', 'um experimento leve tem:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'custo baixo (< R$100 ideal)', 'correct', true),
          jsonb_build_object('id', 'b', 'label', 'tempo curto (< 2 semanas)', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'critério de sucesso claro', 'correct', true),
          jsonb_build_object('id', 'd', 'label', 'amostra pequena mas relevante', 'correct', true),
          jsonb_build_object('id', 'e', 'label', 'precisa de aprovação institucional')
        ),
        'feedback_correct', 'leve = barato, rápido, com critério e com amostra que representa. aprovação institucional é pra projeto grande, não pra teste.',
        'feedback_incorrect', 'aprovação institucional NÃO faz parte. o resto sim.'
      ),
      jsonb_build_object(
        'id', 'p3-proximo',
        'type', 'long_text',
        'label', 'se seu experimento validar a suposição, qual é o PRÓXIMO teste que você faria? (plantando semente pra próxima iteração.)',
        'min_length', 80
      )
    )
  )
),
-- 5. bônus dropbox
(
  '7160cf7c-e416-4122-bb77-b6958c3171b0', 5, 'pilula_c',
  'bônus · como o dropbox validou a ideia com 1 vídeo',
  'case clássico: fundadora gravou vídeo mostrando como o produto funcionaria, mediu inscritos. 75 mil em 1 dia. sem código.',
  false, 4, 6,
  jsonb_build_object(
    'type', 'bonus',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'dropbox-mvp',
        'title', 'como o dropbox validou sua ideia com 1 vídeo',
        'source', 'YouTube',
        'duration', '~4 min',
        'language', 'inglês com legendas em português',
        'url', 'https://www.youtube.com/watch?v=7QmCUDHpNzE',
        'description', 'o mvp mais famoso da história. sem produto, sem código, sem app. só um vídeo mostrando como seria. 75 mil pessoas se inscreveram na lista de espera em 1 dia.'
      )
    ),
    'reflection', jsonb_build_object(
      'label', 'o que do case do dropbox você consegue adaptar pro seu experimento?',
      'min_length', 50,
      'optional', true
    )
  )
);
