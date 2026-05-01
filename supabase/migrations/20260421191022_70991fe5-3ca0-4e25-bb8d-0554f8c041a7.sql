-- Atualiza prework_items existentes pela ordem
UPDATE public.prework_items SET
  titulo = 'boas-vindas à imersão',
  descricao = 'primeira parada. dá uma olhada no guia do frattz pra entender o universo que tu vai construir. tem dezenas de projetos reais, cases e referências. volta aqui depois.',
  url = 'https://lovableguide2.lovable.app',
  tipo = 'leitura',
  duracao_min = 3,
  obrigatorio = true,
  published = true,
  updated_at = now()
WHERE ordem = 1;

UPDATE public.prework_items SET
  titulo = 'o universo do lovable',
  descricao = '77 projetos prontos pra construir, organizados por complexidade e integrações. serve como fonte de ideias e mostra o que dá pra fazer. dedica 10 min explorando o catálogo.',
  url = 'https://compiladao.lovable.app',
  tipo = 'leitura',
  duracao_min = 10,
  obrigatorio = true,
  published = true,
  updated_at = now()
WHERE ordem = 2;

UPDATE public.prework_items SET
  titulo = 'a arte do prompt',
  descricao = 'quando tu fala com o lovable, o que tu fala importa. é o guia oficial de prompting. curto e muda o jogo.',
  url = 'https://docs.lovable.dev/tips-tricks/prompting',
  tipo = 'leitura',
  duracao_min = 8,
  obrigatorio = true,
  published = true,
  updated_at = now()
WHERE ordem = 3;

UPDATE public.prework_items SET
  titulo = 'seu primeiro app (o tutorial)',
  descricao = 'hora de botar a mão na massa. 5 etapas personalizadas com teu fbi pra criar teu primeiro app publicado no lovable.',
  url = '/app/tutorial',
  tipo = 'exercicio',
  duracao_min = 45,
  obrigatorio = true,
  published = true,
  updated_at = now()
WHERE ordem = 4;

UPDATE public.prework_items SET
  titulo = 'quando reverter (e por quê)',
  descricao = 'habilidade mais importante pra não desesperar no sábado: voltar pra uma versão anterior quando algo dá ruim. não-negociável.',
  url = 'https://docs.lovable.dev/features/version-history',
  tipo = 'leitura',
  duracao_min = 5,
  obrigatorio = false,
  published = true,
  updated_at = now()
WHERE ordem = 5;

UPDATE public.prework_items SET
  titulo = 'mostre teu prompt no grupo',
  descricao = 'posta no grupo do whatsapp da turma um prompt que tu testou no lovable. pode ser bom, ruim, qualquer coisa. importante é aparecer.',
  url = 'https://chat.whatsapp.com/REPLACE_ME',
  tipo = 'exercicio',
  duracao_min = 5,
  obrigatorio = true,
  published = true,
  updated_at = now()
WHERE ordem = 6;

-- Atualiza missions existentes pela ordem
UPDATE public.missions SET
  titulo = 'teu primeiro manifesto',
  descricao = 'essa é a missão que o tutorial resolve. faz as 5 etapas do tutorial e publica teu primeiro app. depois cola o link aqui.',
  instrucao = 'cola o link do teu app publicado (ex: meuapp.lovable.app). em 2-3 frases, conta o que tu construiu e o que aprendeu fazendo.',
  duracao_min = 30,
  published = true,
  updated_at = now()
WHERE ordem = 1;

UPDATE public.missions SET
  titulo = 'teu prompt favorito',
  descricao = 'encontra o prompt que, pra ti, explodiu a cabeça, no tutorial, no guide do frattz, em docs, onde for. cola aqui.',
  instrucao = 'cola o prompt literal (pode ser em texto ou link). em 1-2 frases, conta por que esse te marcou.',
  duracao_min = 10,
  published = true,
  updated_at = now()
WHERE ordem = 2;

UPDATE public.missions SET
  titulo = 'app que tu admira',
  descricao = 'procura 1 app (pode ser do guide do frattz, do compiladão, ou outro qualquer) que tu queria construir algo parecido. manda o link.',
  instrucao = 'cola o link. em 2-3 frases, conta o que te chamou atenção e o que tu gostaria de replicar/adaptar.',
  duracao_min = 10,
  published = true,
  updated_at = now()
WHERE ordem = 3;

UPDATE public.missions SET
  titulo = 'ideia pra o sábado',
  descricao = 'sábado tu vai construir algo. pode ser o mesmo do tutorial melhorado, pode ser novo. define aqui.',
  instrucao = 'cola um link (google doc, notion, ou texto público) com (1) qual é a ideia, (2) por que escolheu ela, (3) o que vai sair com pronto no final do sábado.',
  duracao_min = 10,
  published = true,
  updated_at = now()
WHERE ordem = 4;

UPDATE public.missions SET
  titulo = 'compromisso público',
  descricao = 'escreve publicamente (linkedin, twitter, instagram) o que tu vai criar no chora. fazer público é o melhor combustível.',
  instrucao = 'cola o link do post. em 1 frase, conta a reação que tu espera.',
  duracao_min = 5,
  published = true,
  updated_at = now()
WHERE ordem = 5;