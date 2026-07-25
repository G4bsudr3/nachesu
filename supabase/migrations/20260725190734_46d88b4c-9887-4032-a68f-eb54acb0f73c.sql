-- =====================================================
-- Aula 14 · BMC Simplificado
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_module14_bmc_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 14
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
  _com_2_receitas INT := 0;
  _autoteste_amarelo INT := 0;
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
    AND (interaction_schema->>'type') = 'bmc_simplificado'
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
        (md.content #> ARRAY['bmc_aula14', _pill_id::text]) AS payload
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'bmc_aula14'
        AND (md.content -> 'bmc_aula14') ? _pill_id::text
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (
        WHERE jsonb_typeof(payload->'receitas') = 'array'
          AND jsonb_array_length(payload->'receitas') >= 2
      ),
      COUNT(*) FILTER (
        WHERE (payload #>> ARRAY['autoteste','opera_sem_principal']) = 'nao'
           OR (payload #>> ARRAY['autoteste','custo_menor_receita']) = 'nao'
           OR (payload #>> ARRAY['autoteste','parceiro_critico']) = 'sim'
      )
    INTO _submitted, _com_2_receitas, _autoteste_amarelo
    FROM entregas;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        md.content #>> ARRAY['bmc_aula14', _pill_id::text, 'segmento']  AS segmento,
        COALESCE(
          jsonb_array_length(md.content #> ARRAY['bmc_aula14', _pill_id::text, 'receitas']),
          0
        ) AS n_receitas,
        COALESCE(
          jsonb_array_length(md.content #> ARRAY['bmc_aula14', _pill_id::text, 'custos']),
          0
        ) AS n_custos,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'bmc_aula14'
        AND (md.content -> 'bmc_aula14') ? _pill_id::text
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
      'com_2_receitas', _com_2_receitas,
      'autoteste_amarelo', _autoteste_amarelo
    ),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module14_bmc_stats(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module14_bmc_stats(TEXT, INT) TO authenticated;

-- =====================================================
-- Módulo 14 · conteúdo
-- =====================================================

UPDATE public.modules
SET
  title = 'encontro 14 · boa intenção não paga conta',
  objective = 'desenhar um business model canvas simplificado (5 blocos) com pelo menos 2 fontes de receita e passar no autoteste de sustentabilidade.',
  updated_at = now()
WHERE id = '0b394fff-3c00-4d18-860c-25390e28cceb';

DELETE FROM public.module_pills WHERE module_id = '0b394fff-3c00-4d18-860c-25390e28cceb';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
-- 1. abertura
(
  '0b394fff-3c00-4d18-860c-25390e28cceb', 1, 'pilula_a',
  'boa intenção não paga conta',
  'como sua ideia se sustenta economicamente.',
  true, 2, 4,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Você tem proposta de valor. Boa. Mas tem uma pergunta que sempre volta: como isso se paga?\n\nSe você não sabe QUEM vai pagar, o projeto morre. Não importa quanto valor ele gera pro mundo — se ninguém banca, não escala.\n\nAviso: "doação" e "patrocínio" NÃO são modelo. São muleta. Podem entrar como parte, mas não como base. Negócios que dependem só de doação vivem de mão estendida.\n\nModelo forte tem 2-3 fontes de receita combinadas. Ex: venda direta + licenciamento + parceria pública. Ou: consumo B2C + serviço B2B.\n\nVocê vai preencher um Business Model Canvas simplificado — 5 blocos. Vai pensar: quem paga, quanto, quais custos, quais parceiros essenciais.\n\nPra alunos de 1º ano, isso é forte. Você tá aprendendo a fazer o que muito profissional sênior faz mal. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
-- 2. conteúdo curado
(
  '0b394fff-3c00-4d18-860c-25390e28cceb', 2, 'pilula_b',
  'business model canvas · o mapa do dinheiro',
  'referências rápidas antes de encarar o canvas.',
  true, 8, 12,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'sebrae-mg-bmc',
        'title', 'o que é business model canvas e como aplicar',
        'source', 'Sebrae Minas',
        'duration', '~8 min',
        'language', 'português',
        'url', 'https://www.inovacaosebraeminas.com.br/artigo/o-que-e-business-model-canvas-e-como-aplica-lo-no-seu-negocio',
        'description', 'guia oficial do sebrae minas, feito pra empreendedor iniciante. foca nos 5 blocos que vamos usar hoje.'
      ),
      jsonb_build_object(
        'id', 'modelos-circulares-br',
        'title', 'modelos de negócio circulares · exemplos brasil',
        'source', 'busca — CE Hub e cases nacionais',
        'duration', '~6 min',
        'language', 'português',
        'url', 'https://www.google.com/search?q=modelos+de+neg%C3%B3cio+circulares+brasil+exemplos',
        'description', 'referências reais de empresas brasileiras que combinam múltiplas fontes de receita em modelos circulares.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-fragil',
        'type', 'single_choice',
        'label', 'qual destas é a fonte de receita MAIS FRÁGIL como base de modelo?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'venda direta pra consumidor', 'value', 'a'),
          jsonb_build_object('label', 'licenciamento', 'value', 'b'),
          jsonb_build_object('label', 'doação / filantropia', 'value', 'c'),
          jsonb_build_object('label', 'contrato B2B', 'value', 'd')
        ),
        'correct', jsonb_build_array('c'),
        'feedback_correct', 'doação depende de contexto emocional e humor de terceiros. serve como componente, não como base. modelo forte não vive de generosidade, vive de troca de valor.',
        'feedback_wrong', 'a mais frágil é doação/filantropia — depende do humor de terceiros. venda, licenciamento e B2B são trocas de valor que se sustentam.'
      ),
      jsonb_build_object(
        'id', 'q2-canal',
        'type', 'single_choice',
        'label', 'você criou um app de pedidos antecipados de refeição. o CANAL principal seria:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'cartaz na cantina', 'value', 'a'),
          jsonb_build_object('label', 'o próprio app (loja de aplicativos + notificações)', 'value', 'b'),
          jsonb_build_object('label', 'boca a boca', 'value', 'c'),
          jsonb_build_object('label', 'instagram', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'sacou. canal é como você chega no cliente E como ele acessa a solução. se a solução É o app, o app É o canal principal.',
        'feedback_wrong', 'quando a solução é digital, o próprio produto costuma ser o canal principal. cartaz, instagram e boca a boca ajudam a divulgar, mas o acesso acontece no app.'
      ),
      jsonb_build_object(
        'id', 'q3-custos',
        'type', 'multi_select',
        'label', 'marque os custos GERALMENTE SUBESTIMADOS por quem começa:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'marketing e aquisição de cliente', 'value', 'a'),
          jsonb_build_object('label', 'tempo próprio (quanto vale sua hora?)', 'value', 'b'),
          jsonb_build_object('label', 'manutenção contínua', 'value', 'c'),
          jsonb_build_object('label', 'custo do produto/serviço em si', 'value', 'd'),
          jsonb_build_object('label', 'suporte pós-venda', 'value', 'e')
        ),
        'correct', jsonb_build_array('a', 'b', 'c', 'e'),
        'feedback_correct', 'exato. o 4º é o único que iniciante costuma considerar. marketing, tempo próprio, manutenção e suporte pós-venda são os buracos que quebram projeto.',
        'feedback_wrong', 'os subestimados são marketing, tempo próprio, manutenção e suporte pós-venda. o custo direto do produto costuma ser o único enxergado no início.'
      )
    )
  )
),
-- 3. PBL BMC
(
  '0b394fff-3c00-4d18-860c-25390e28cceb', 3, 'exercicio_pbl',
  'business model canvas simplificado',
  '5 blocos + autoteste. puxamos sua proposta de valor da aula 13 e seus stakeholders da aula 10.',
  true, 22, 30,
  jsonb_build_object(
    'type', 'bmc_simplificado',
    'proposta_source_module_id', 'ac6945a0-d7b5-41f5-b4b2-eea8c092bd51',
    'stakeholders_source_module_id', 'd31b1dd2-e396-4cd7-b6e0-3cb7f3a9341a',
    'blocos', jsonb_build_array(
      jsonb_build_object(
        'id', 'segmento',
        'titulo', 'SEGMENTO(S) DE CLIENTES',
        'hint', 'quem paga (pode ser diferente de quem usa). ex: alunos usam, mas escola paga.',
        'min_chars', 50
      ),
      jsonb_build_object(
        'id', 'canais',
        'titulo', 'CANAIS',
        'hint', 'como o cliente descobre e acessa a solução. mín. 2 canais.',
        'min_chars', 40
      )
    ),
    'receitas', jsonb_build_object(
      'min', 2,
      'sugestoes', jsonb_build_array('venda direta B2C', 'contrato B2B', 'licenciamento', 'assinatura', 'freemium + premium', 'parceria pública', 'patrocínio (só como parte)', 'comissão')
    ),
    'custos', jsonb_build_object(
      'min', 5,
      'sugestoes', jsonb_build_array('infra e hospedagem', 'marketing e aquisição', 'tempo próprio', 'suporte pós-venda', 'manutenção contínua', 'insumos', 'logística', 'equipe')
    ),
    'autoteste', jsonb_build_array(
      jsonb_build_object(
        'id', 'opera_sem_principal',
        'pergunta', 'se sua fonte principal de receita falhar, você ainda opera?',
        'tipo', 'sim_nao',
        'alerta_se', 'nao',
        'alerta_texto', 'risco alto: modelo depende de uma perna só. reforça uma segunda fonte antes de sair do papel.'
      ),
      jsonb_build_object(
        'id', 'custo_menor_receita',
        'pergunta', 'em 12 meses de operação, seu custo total é menor que sua receita total (estimativa)?',
        'tipo', 'sim_nao_naosei',
        'alerta_se', 'nao',
        'alerta_texto', 'atenção: se o custo passa a receita, o modelo não fecha. revisa custos e ticket.'
      ),
      jsonb_build_object(
        'id', 'parceiro_critico',
        'pergunta', 'existe UM parceiro sem o qual o modelo cai?',
        'tipo', 'sim_nao_texto',
        'alerta_se', 'sim',
        'alerta_texto', 'dependência única é ponto fraco. tenha um plano B pra esse parceiro.'
      )
    ),
    'completion', jsonb_build_object('label', 'entregar modelo')
  )
),
-- 4. checagem
(
  '0b394fff-3c00-4d18-860c-25390e28cceb', 4, 'pilula_c',
  'checagem · o teste do modelo',
  '3 perguntas rápidas pra separar modelo forte de modelo torto.',
  true, 4, 6,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-propaganda',
        'type', 'single_choice',
        'label', 'modelo: "app gratuito pra usuários, receita vem de propaganda." avalie:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'ótimo — modelo facebook', 'value', 'a'),
          jsonb_build_object('label', 'risco alto — propaganda sozinha exige escala gigante', 'value', 'b'),
          jsonb_build_object('label', 'fraco — deveria cobrar', 'value', 'c'),
          jsonb_build_object('label', 'impossível avaliar', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'propaganda como única fonte funciona pra facebook (bilhões de usuários). pra projeto começando: 1 milhão de views/mês ≈ r$ 3-5 mil de receita. praticamente nada. modelo real precisa ter B2B ou premium junto.',
        'feedback_wrong', 'propaganda sozinha exige escala gigantesca. sem 1M+ de views/mês, a conta não fecha. modelos que dependem só de ads são frágeis no começo.'
      ),
      jsonb_build_object(
        'id', 'q2-regenerativo',
        'type', 'multi_select',
        'label', 'um modelo REGENERATIVO forte tende a:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'ter múltiplas fontes de receita', 'value', 'a'),
          jsonb_build_object('label', 'envolver parceiros com interesse próprio alinhado', 'value', 'b'),
          jsonb_build_object('label', 'capturar valor que hoje é desperdício', 'value', 'c'),
          jsonb_build_object('label', 'depender exclusivamente de subsídio público', 'value', 'd'),
          jsonb_build_object('label', 'ter custos crescentes com escala (não escala)', 'value', 'e')
        ),
        'correct', jsonb_build_array('a', 'b', 'c'),
        'feedback_correct', 'exato: múltiplas receitas, parceiros com interesse alinhado e captura de desperdício. os dois últimos itens descrevem modelos frágeis.',
        'feedback_wrong', 'as verdadeiras são: múltiplas receitas, parceiros com interesse alinhado e captura de desperdício. subsídio único e custos crescentes com escala são sinais de fragilidade.'
      ),
      jsonb_build_object(
        'id', 'q3-fracasso',
        'type', 'long_text',
        'label', 'se seu modelo fracassar economicamente, qual é a razão MAIS PROVÁVEL? vamos usar isso no encontro 15.',
        'min_chars', 80
      )
    )
  )
),
-- 5. bônus
(
  '0b394fff-3c00-4d18-860c-25390e28cceb', 5, 'registro',
  'bônus · e-book sebrae rs sobre BMC',
  'aprofundamento pros 9 blocos completos do canvas.',
  false, 15, 25,
  jsonb_build_object(
    'type', 'bonus_text',
    'card', jsonb_build_object(
      'title', 'tudo sobre o business model canvas',
      'source', 'Sebrae RS',
      'duration', '~40 páginas',
      'url', 'https://conhecimento.sebraers.com.br/wp-content/uploads/2022/11/E-book-Tudo-sobre-o-Business-Model-Canvas.pdf',
      'description', 'e-book oficial do sebrae rs. aprofunda os 9 blocos completos (nós usamos 5). se topou, é referência sólida.'
    )
  )
);