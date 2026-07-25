
CREATE OR REPLACE FUNCTION public.admin_module9_impactos_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 9
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
  _p_planeta INT := 0;
  _p_pessoas INT := 0;
  _p_prosperidade INT := 0;
  _tres INT := 0;
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
    AND (interaction_schema->>'type') = 'impactos_3p'
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
        (md.content #> ARRAY['impactos_aula9', _pill_id::text]) AS v
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'impactos_aula9'
        AND (md.content -> 'impactos_aula9') ? _pill_id::text
    ),
    flags AS (
      SELECT
        v,
        (v #>> ARRAY['planeta','metrica']) ~ '\d+' AS planeta_ok,
        (v #>> ARRAY['pessoas','metrica']) ~ '\d+' AS pessoas_ok,
        (v #>> ARRAY['prosperidade','metrica']) ~ '\d+' AS prosperidade_ok
      FROM entregas
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE planeta_ok),
      COUNT(*) FILTER (WHERE pessoas_ok),
      COUNT(*) FILTER (WHERE prosperidade_ok),
      COUNT(*) FILTER (WHERE planeta_ok AND pessoas_ok AND prosperidade_ok)
    INTO _submitted, _p_planeta, _p_pessoas, _p_prosperidade, _tres
    FROM flags;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (md.content #>> ARRAY['impactos_aula9', _pill_id::text, 'planeta','estado_desejado']) AS planeta_desejado,
        (md.content #>> ARRAY['impactos_aula9', _pill_id::text, 'planeta','metrica']) AS planeta_metrica,
        (md.content #>> ARRAY['impactos_aula9', _pill_id::text, 'pessoas','estado_desejado']) AS pessoas_desejado,
        (md.content #>> ARRAY['impactos_aula9', _pill_id::text, 'pessoas','metrica']) AS pessoas_metrica,
        (md.content #>> ARRAY['impactos_aula9', _pill_id::text, 'prosperidade','estado_desejado']) AS prosperidade_desejado,
        (md.content #>> ARRAY['impactos_aula9', _pill_id::text, 'prosperidade','metrica']) AS prosperidade_metrica,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'impactos_aula9'
        AND (md.content -> 'impactos_aula9') ? _pill_id::text
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
      'metrica_valida_planeta', _p_planeta,
      'metrica_valida_pessoas', _p_pessoas,
      'metrica_valida_prosperidade', _p_prosperidade,
      'tres_dimensoes_validas', _tres
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module9_impactos_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module9_impactos_stats(TEXT, INT) TO authenticated;

UPDATE public.modules
SET
  title = 'encontro 9 · matriz antes vs. depois',
  objective = 'definir 3 impactos positivos concretos (planeta, pessoas, prosperidade) com métrica de verdade — número, unidade e prazo.',
  updated_at = now()
WHERE id = 'aad1f76b-4926-42a2-9525-0dde21769f2a';

DELETE FROM public.module_pills WHERE module_id = 'aad1f76b-4926-42a2-9525-0dde21769f2a';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
(
  'aad1f76b-4926-42a2-9525-0dde21769f2a', 1, 'pilula_a',
  'não basta não estragar. tem que melhorar.',
  'sustentável ≠ regenerativo. e a diferença muda o jogo.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Duas palavras que parecem sinônimos, mas não são: SUSTENTÁVEL e REGENERATIVO.\n\nSustentável significa: não piora. Neutro. Zera o dano.\n\nRegenerativo significa: melhora. Deixa o sistema melhor do que estava.\n\nUm exemplo que dói: se você planta 100 árvores pra compensar as 100 que cortou, é sustentável. Se você planta 200 e recupera o solo do entorno, é regenerativo.\n\nHoje sua missão é dura: definir 3 impactos positivos concretos que seu projeto vai gerar. Um ambiental, um social, um econômico.\n\nE vou te forçar a fugir de duas armadilhas. Primeira: palavras genéricas tipo "mais consciência", "mais engajamento". Não vale. Segunda: "reduzir", "diminuir", "minimizar". Sozinhas, não valem — porque são só evitar dano. Regenerativo é CONSTRUIR, AUMENTAR, RESTAURAR.\n\nCada impacto vai precisar de métrica. Sem número, é discurso. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
(
  'aad1f76b-4926-42a2-9525-0dde21769f2a', 2, 'pilula_b',
  'sustentável vs. regenerativo · triple bottom line',
  'estudo curado + cartaz dos 3 P''s.',
  true, 12, 18,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'emf-regenerar',
        'title', 'regenerar a natureza',
        'source', 'Ellen MacArthur Foundation',
        'duration', '~8 min',
        'language', 'português',
        'url', 'https://www.ellenmacarthurfoundation.org/pt/regenerar-a-natureza',
        'description', 'revisita a página com foco novo agora: quais MÉTRICAS eles usam? Que dados? Vai te inspirar.'
      ),
      jsonb_build_object(
        'id', 'case-br',
        'title', 'cases brasileiros de impacto regenerativo',
        'source', 'busca sugerida',
        'duration', '~10 min',
        'language', 'português',
        'url', 'https://www.google.com/search?q=Natura+Amaz%C3%B4nia+regenera%C3%A7%C3%A3o+OR+%22Ambev+programa+zero+aterro%22',
        'description', 'cases nacionais de negócios que declaram impacto regenerativo. presta atenção nas métricas que usam.'
      )
    ),
    'complement', jsonb_build_object(
      'title', 'triple bottom line · os 3 P''s',
      'md', E'todo impacto regenerativo se conta em três eixos:\n\n- **PLANETA** — ambiental. solo, água, ar, biodiversidade.\n- **PESSOAS** — social. quem trabalha, quem vive perto, quem usa.\n- **PROSPERIDADE** — econômica. renda, custo evitado, riqueza gerada.\n\nSe faltar um dos três, é meia solução.'
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-regenerativas',
        'type', 'multi_choice',
        'label', 'quais destas são frases REGENERATIVAS (não só sustentáveis)?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'reduzir uso de plástico em 30%', 'value', 'a'),
          jsonb_build_object('label', 'aumentar biodiversidade local com 500 mudas nativas plantadas', 'value', 'b'),
          jsonb_build_object('label', 'devolver 200% mais água ao aquífero do que consumimos', 'value', 'c'),
          jsonb_build_object('label', 'emitir menos carbono', 'value', 'd'),
          jsonb_build_object('label', 'restaurar 2 hectares de mata ciliar em parceria com a Prefeitura de BH', 'value', 'e')
        ),
        'correct', jsonb_build_array('b','c','e'),
        'feedback_correct', 'exato. as três somam ao sistema (aumentam, devolvem, restauram). as outras duas só evitam dano — são sustentáveis, não regenerativas.',
        'feedback_wrong', 'as regenerativas são: aumentar biodiversidade, devolver 200% de água e restaurar mata ciliar. as outras (reduzir plástico, emitir menos) só evitam dano.'
      ),
      jsonb_build_object(
        'id', 'q2-se-desse-certo',
        'type', 'long_text',
        'label', 'pensa no seu projeto. se ele desse muito certo, o QUE DE FATO ficaria melhor no mundo? escreva SEM usar as palavras "reduzir", "minimizar", "diminuir".',
        'min_chars', 120
      ),
      jsonb_build_object(
        'id', 'q3-sem-metrica',
        'type', 'single_choice',
        'label', 'impacto sem métrica é:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'aceitável em fase inicial', 'value', 'a'),
          jsonb_build_object('label', 'discurso', 'value', 'b'),
          jsonb_build_object('label', 'prática comum', 'value', 'c'),
          jsonb_build_object('label', 'melhor que impacto errado', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. sem número, qualquer promessa serve. métrica é o que separa promessa de compromisso.',
        'feedback_wrong', 'é discurso. sem número, qualquer promessa serve. métrica é o que separa promessa de compromisso.'
      )
    )
  )
),
(
  'aad1f76b-4926-42a2-9525-0dde21769f2a', 3, 'exercicio_pbl',
  'missão 9: matriz antes vs. depois',
  '3 dimensões · atual, desejado e métrica. sem número, não passa.',
  true, 18, 28,
  jsonb_build_object(
    'type', 'impactos_3p',
    'briefing_source_module_id', 'b83924a0-91e5-4549-a976-041ca6b28651',
    'regras_source_module_id', 'ffa5a6e4-a143-4934-9cd7-d730bdb41d87',
    'min_chars_atual', 30,
    'min_chars_desejado', 30,
    'palavras_bloqueadas', jsonb_build_array('reduzir','diminuir','minimizar'),
    'ancoras', jsonb_build_object(
      'planeta', jsonb_build_object(
        'atual', '8kg de comida/dia vira lixo',
        'desejado', 'todo resíduo vira composto',
        'metrica', '100% dos 8kg compostados em 6 meses'
      ),
      'pessoas', jsonb_build_object(
        'atual', 'cozinheiras não sabem quanto se desperdiça',
        'desejado', 'painel diário visível pra todo mundo',
        'metrica', 'dashboard atualizado 3x/semana por 12 semanas'
      ),
      'prosperidade', jsonb_build_object(
        'atual', 'custo do descarte + compra excedente = R$X/mês',
        'desejado', 'menos compra + venda do composto',
        'metrica', 'economia de R$X/mês + R$Y de receita em 12 meses'
      )
    ),
    'completion', jsonb_build_object('label', 'definir meus impactos')
  )
),
(
  'aad1f76b-4926-42a2-9525-0dde21769f2a', 4, 'pilula_c',
  'checagem rápida',
  'três perguntas pra afiar a régua.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-consciencia',
        'type', 'single_choice',
        'label', 'um projeto declara: "nosso impacto social é gerar mais consciência sobre desperdício". isso é impacto regenerativo?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'sim, consciência é importante', 'value', 'a'),
          jsonb_build_object('label', 'é impacto mas não é regenerativo — falta métrica e ação concreta', 'value', 'b'),
          jsonb_build_object('label', 'não é impacto, é objetivo', 'value', 'c'),
          jsonb_build_object('label', 'depende do projeto', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'isso. "consciência" é vago demais pra medir. regenerativo tem que ter: ação concreta + métrica + beneficiário. "X pessoas treinadas em Y prática, com Z resultado mensurável em N tempo" — isso é impacto real.',
        'feedback_wrong', '"consciência" é vago demais pra medir. regenerativo pede ação concreta + métrica + beneficiário.'
      ),
      jsonb_build_object(
        'id', 'q2-boa-metrica',
        'type', 'multi_choice',
        'label', 'uma boa métrica de impacto tem:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'número específico', 'value', 'a'),
          jsonb_build_object('label', 'unidade de medida clara', 'value', 'b'),
          jsonb_build_object('label', 'prazo definido', 'value', 'c'),
          jsonb_build_object('label', 'fonte de verificação (como você vai medir?)', 'value', 'd'),
          jsonb_build_object('label', 'palavras poéticas sobre transformação', 'value', 'e')
        ),
        'correct', jsonb_build_array('a','b','c','d'),
        'feedback_correct', 'as quatro primeiras. sem número, sem unidade, sem prazo e sem forma de verificar, é discurso.',
        'feedback_wrong', 'as quatro primeiras. poesia sobre transformação não é métrica — é marketing.'
      ),
      jsonb_build_object(
        'id', 'q3-manchete',
        'type', 'long_text',
        'label', 'se um jornalista te entrevistasse daqui a 5 anos sobre esse projeto, e perguntasse "o que mudou no mundo?", qual seria a resposta que você quer poder dar? (2-3 frases.)',
        'min_chars', 100,
        'no_feedback', true
      )
    )
  )
),
(
  'aad1f76b-4926-42a2-9525-0dde21769f2a', 5, 'registro',
  'bônus: doughnut economics · Kate Raworth',
  'conceito universitário-avançado, mas Kate explica bem no TED.',
  false, 8, 14,
  jsonb_build_object(
    'type', 'bonus_text',
    'badge', 'destrava um nível novo',
    'search_query', 'Kate Raworth TED Doughnut Economics',
    'search_url', 'https://www.ted.com/talks/kate_raworth_a_healthy_economy_should_be_designed_to_thrive_not_grow?subtitle=pt-br',
    'disclaimer', 'TED em inglês com legendas em português. Kate propõe o modelo da rosquinha: piso social + teto ecológico. Se topou a Trilha 2 até aqui, esse vídeo destrava um nível novo.',
    'response', jsonb_build_object(
      'label', 'depois de assistir, registra:',
      'fields', jsonb_build_array(
        jsonb_build_object('id', 'rosquinha_conecta', 'label', 'qual borda da rosquinha (piso social OU teto ecológico) mais se conecta com o problema que você tá trabalhando?', 'min_chars', 40)
      )
    )
  )
);
