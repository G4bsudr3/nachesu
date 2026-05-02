
# próximos passos da eletiva sebrae

quatro etapas pra fechar o loop do aluno (ler pílula → marcar progresso → ver mapa da jornada → desbloquear próximo módulo → conversar com tutor IA da trilha). cada etapa é independente e entregável sozinha, então dá pra parar entre elas e validar.

estado atual: página `/app/modulo/:number` lista pílulas publicadas e marca o módulo como concluído num clique só. tabela `student_pill_progress` existe no banco mas ninguém escreve nela. não tem rota `/app/trilhas`. desbloqueio entre módulos hoje depende só de `available_from` (data manual no admin).

---

## etapa 1 — progresso por pílula (granularidade real)

**por quê:** hoje o aluno só vê o switch "concluí o módulo inteiro". com 5 pílulas por módulo dá pra ele ver onde parou, retomar de onde estava e ter sensação de avanço a cada pílula.

**o que muda:**
- hook `useEletivaProgress` passa a buscar também `student_pill_progress` e devolve `pillProgressByPillId`.
- `Modulo.tsx`: cada `<article>` de pílula ganha checkbox "concluí" no rodapé (estilo perestroika, círculo bege com check preto). estado otimista, `upsert` na tabela.
- barra de progresso dentro do hero do módulo: "3 de 5 pílulas". substitui o estado atual "concluído / em andamento".
- conclusão automática do módulo quando todas as pílulas obrigatórias (`required = true`) estão marcadas. o botão grande "marcar como concluído" sai e vira badge automático "esse módulo já é seu".
- `EletivaCard` no dashboard puxa essa contagem fina pra mostrar "você parou na pílula 3 de 5".

**signature moment:** ao marcar a última pílula obrigatória, lágrima Perestroika com gradient cresce do checkbox e dispara `toast` + scroll suave pra navegação do próximo módulo. respeitando `prefers-reduced-motion`.

**arquivos:** `src/hooks/useEletivaProgress.ts`, `src/pages/Modulo.tsx`, `src/components/dashboard/EletivaCard.tsx`. zero migration (tabela já existe com RLS correta).

---

## etapa 2 — página `/app/trilhas` (mapa fractal 4×5×5)

**por quê:** hoje o aluno só vê o módulo atual. falta o mapa da jornada inteira pra ele entender onde está nas 4 trilhas e o que vem.

**o que ganha:**
- nova rota `/app/trilhas` (lazy) com `<TrilhasMap />`.
- 4 colunas em desktop, accordion em mobile (uma trilha por vez aberta).
- cada trilha mostra os 5 módulos como pills numerados (01-05). estados visuais: concluído (preto sólido), atual (borda + cor da trilha pulsando), disponível (borda preta), bloqueado (opacidade 40%, cadeado), próximo a desbloquear (texto "abre dia X").
- header da trilha: cor própria (laranja/vermelho/rosa/azul Perestroika), título em League Gothic, descrição curta, contador "2/5 módulos seus".
- click no módulo navega pra `/app/modulo/:number` ou mostra tooltip "ainda não liberado".
- entrada nova no `MobileNav` ("trilhas") e link no `EletivaCard` ("ver mapa completo").

**signature moment:** ao abrir, animação stagger das 4 trilhas entrando da esquerda com framer-motion (50ms cada), pílulas dos módulos aparecem em cascata. ao hover/tap num módulo concluído, micro-zoom + lágrima.

**arquivos novos:** `src/pages/Trilhas.tsx`, `src/components/eletiva/TrilhaColumn.tsx`, `src/components/eletiva/ModulePill.tsx`. rota em `App.tsx`. link em `MobileNav.tsx`.

---

## etapa 3 — desbloqueio sequencial entre módulos

**por quê:** hoje qualquer módulo publicado fica disponível. faz sentido pedagogicamente que módulo N só abra quando N-1 estiver concluído (mesmo já estando publicado e dentro do `available_from`).

**o que muda:**
- nova função `is_module_unlocked(_user_id, _module_id)` no banco (SECURITY DEFINER) que retorna true se: módulo é o `number = 1`, OU módulo anterior tem `completed_at` pra esse user, OU user é admin.
- `useEletivaProgress` calcula `unlockedModuleIds` no client usando o snapshot de `progressByModuleId` (mesma lógica, sem precisar de RPC por módulo).
- `Modulo.tsx`: se entrar num módulo bloqueado → tela "esse módulo abre quando você fechar o módulo anterior" + link pro anterior. **não** muda RLS (admin precisa preview, e bloqueio de leitura quebraria).
- `TrilhasMap` e `EletivaCard` usam `unlockedModuleIds` pra renderizar cadeado.
- toggle no `AdminEletivaSettings` ("modo livre: alunos veem todos os módulos publicados sem precisar concluir o anterior") guardando em `hub_settings` chave `eletiva_sequential_unlock`. default `true`.

**signature moment:** quando aluno fecha o módulo N, dispara `toast` "módulo N+1 desbloqueado" com lágrima e CTA direto pro próximo. já encadeia com a etapa 1.

**arquivos:** migration nova (função + entrada em `hub_settings`), `src/hooks/useEletivaProgress.ts`, `src/pages/Modulo.tsx`, `src/features/admin/AdminEletivaSettings.tsx`.

---

## etapa 4 — tutor IA por trilha (PBL conversacional)

**por quê:** uma das 5 pílulas de cada módulo é `exercicio_pbl`. o tutor IA "joão-de-barro" deveria conversar com o aluno sobre o problema da trilha, com contexto da trilha + módulos já concluídos.

**o que ganha:**
- edge function `tutor-trail-chat` (baseada em `chora-bot-chat` mas mais simples, sem RAG embeddings — usa só system prompt curto + contexto da trilha).
- system prompt com: persona joão-de-barro (lowercase, você, tom frattz adaptado pra escola), nome da trilha, objetivo da trilha, módulos que o aluno já fez, módulo atual, pergunta-problema da trilha.
- nova coluna `pbl_prompt` em `trails` (text, opcional) — admin escreve o problema central que o tutor vai puxar.
- componente `<TutorChat trailId={...} />` reutilizando o visual do `ChoraBot` existente (BotCard, UserMessage, BotMessage). botão "conversar com tutor" aparece nas pílulas do tipo `exercicio_pbl` no `Modulo.tsx`.
- abre como `<Sheet>` (drawer lateral em desktop, fullscreen em mobile) sem sair da página.
- usa `lovable-ai` gateway com `google/gemini-2.5-flash` (default rápido).
- mensagens persistidas em tabela nova `tutor_conversations` (user_id, trail_id, messages jsonb, updated_at) com RLS "user vê próprias".

**signature moment:** ao abrir o sheet, mascote da trilha (já existe asset por arquétipo) faz uma entrada por baixo com bounce, balão serrado com a primeira pergunta do tutor. enquanto o tutor "pensa", lágrima pulsando em vez de spinner genérico.

**arquivos:** migration (coluna `pbl_prompt`, tabela `tutor_conversations`), `supabase/functions/tutor-trail-chat/index.ts`, `src/components/eletiva/TutorChat.tsx`, ajuste no `Modulo.tsx` e em `AdminTrilha` pra editar o `pbl_prompt` da trilha.

---

## ordem recomendada

1, 2, 3 fecham o loop sozinho do aluno — você pode parar aí e popular conteúdo real antes de ligar a IA. 4 é o salto qualitativo que transforma a eletiva num produto único, mas custa edge function + tokens, então vale só depois que o resto estiver validado em sala.

dá pra eu começar pela **etapa 1** assim que aprovar?
