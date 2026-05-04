## o que dá pra reaproveitar

o pré-work do Chŏra Hub já é, na prática, uma "aula 0 sobre o lovable e ia". o conteúdo está em três lugares no projeto vizinho:

1. **`src/components/prework/WhatIsLovable.tsx`** - card explicativo com: como funciona em 3 passos (descreve > ia constrói > app pronto), 4 features do lovable (vibe coding, cloud, ai gateway, integrações), onde brilha vs onde ainda não é ideal, números da startup. é texto pronto, na voz frattz, em pt-br.
2. **`src/features/prework/preworkContent.ts`** - 3 itens "o que é o lovable", "anatomia da tela", "vídeo começa por aqui (10 min)" + camada técnica (changelog, cloud, ai gateway, integrações). cada item tem título, descrição, url, duração, todos com tom frattz.
3. **`src/components/prework/OfficialChannels.tsx`** - canais oficiais do lovable (provavelmente youtube/docs/discord).

isso casa exatamente com o módulo **"boas-vindas: por que ia agora"** (id `47d80af7-...`), trilha **Fundamentos & IA** da eletiva *IA na Prática*, que hoje tem 5 pílulas placeholder genéricas ("o que mudou", "o que tu vai entregar", "como vamos andar", apresentação, registro).

## o que muda na curadoria

a aula 0 vira o "degrau zero" antes de mergulhar nas 5 trilhas. troco as 5 pílulas atuais do módulo por um conjunto adaptado pro contexto adolescente do NachesU (não pré-work de imersão paga, mas primeiro contato escolar com ia + lovable):

```text
módulo: boas-vindas: por que ia agora (aula 0)

01 · pílula a · "o que tá rolando" (3 min, leitura)
   adaptação do bloco hero do WhatIsLovable. ia generativa em 2026,
   por que agora, o que muda na sua vida de estudante.

02 · pílula b · "o que é o lovable" (3 min, leitura)
   reescrita do "extra:o-que-e-lovable" + 3 passos
   (descreve > ia constrói > app pronto).

03 · pílula c · "vê funcionando" (10 min, vídeo)
   embed do vídeo "começa por aqui" (https://youtu.be/4NpUPggv3oU)
   já presente no extra:video-comeca-aqui. body com microcopy
   contextual: o que prestar atenção enquanto assiste.

04 · exercício pbl · "primeira conversa com a máquina" (15 min)
   exercício novo: aluno escreve um prompt curto descrevendo
   uma ideia de app que melhoraria a escola dele. tutor ia
   responde com feedback no formato "o que tá claro / o que
   falta / como deixar mais específico". reaproveita
   infra do tutor já existente.

05 · registro · "o que ficou" (5 min)
   pergunta única: depois dessa aula 0, qual a primeira
   coisa que você quer testar criar no lovable?
```

o conteúdo do `WhatIsLovable` (features, onde brilha, números) vira o **body markdown** das pílulas a/b, não componente custom; mantém o padrão do `module_pills.body_md` que já é renderizado pelo `ModuloPillList`.

## adaptações necessárias de tom

o pré-work original fala "tu" e assume público de imersão paga (28-45 anos, profissional). o NachesU usa "você" e fala com adolescente de ensino médio. então:

- substituir todas as referências a "imersão", "2 dias", "perestroika" por linguagem escolar.
- cortar a parte de "$400M arr / valuation" - irrelevante e desfocada pra adolescente.
- trocar exemplos ("ferramentas internas", "mvps validados") por exemplos que o aluno entende ("um app pra organizar a turma", "um quiz pra estudar").
- manter a estrutura "como funciona em 3 passos" e "onde brilha / onde não é ideal" - é didático e direto.

## o que fica de fora dessa primeira leva

- a camada técnica avançada (changelog 2026, edge functions, integrações nativas) **não** entra na aula 0 do ensino médio. fica reservada como possível pílula opcional num módulo posterior da trilha "Construção no Lovable".
- o sistema de `BuilderLevel` (novato/iniciante/intermediário/avançado) não é portado agora - todos os alunos começam no mesmo nível, é uma turma escolar única.

## execução

1. escrever o `body_md` das 5 pílulas adaptadas (texto pronto no plano antes de aplicar).
2. atualizar via `supabase--insert` as 5 linhas existentes em `module_pills` do módulo `47d80af7-2ab5-45eb-8342-450d9d4b2ec4` (preserva ids, atualiza title, body_md, video_url, duration_min_low/high).
3. adicionar `video_url` da pílula c apontando pro youtube.
4. adicionar `interaction_schema` no exercício pbl pra puxar o tutor com prompt-base certo.
5. atualizar `mem://project/eletiva-estrutura.md` registrando que o módulo "boas-vindas" virou aula 0 com curadoria do pré-work chŏra.

## escopo declarado

só altera o módulo "boas-vindas: por que ia agora" da trilha Fundamentos & IA do curso *IA na Prática*. não toca nos outros 39 módulos, no curso de Economia Circular, nem traz código novo do projeto Chŏra (só o conteúdo textual reescrito).
