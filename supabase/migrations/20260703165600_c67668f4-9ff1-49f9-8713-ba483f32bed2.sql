
UPDATE public.modules m
SET
  title = 'encontro 4 · prova de realidade',
  objective = 'sair do achismo e trazer 3 evidências reais do problema escolhido em BH.',
  deliverable_description = '3 evidências (foto, áudio de entrevista curta ou registro documental) + 1 parágrafo de síntese conectando elas.',
  total_minutes = 50
FROM public.trails t
WHERE m.trail_id = t.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 4;

UPDATE public.modules m
SET
  title = 'encontro 5 · escolha do problema e fluxo',
  objective = 'fechar a trilha enxergar decidindo o problema definitivo e o fluxo circular associado.',
  deliverable_description = 'briefing do projeto em 1 página: how might we + fluxo escolhido + evidências resumidas + trade-off + justificativa pessoal.',
  total_minutes = 50
FROM public.trails t
WHERE m.trail_id = t.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 5;

-- MÓDULO 4 · pílula A
UPDATE public.module_pills p
SET
  title = 'abertura · a divisora de águas',
  kind = 'pilula_a',
  body_md = 'até agora você tá trabalhando com hipóteses. hoje é diferente. hoje você precisa provar. evidência não é foto bonita, é qualquer prova concreta de que o problema existe fora da sua cabeça: contagem, áudio de gente vivendo, print de dado público, observação estruturada.',
  duration_min_low = 4,
  duration_min_high = 6,
  video_url = '/__l5e/assets-v1/4b0fabaf-7293-4111-a70d-a14af7a668d8/dudu-modulo-04-abertura.mov',
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'video_with_transcript',
    'transcript_collapsible', true,
    'transcript', 'oi, tudo bem? essa aula é a divisora de águas da nossa trilha. até aqui a gente vinha desenhando hipóteses: no encontro 1 você olhou rápido pro que te incomoda em BH, no encontro 3 você imaginou quem ganha e quem perde com esse problema. hoje eu preciso que você prove. evidência empírica. pode ser quantitativa (medi o tempo da fila do bandejão por 3 dias), qualitativa vivida (áudio curto de alguém contando como o problema aparece na vida dela) ou documental (print de matéria, dado público, foto de registro). a melhor evidência é a que vem de quem vive o problema, não relatório de terceiros. se você fizer isso direito, na próxima aula você vai ter clareza pra decidir o problema definitivo. se descobrir que sua hipótese estava errada, ótimo, isso é pesquisa de verdade. bora.',
    'completion', jsonb_build_object('label', 'assisti, bora seguir')
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 4
  AND p.order_index = 1;

-- MÓDULO 4 · pílula B (entrevista de descoberta)
UPDATE public.module_pills p
SET
  title = 'como fazer uma entrevista de descoberta',
  kind = 'pilula_b',
  body_md = 'entrevista curta é a ferramenta mais poderosa de campo. 3 perguntas abertas, 5 minutos, celular gravando. quem vive o problema tem detalhes que você não consegue imaginar de longe.',
  duration_min_low = 6,
  duration_min_high = 8,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'design-kit-interview',
        'title', 'métodos de entrevista · IDEO design kit',
        'source', 'IDEO.org',
        'url', 'https://www.designkit.org/methods/interview',
        'duration', '5 min de leitura',
        'language', 'inglês (dá pra usar tradutor)',
        'description', 'template curto sobre como preparar 3 perguntas abertas e ouvir sem interromper.'
      ),
      jsonb_build_object(
        'id', 'roteiro-3-perguntas',
        'title', 'roteiro-base: 3 perguntas pra qualquer entrevista',
        'source', 'material Naches',
        'url', 'https://www.designkit.org/methods/conversation-starters',
        'duration', '2 min',
        'description', '(1) me conta uma vez recente que isso aconteceu com você. (2) o que você fez? (3) se pudesse mudar uma coisa nesse momento, o que seria?'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q_pergunta_aberta',
        'type', 'long_text',
        'label', 'qual seria sua primeira pergunta pra alguém que vive o problema que você escolheu? escreve ela do jeito que você diria.',
        'min_chars', 30
      ),
      jsonb_build_object(
        'id', 'q_a_quem_perguntar',
        'type', 'long_text',
        'label', 'quem você vai entrevistar? um nome, um lugar, um jeito de chegar nessa pessoa nas próximas 24h.',
        'min_chars', 20
      )
    )
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 4
  AND p.order_index = 2;

-- MÓDULO 4 · pílula C (observação estruturada)
UPDATE public.module_pills p
SET
  title = 'observação estruturada · o que registrar',
  kind = 'pilula_c',
  body_md = 'observar não é olhar de longe. observar é chegar, anotar data e hora, contar quantos, escrever o que ninguém percebe. o número dá músculo à sua história.',
  duration_min_low = 5,
  duration_min_high = 7,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'observacao-guia',
        'title', 'guia rápido de observação de campo',
        'source', 'material Naches',
        'url', 'https://www.designkit.org/methods/immersion',
        'duration', '3 min',
        'description', '5 colunas pra levar no bloco de notas: (1) data e hora, (2) local, (3) o que aconteceu, (4) quantos/quanto tempo, (5) o que me chamou atenção.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q_o_que_observar',
        'type', 'long_text',
        'label', 'que local (específico, com endereço ou nome) você vai observar nas próximas 48h? e por quanto tempo?',
        'min_chars', 25
      )
    )
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 4
  AND p.order_index = 3;

-- MÓDULO 4 · pílula PBL (3 evidências)
UPDATE public.module_pills p
SET
  title = 'exercício · caça às 3 evidências',
  kind = 'exercicio_pbl',
  body_md = 'agora você vai a campo. escolha um método por evidência (entrevista, observação, documental) e traga 3 provas distintas do problema que você escolheu. pelo menos 1 tem que envolver pessoa real.',
  duration_min_low = 22,
  duration_min_high = 28,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'pbl_estruturado',
    'tutor_prompt', 'ajude o estudante a refinar a descrição das evidências. peça pra ele ser específico: quem, onde, quando, o que revela. se ele tá inseguro pra entrevistar, sugira formatos mais leves (áudio de whatsapp, conversa curta com alguém próximo).',
    'contexto_md', 'você tem 3 espaços pra registrar 3 evidências diferentes do seu problema. cada evidência precisa de: descrição curta (o que é, onde foi, com quem) e o arquivo ou link da prova (foto, áudio da entrevista, print de matéria, vídeo curto). o objetivo é sustentar a decisão da próxima aula com material real, não com achismo.',
    'passos', jsonb_build_array(
      jsonb_build_object(
        'titulo', 'sai da cadeira',
        'descricao', 'escolhe 1 dos 3 métodos por evidência: entrevista (áudio curto de 3 min), observação estruturada (anotação com data, local, contagem), documental (print de matéria ou dado público).'
      ),
      jsonb_build_object(
        'titulo', 'diversifica as fontes',
        'descricao', 'as 3 evidências precisam ser de lugares ou pessoas diferentes. 3 fotos do mesmo canto da escola conta como 1 só.'
      ),
      jsonb_build_object(
        'titulo', 'pelo menos 1 pessoa real',
        'descricao', 'uma das 3 evidências tem que envolver alguém que vive o problema: entrevista, mensagem gravada, observação direta. sem isso, o resto é distante.'
      )
    ),
    'campos', jsonb_build_object(
      'pedido_a', jsonb_build_object(
        'label', 'evidência 1 · descreva em 1 ou 2 frases (método + onde + o que revela)',
        'placeholder', 'ex: entrevista de 3 min com a Dona Maria, dona da cantina, sobre o que sobra de comida por dia.'
      ),
      'print_a', jsonb_build_object(
        'label', 'prova da evidência 1 (foto, áudio, print ou link)'
      ),
      'pedido_b', jsonb_build_object(
        'label', 'evidência 2 · descreva em 1 ou 2 frases',
        'placeholder', 'ex: contei quantos copos descartáveis foram jogados fora no bebedouro entre 10h e 12h por 2 dias.'
      ),
      'print_b', jsonb_build_object(
        'label', 'prova da evidência 2 (foto, áudio, print ou link)'
      ),
      'pedido_c', jsonb_build_object(
        'label', 'evidência 3 · descreva em 1 ou 2 frases',
        'placeholder', 'ex: matéria do jornal local mostrando que 40% da comida do restaurante escolar é desperdiçada.'
      ),
      'print_c', jsonb_build_object(
        'label', 'prova da evidência 3 (foto, áudio, print ou link)'
      ),
      'veredicto', jsonb_build_object(
        'label', 'síntese · 1 parágrafo conectando as 3 evidências e o que elas dizem sobre o problema',
        'placeholder', 'as 3 evidências mostram que...'
      )
    ),
    'dica_md', 'se você tá com vergonha de abordar alguém, começa por quem já é próximo: familiar, vizinho, funcionário da escola. mensagem de áudio no whatsapp também conta como entrevista.',
    'completion', jsonb_build_object('label', 'entregar as 3 evidências')
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 4
  AND p.order_index = 4;

-- MÓDULO 4 · registro
UPDATE public.module_pills p
SET
  title = 'registro · o que as evidências mudaram',
  kind = 'registro',
  body_md = 'agora que você tem 3 evidências reais, olha pra elas com honestidade.',
  duration_min_low = 3,
  duration_min_high = 6,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'prompt', 'das 3 evidências, o que mais te surpreendeu? sua hipótese inicial se confirma, muda ou some? escreve 3 a 5 linhas.',
    'tutor_prompt', 'ajude o estudante a ver se as evidências confirmam ou refutam a hipótese inicial. reforce que refutação é ouro pedagógico, não fracasso.'
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 4
  AND p.order_index = 5;

-- MÓDULO 5 · pílula A (vídeo abertura)
UPDATE public.module_pills p
SET
  title = 'abertura · encruzilhada',
  kind = 'pilula_a',
  body_md = 'hoje é o dia da decisão. o problema que você fecha aqui vai ancorar as próximas 15 semanas. quem chega com problema vago sofre. quem chega com clareza voa. essa é sua última chance institucional de trocar de problema com legitimidade.',
  duration_min_low = 4,
  duration_min_high = 6,
  video_url = '/__l5e/assets-v1/cc15da3a-a1a9-4cad-ba5d-346549d246c3/dudu-modulo-05-abertura.mov',
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'video_with_transcript',
    'transcript_collapsible', true,
    'transcript', 'oi, bora fechar a trilha 1. essa aula é a encruzilhada. o problema que você definir aqui vai puxar todo o resto do trabalho, das próximas 15 semanas. quem chega vago vai sofrer, quem chega afiado vai voar. e essa é a última vez que trocar de problema é barato. pra decidir, você vai passar seu problema por 4 filtros: tem evidência (você provou na aula passada), te incomoda pessoalmente (você mapeou na aula 1), tem trade-off real (você viu quem ganha e quem perde na aula 3), e cabe num fluxo circular específico. os 6 fluxos são: materiais, alimentação, energia, água, mobilidade e tecnologia. escolhe 1 principal e, se quiser, 1 secundário. no final da aula você entrega um briefing de 1 página que fica sendo sua bússola. bora.',
    'completion', jsonb_build_object('label', 'assisti, bora decidir')
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 5
  AND p.order_index = 1;

-- MÓDULO 5 · pílula B (6 fluxos)
UPDATE public.module_pills p
SET
  title = 'os 6 fluxos de uma cidade circular',
  kind = 'pilula_b',
  body_md = 'uma cidade circular é um organismo. tem 6 sistemas principais entrando e saindo. seu problema precisa caber em pelo menos 1 pra ganhar musculatura de projeto.',
  duration_min_low = 6,
  duration_min_high = 8,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'emf-cities',
        'title', 'circular cities · Ellen MacArthur Foundation',
        'source', 'Ellen MacArthur Foundation',
        'url', 'https://www.ellenmacarthurfoundation.org/topics/cities/overview',
        'duration', '5 min de leitura',
        'language', 'inglês (dá pra usar tradutor)',
        'description', 'os 6 fluxos: materiais, alimentação, energia, água, mobilidade, tecnologia. exemplos reais de cidades.'
      ),
      jsonb_build_object(
        'id', 'fluxos-resumo',
        'title', 'resumo em português dos 6 fluxos',
        'source', 'material Naches',
        'url', 'https://ellenmacarthurfoundation.org/pt/topics/cities/overview',
        'duration', '3 min',
        'description', 'materiais (o que a cidade compra e descarta), alimentação (o que come e desperdiça), energia (o que consome), água (o que usa e devolve), mobilidade (como se move), tecnologia (o que digitaliza).'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q_seu_fluxo',
        'type', 'long_text',
        'label', 'olhando o problema que você tá investigando, em qual fluxo ele encaixa melhor? por quê?',
        'min_chars', 30
      ),
      jsonb_build_object(
        'id', 'q_fluxo_secundario',
        'type', 'long_text',
        'label', 'existe um segundo fluxo que tangencia seu problema? qual e como?',
        'min_chars', 20
      )
    )
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 5
  AND p.order_index = 2;

-- MÓDULO 5 · pílula C (HMW)
UPDATE public.module_pills p
SET
  title = 'how might we · a pergunta que abre o projeto',
  kind = 'pilula_c',
  body_md = 'um problema bem formulado começa com "como podemos...". específico o suficiente pra ser resolvido, amplo o suficiente pra ter várias saídas.',
  duration_min_low = 5,
  duration_min_high = 7,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'ideo-hmw',
        'title', 'how might we · IDEO',
        'source', 'IDEO.org',
        'url', 'https://www.designkit.org/methods/how-might-we',
        'duration', '4 min',
        'language', 'inglês (dá pra usar tradutor)',
        'description', 'o formato clássico. exemplos bem e mal formulados. dica: nem tão amplo (como salvar o planeta) nem tão fechado (como pintar a parede de azul).'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q_classifica',
        'type', 'single_choice',
        'label', 'qual dessas é uma how might we bem formulada?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'como podemos salvar o planeta?', 'value', 'muito_amplo'),
          jsonb_build_object('label', 'como podemos reduzir o desperdício de comida no refeitório da escola sem prejudicar a variedade do cardápio?', 'value', 'bem_formulada'),
          jsonb_build_object('label', 'como podemos pintar a parede da cantina de verde?', 'value', 'muito_fechado')
        )
      ),
      jsonb_build_object(
        'id', 'q_rascunho_hmw',
        'type', 'long_text',
        'label', 'escreve uma primeira versão da sua how might we (dá pra melhorar no exercício a seguir).',
        'min_chars', 40
      )
    )
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 5
  AND p.order_index = 3;

-- MÓDULO 5 · pílula PBL (briefing)
UPDATE public.module_pills p
SET
  title = 'exercício · briefing do projeto',
  kind = 'exercicio_pbl',
  body_md = 'o briefing é o documento que vai puxar todas as próximas aulas. 1 página, direto ao ponto. depois disso, mudar fica caro.',
  duration_min_low = 22,
  duration_min_high = 30,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'type', 'pbl_estruturado',
    'tutor_prompt', 'ajude o estudante a refinar o briefing. foque em 3 coisas: (1) a how might we tem que ser específica mas não fechada demais, (2) o fluxo escolhido tem que fazer sentido com as evidências, (3) a justificativa pessoal precisa ser sincera, não genérica.',
    'contexto_md', 'preencha o briefing com o problema definitivo. use os campos abaixo pra fechar: título curto, how might we, fluxo circular principal, síntese das evidências que você já coletou, quem ganha e quem perde, e por que esse problema te importa. seja específico. "como salvar o planeta" não é briefing.',
    'passos', jsonb_build_array(
      jsonb_build_object(
        'titulo', 'passa pelos 4 filtros',
        'descricao', '(1) tem evidência? (você provou no encontro 4) (2) te incomoda pessoalmente? (3) tem trade-off real, alguém ganha com o status quo? (4) cabe num fluxo circular específico?'
      ),
      jsonb_build_object(
        'titulo', 'escreve a how might we',
        'descricao', 'formato: "como podemos [ação] [pra quem] [em que contexto] sem [restrição realista]?". testa: dá pra imaginar 5 soluções diferentes? se der só 1, tá fechado demais. se der 100, tá amplo demais.'
      ),
      jsonb_build_object(
        'titulo', 'escolhe o fluxo',
        'descricao', '1 principal entre materiais, alimentação, energia, água, mobilidade, tecnologia. se puxar um segundo, ótimo, mas foca no primeiro.'
      )
    ),
    'campos', jsonb_build_object(
      'pedido_a', jsonb_build_object(
        'label', 'título do projeto (curto, memorável, dá pra explicar em 5 segundos)',
        'placeholder', 'ex: cantina zero desperdício.'
      ),
      'pedido_b', jsonb_build_object(
        'label', 'problema em formato how might we',
        'placeholder', 'ex: como podemos reduzir o desperdício de comida no refeitório da escola sem prejudicar a variedade do cardápio?'
      ),
      'melhor', jsonb_build_object(
        'label', 'fluxo principal',
        'options', jsonb_build_array('materiais', 'alimentação', 'energia', 'água', 'mobilidade', 'tecnologia')
      ),
      'por_que', jsonb_build_object(
        'label', 'síntese das 3 evidências (1 frase por evidência, puxa do encontro 4)',
        'placeholder', '1. entrevista com... revelou que... 2. observação em... mostrou que... 3. matéria/dado sobre... confirma que...'
      ),
      'aprendi', jsonb_build_object(
        'label', 'trade-off · quem ganha com o problema hoje (status quo) e quem perde',
        'placeholder', 'quem ganha hoje: ... quem perde hoje: ...'
      ),
      'veredicto', jsonb_build_object(
        'label', 'justificativa pessoal · por que ESSE problema pra você',
        'placeholder', 'me importa porque...'
      )
    ),
    'dica_md', 'quando terminar, releia como se fosse outra pessoa: uma pessoa que nunca viu esse problema entenderia em 2 minutos o que você vai fazer? se não, refina. esse briefing volta em toda aula.',
    'completion', jsonb_build_object('label', 'entregar meu briefing')
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 5
  AND p.order_index = 4;

-- MÓDULO 5 · registro
UPDATE public.module_pills p
SET
  title = 'registro · o que mudou em você',
  kind = 'registro',
  body_md = 'fim da trilha enxergar. antes de partir pra entender, olha pra trás.',
  duration_min_low = 3,
  duration_min_high = 6,
  video_url = NULL,
  attachment_url = NULL,
  required = true,
  published = true,
  interaction_schema = jsonb_build_object(
    'prompt', 'você trocou de problema depois das evidências? o que mudou na sua leitura do problema desde a aula 1? por que esse fluxo e não outro? escreve 3 a 5 linhas.',
    'tutor_prompt', 'ajude o estudante a fazer o balanço da trilha 1. valorize mudanças de rota (evidência mudou hipótese) como aprendizado, não falha. reforce que o briefing agora é a bússola.'
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
WHERE p.module_id = m.id
  AND t.course_id = 'c0a00000-0000-0000-0000-000000000002'
  AND m.number = 5
  AND p.order_index = 5;
