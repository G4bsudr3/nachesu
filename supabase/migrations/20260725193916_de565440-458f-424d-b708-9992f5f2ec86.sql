
-- Módulo 19 · roteiro de pitch em 6 blocos + primeiro take
UPDATE public.modules
SET
  title = 'encontro 19 · história vende. slide informa.',
  objective = 'construir o roteiro do pitch em 6 blocos (hook, problema+evidência, solução, como regenera, modelo, chamada) com limite de palavras por bloco e gravar o primeiro take em vídeo pra rever antes da versão final.',
  updated_at = now()
WHERE id = '40b59625-6a4f-443a-8343-43b75248d7ef';

DELETE FROM public.module_pills WHERE module_id = '40b59625-6a4f-443a-8343-43b75248d7ef';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1 · abertura
(
  '40b59625-6a4f-443a-8343-43b75248d7ef', 1, 'pilula_a',
  'história vende. slide informa.',
  'hoje: roteiro de pitch em 6 blocos + primeiro take.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Chegamos. Duas aulas pra fechar. Hoje você prepara o pitch. Semana que vem apresenta.\n\nUm aviso: pitch NÃO é resumo de trabalho. Não é sequência de slides. Pitch é HISTÓRIA.\n\nErro clássico: aluno começa "olá, meu nome é X, meu projeto é sobre Y, dividido em 3 partes". Perdeu na primeira frase. Ninguém acorda.\n\nBom pitch começa com um hook, cena, número, contraste, pergunta. Algo que faz o ouvinte parar e pensar "quero saber mais".\n\nVocê vai construir 6 blocos: hook, problema com evidência, solução, como regenera, modelo, chamada. Cabe em 2 a 3 minutos.\n\nAviso 2: hoje você grava um primeiro take. Não vai ser bom. Não precisa. É rascunho. Semana que vem você grava a versão final.\n\nAviso 3 pra quem tem vergonha de gravar: grava mesmo ruim. Assiste depois. Vai ver o que dá pra melhorar. Não gravar é pior que gravar ruim. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2 · conteúdo curado + perguntas-guia
(
  '40b59625-6a4f-443a-8343-43b75248d7ef', 2, 'pilula_b',
  'como um bom pitch se estrutura de verdade',
  'estrutura clássica de pitch curto e referência brasileira de projeto de impacto.',
  true, 10, 15,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'endeavor-pitch',
        'title', 'como fazer um pitch de startup em 3 minutos',
        'source', 'YouTube · busca Endeavor / Sebrae',
        'duration', '~5-8 min',
        'language', 'português',
        'url', 'https://www.youtube.com/results?search_query=pitch+startup+3+minutos+endeavor+sebrae',
        'description', 'estrutura clássica aplicada por quem ouve pitch todo dia. foca no hook e na chamada.'
      ),
      jsonb_build_object(
        'id', 'impacto-br',
        'title', 'pitch curto de negócio de impacto brasileiro',
        'source', 'YouTube · busca',
        'duration', '~3-5 min',
        'language', 'português',
        'url', 'https://www.youtube.com/results?search_query=pitch+comida+invisivel+yalla+aluguel+inpacto',
        'description', 'referência nacional de projeto de impacto que sabe contar história. Comida Invisível, Yalla Aluguel, InPacto — escolhe um.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-erro',
        'type', 'single_choice',
        'label', 'o erro MAIS COMUM em pitches de iniciante é:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'falar rápido demais'),
          jsonb_build_object('id', 'b', 'label', 'começar descrevendo o projeto em vez de puxar o ouvinte com um hook', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'não ter slides bonitos'),
          jsonb_build_object('id', 'd', 'label', 'não decorar')
        ),
        'feedback_correct', 'sacou. primeiros 15 segundos decidem se o ouvinte fica com você. "olá, meu projeto é..." é sonífero. "todo dia 8 quilos de comida vai pro lixo na cantina do Sebrae, quilos, não gramas" desperta.',
        'feedback_incorrect', 'slide bonito e decoreba não salvam abertura fraca. o problema é começar descrevendo o projeto sem hook.'
      ),
      jsonb_build_object(
        'id', 'q2-hook',
        'type', 'multi_choice',
        'label', 'marque os elementos de um HOOK forte:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'um número inesperado', 'correct', true),
          jsonb_build_object('id', 'b', 'label', 'uma cena vivida', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'um contraste ("todo mundo acha X, a verdade é Y")', 'correct', true),
          jsonb_build_object('id', 'd', 'label', 'uma pergunta que desestabiliza', 'correct', true),
          jsonb_build_object('id', 'e', 'label', 'um resumo do projeto')
        ),
        'feedback_correct', 'as 4 primeiras são hook. resumo do projeto é o que se deve EVITAR na abertura, o resumo vai no corpo, não no primeiro tiro.',
        'feedback_incorrect', 'resumo do projeto não é hook. só as 4 primeiras opções são hook.'
      ),
      jsonb_build_object(
        'id', 'q3-primeiro-hook',
        'type', 'long_text',
        'label', 'escreva 1 hook possível pro seu pitch. não precisa ser final, só primeiro tiro.',
        'min_length', 60,
        'placeholder', 'ex: 8 quilos de comida saem da cantina direto pro lixo, todo dia. quilos, não gramas.'
      )
    )
  )
),
-- 3 · PBL roteiro + take
(
  '40b59625-6a4f-443a-8343-43b75248d7ef', 3, 'exercicio_pbl',
  'roteiro em 6 blocos + primeiro take',
  '6 blocos com limite de palavras + grava um primeiro take (rascunho). semana que vem: versão final.',
  true, 25, 40,
  jsonb_build_object(
    'type', 'pitch_roteiro',
    'evidencias_source_module_id', '8c71dbda-2fe4-4981-86a3-37b8600ea9ef',
    'impactos_source_module_id', 'aad1f76b-4926-42a2-9525-0dde21769f2a',
    'proposta_v2_source_module_id', '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1',
    'bmc_v2_source_module_id', '1ebb9978-9dc5-4d23-abec-0b0e4cae19b1',
    'completion', jsonb_build_object('label', 'entregar roteiro + take')
  )
),
-- 4 · checagem rápida
(
  '40b59625-6a4f-443a-8343-43b75248d7ef', 4, 'pilula_c',
  'checagem · hook e chamada',
  'antes de fechar, calibra seu critério de abertura e fechamento.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'p1-cenario',
        'type', 'single_choice',
        'label', 'aluno abre pitch com: "Meu nome é João e meu projeto é sobre reduzir o desperdício de alimentos na cantina." avalie:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'bom, apresentou-se direto'),
          jsonb_build_object('id', 'b', 'label', 'fraco, começa descrevendo, sem hook', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'ok, mas poderia melhorar'),
          jsonb_build_object('id', 'd', 'label', 'depende do resto')
        ),
        'feedback_correct', 'sacou. nome não é hook. descrição de projeto não é hook. comece com o que dói, o que surpreende, o que desperta. o nome cabe no bloco 3 ou 6, não no 1.',
        'feedback_incorrect', 'apresentação de nome + descrição do projeto no primeiro segundo é a receita clássica pra perder o ouvinte. sem hook, sem pitch.'
      ),
      jsonb_build_object(
        'id', 'p2-chamada',
        'type', 'multi_choice',
        'label', 'uma boa chamada de pitch:',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'é específica (ação concreta)', 'correct', true),
          jsonb_build_object('id', 'b', 'label', 'tem prazo ou quantidade se possível', 'correct', true),
          jsonb_build_object('id', 'c', 'label', 'fala com o público certo ("quem topa X me procura")', 'correct', true),
          jsonb_build_object('id', 'd', 'label', 'termina com "obrigado por ouvir"'),
          jsonb_build_object('id', 'e', 'label', 'deixa claro o próximo passo esperado', 'correct', true)
        ),
        'feedback_correct', 'boa chamada é específica, tem público, quantidade e próximo passo claro. "obrigado por ouvir" só amortece o tiro.',
        'feedback_incorrect', 'reveja: "obrigado por ouvir" é encerramento genérico, não chamada. o resto sim.'
      ),
      jsonb_build_object(
        'id', 'p3-auto-analise',
        'type', 'long_text',
        'label', 'assiste seu primeiro take. em 1 frase: o que mais chama atenção (positivo) e o que mais atrapalha? vai virar seu foco de refinamento pra aula 20.',
        'min_length', 80,
        'placeholder', 'ex: gostei da energia no hook, mas gaguejei no bloco do modelo. preciso decorar essa parte.'
      )
    )
  )
),
-- 5 · bônus
(
  '40b59625-6a4f-443a-8343-43b75248d7ef', 5, 'pilula_c',
  'bônus · primeiro pitch da airbnb',
  'pitch histórico de 2009. hoje empresa vale bilhões.',
  false, 5, 10,
  jsonb_build_object(
    'type', 'bonus',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'airbnb-pitch',
        'title', 'o pitch original da airbnb (2009)',
        'source', 'YouTube · busca com legendas PT',
        'duration', '~10 min',
        'language', 'inglês · legendas PT',
        'url', 'https://www.youtube.com/results?search_query=airbnb+original+pitch+deck+2009',
        'description', 'não é perfeito, mas funcionou. foca em: o hook, a evidência (mercado gigante), a chamada.'
      )
    ),
    'reflection', jsonb_build_object(
      'label', 'o que você COPIARIA desse pitch histórico pro seu?',
      'min_length', 40,
      'optional', true
    )
  )
),
-- 6 · fechamento
(
  '40b59625-6a4f-443a-8343-43b75248d7ef', 6, 'pilula_a',
  'missão 19 cumprida',
  'roteiro pronto, primeiro take gravado.',
  true, 1, 2,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Roteiro pronto. Primeiro take gravado. Semana que vem: versão final + mini-dossiê. Fim da estrada.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'finalizar módulo')
  )
);

-- =====================================================
-- RPC: estatísticas admin do módulo 19
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_module19_pitch_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 19
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id UUID;
  _pill UUID;
  _total_students INT;
  _completed INT;
  _entregas INT := 0;
  _com_take INT := 0;
  _media_palavras NUMERIC := 0;
  _media_duracao NUMERIC := 0;
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

  SELECT id INTO _pill
  FROM public.module_pills
  WHERE module_id = _module_id
    AND (interaction_schema->>'type') = 'pitch_roteiro'
  ORDER BY order_index
  LIMIT 1;

  SELECT COUNT(DISTINCT e.user_id) INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON e.course_id = c.id
  WHERE c.slug = _course_slug;

  SELECT COUNT(*) INTO _completed
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id AND smp.completed_at IS NOT NULL;

  IF _pill IS NOT NULL THEN
    WITH entregas AS (
      SELECT
        md.user_id,
        md.updated_at,
        (md.content #> ARRAY['pitch_aula19', _pill::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'pitch_aula19'
        AND (md.content -> 'pitch_aula19') ? _pill::text
    ),
    scored AS (
      SELECT
        e.user_id,
        e.updated_at,
        e.payload,
        (
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(e.payload->>'hook','')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(e.payload->>'problema','')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(e.payload->>'solucao','')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(e.payload->>'regenera','')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(e.payload->>'modelo','')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(e.payload->>'chamada','')), E'\\s+'), 1), 0)
        ) AS total_palavras,
        NULLIF(e.payload->>'take_url','') IS NOT NULL AS tem_take,
        NULLIF(e.payload->>'take_duracao_s','')::numeric AS duracao_s
      FROM entregas e
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE tem_take),
      COALESCE(ROUND(AVG(total_palavras)::numeric, 0), 0),
      COALESCE(ROUND(AVG(duracao_s) FILTER (WHERE tem_take)::numeric, 0), 0)
    INTO _entregas, _com_take, _media_palavras, _media_duracao
    FROM scored;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        (
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(md.content #>> ARRAY['pitch_aula19', _pill::text, 'hook'],'')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(md.content #>> ARRAY['pitch_aula19', _pill::text, 'problema'],'')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(md.content #>> ARRAY['pitch_aula19', _pill::text, 'solucao'],'')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(md.content #>> ARRAY['pitch_aula19', _pill::text, 'regenera'],'')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(md.content #>> ARRAY['pitch_aula19', _pill::text, 'modelo'],'')), E'\\s+'), 1), 0) +
          COALESCE(array_length(regexp_split_to_array(trim(coalesce(md.content #>> ARRAY['pitch_aula19', _pill::text, 'chamada'],'')), E'\\s+'), 1), 0)
        ) AS total_palavras,
        NULLIF(md.content #>> ARRAY['pitch_aula19', _pill::text, 'take_url'], '') IS NOT NULL AS tem_take,
        NULLIF(md.content #>> ARRAY['pitch_aula19', _pill::text, 'take_duracao_s'], '')::numeric AS duracao_s,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'pitch_aula19'
        AND (md.content -> 'pitch_aula19') ? _pill::text
      ORDER BY md.updated_at DESC
      LIMIT 20
    ) s;
  ELSE
    _samples := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill,
    'kpis', jsonb_build_object(
      'total_students', COALESCE(_total_students, 0),
      'completed_count', COALESCE(_completed, 0),
      'entregas', _entregas,
      'com_take', _com_take,
      'media_palavras', _media_palavras,
      'media_duracao_s', _media_duracao
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module19_pitch_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module19_pitch_stats(TEXT, INT) TO authenticated;
