
# adaptar hub → eletiva "ia na prática" (sebrae)

## princípio
o hub atual é infraestrutura de aprendizagem completa disfarçada de evento. quase tudo se reaproveita renomeando, reposicionando ou escondendo atrás de feature flag. nada é destruído antes da hora.

## decisões consolidadas

| área | decisão |
|---|---|
| identidade | rebrand sebrae (azul #005EB8 + tokens), descarta League Gothic + lágrima |
| extras sociais | escondidos atrás de flag `eletiva_extras_enabled` (mural, votação, álbum, carta futuro) |
| chora-bot | vira **tutor ia** com mascote **joão-de-barro** |
| prework | vira "prepare seu ambiente", pré-requisito da aula 1 |
| certificado | escondido atrás de flag, reativado no fim |
| diagnóstico de builder | mantido e repaginado com **6 animais brasileiros**, gera **no primeiro acesso** |
| conteúdo aula 1 | rascunho a partir da proposta sebrae |
| vídeos das pílulas | opcional, embed youtube/vimeo |

## arquitetura de aproveitamento

### infra mantida intacta
auth + magic link, profiles, user_roles, has_role, ProtectedRoute, AdminRoute, Pending, HubLayout, MobileNav, PageShell, PageHeader, infra completa de email (queue, send, unsubscribe), OnboardingDialog (copy adaptada).

### reposicionadas (renomeação + ajuste)

| atual | vira |
|---|---|
| `prework_*` + `Prework.tsx` | "prepare seu ambiente" pré-aula 1 |
| `missions` + `mission_submissions` + `Missions.tsx` | entregáveis dos módulos |
| `Tutorial.tsx` (estrutura) | base da página `/aula/:n` |
| `hub_materials` + `HubMateriais.tsx` | biblioteca de apoio da eletiva |
| `hub_event_feedback_final` | avaliação final da eletiva |
| `hub_event_feedback` (3 perguntas) | check-in semanal por módulo |
| `chora-bot` + `chora_bot_chunks` + RAG | tutor ia (joão-de-barro) |
| `analyze-feedback-*` + `analyze-turma` | análise ia das respostas/turma |
| `useDashboardData` + `NextActionHero` + `JourneyChips` + `ArchiveSection` | dashboard novo da eletiva |

### diagnóstico de builder repaginado (no primeiro acesso)

**mantém:** estrutura de questionário (`fbi_responses`), motor de geração ia (`generate-builder-card`), tabela `builder_cards`, share token, og image, dialog de download, sistema `BuilderArtworks` completo (geração procedural com seed/variables/preset, histórico, rollback).

**muda:**
- **questionário curto** (~8-10 perguntas): nome, idade, escola/série, o que te faz perder noção do tempo, última coisa que criou com orgulho, ideia parada, jeito de aprender, expectativa pra eletiva. reusa `fbi_responses` (campos extras viram null)
- **6 arquétipos viram 6 animais brasileiros**:
  | arquétipo | animal |
  |---|---|
  | visionário | **gavião** — enxerga longe, mapeia o terreno antes de descer |
  | artesão | **aranha** 🕷️ — tece, paciência, geometria perfeita |
  | experimentador | **macaco-prego** — testa, quebra, descobre, repete |
  | conector | **abelha** — costura comunidade, faz o coletivo florescer |
  | pragmático | **tatu** — escava, resolve a dor real, raiz |
  | narrador | **bem-te-vi** — conta a história alto e bom som |
- **artes regeradas do zero** via `generate-archetype-artwork` (infra mantida): novo `CORE_TEMPLATE` no edge function, novos `ARCHETYPE_MOTIFS` por animal, paleta sebrae, mood escolar/jovem/brasileiro
- **carta de arquétipo** reescrita: tom escolar acessível, exemplos de rotina adolescente, ~80 palavras, 1 emoji
- **timing**: gera no **primeiro acesso**, antes de qualquer outra coisa. é o welcome.
- **aluno vê a própria carta** desde o primeiro segundo (cria identidade)
- **mascote do tutor ≠ animais do arquétipo**: tutor é joão-de-barro (ave construtora), arquétipos são os 6 acima. dois símbolos pra dois propósitos

### features sociais escondidas (flag `eletiva_extras_enabled` default false)
ficam vivas no código e banco. admin liga quando quiser. cada uma tem condição clara:
- `hub_projects` + `HubProjetos.tsx`: ativar quando turma começar a publicar (~aula 8+)
- `project_voting_sessions` + ranking: encerramento
- `hub_album_photos` + `HubAlbum.tsx`: se houver encontro presencial
- `future_letter_*` + `FutureLetter.tsx`: último módulo
- `mascote_votes`: dinâmica opcional

implementação: 1 chave em `hub_settings` (`eletiva_extras_enabled` = "true"/"false"). hook `useEletivaExtras()`. rotas e itens de menu condicionais. zero migration destrutiva.

### realmente removido do código
só o irreversivelmente específico ao evento:
- `Countdown` 25/04 (componente fica, não renderiza)
- form fbi original de 19 perguntas + edge functions `submit-public-fbi`, `validate-public-email`, `import-perestroika-spreadsheet`
- edge functions descartadas: `select-mascote`, `mascote-voting`, `critique-certificate`, `giphy-search`
- componentes brand perestroika: `BalaoSerrado`, `LagrimaGradient`, `EstrelaPerestroika`, `CaixaPrompt`, `ChoraLogo`, `PeresLogo`

## o que precisa ser construído

### 1. modelo de aula (✅ já migrado)
`trails`, `modules`, `module_pills`, `student_pill_progress`, `student_module_progress`, `module_deliverables`, `module_ratings`. zero trabalho.

### 2. página de aula `/aula/:n`
reaproveita estrutura visual de `Tutorial.tsx`. renderiza dinâmico:
- header: número, trilha, objetivo, tempo total
- timeline vertical das pílulas (3 conteúdo + exercício pbl + registro)
- pílula expansível: título, duração, body markdown, vídeo opcional youtube/vimeo, "marcar como visto"
- exercício pbl: bloco destacado
- registro: form de entregável (link + texto + opcional upload), reaproveita `ProjectFormModal`
- ao concluir: card "aula completa" + cta próximo módulo

### 3. dashboard novo
reaproveita `AppDashboard` + `NextActionHero` + `JourneyChips` + `ArchiveSection`. troca `usePostEventStatus` → `useEletivaProgress`. hero: próximo módulo + cta. chips: módulos feitos / próxima liberação / projeto final / **meu animal builder** (sempre visível depois do primeiro acesso). archive: trilha completa 20 módulos.

### 4. fluxo de primeiro acesso
gate antes do dashboard:
1. login → checa se tem `builder_card`
2. se não tem → `/diagnostico` (questionário curto, ~3 min)
3. submeteu → `generate-builder-card` roda → tela de revelação animada (animal + carta + arte)
4. checa se completou prework obrigatório
5. se não → `/preparar-ambiente`
6. concluiu → dashboard com aula 1 liberada

componente `OnboardingGate` envolve `ProtectedRoute`.

### 5. admin da eletiva
abas dentro do admin existente:
- **módulos**: criar/editar trilhas + módulos + pílulas, setar `available_from`, publicar
- **alunos**: reaproveita `AdminUsers` + uploader csv pra `invited_participants`
- **entregáveis**: reaproveita `AdminMissions` adaptado pra `module_deliverables`
- **avaliações**: agrega `module_ratings`
- **flags**: toggle `eletiva_extras_enabled`, certificado, diagnóstico
- **arquétipos**: reaproveita `AdminArtworks` + `AdminCards` (regerar artes dos animais, ver cartas)

### 6. tutor ia (joão-de-barro)
- novo asset: avatar joão-de-barro estilizado (gera via nano banana, paleta sebrae)
- update `chora_bot_settings`: novo system prompt ("tutor de eletiva ia pra alunos 14-15, tom acessível, perguntas socráticas, nunca dá resposta pronta de exercício"), novo welcome, novo nome
- ingestão de `module_pills.body_md` como contexto rag (job admin)
- rename componentes: `ChoraBotFab` → `TutorFab`, `ChoraBot.tsx` → `Tutor.tsx`. tabelas `chora_bot_*` ficam (renomear quebra muito sem ganho)

### 7. diagnóstico repaginado
- form curto reusando `fbi_responses` + `usePublicFbiForm`
- página `/diagnostico` (gate de primeiro acesso)
- update edge `generate-archetype-artwork` com novo `CORE_TEMPLATE` + 6 motifs animais
- regerar 6 artes (1 por animal) via admin
- update `generate-builder-card` system prompt: tom escolar, animais ao invés de objetos abstratos
- tela de revelação: animação de carta virando, arte aparecendo, nome do animal + tagline + texto

### 8. rebrand sebrae
- substituir tokens em `index.css` e `tailwind.config.ts` (azul sebrae #005EB8, secundárias)
- trocar fontes: League Gothic → fonte display sebrae (referência pública), Urbanist → mantém ou troca por sans sebrae
- novo logo da eletiva (placeholder até definição)
- pesquisar identidade pública sebrae (cores, tipografia, tom) via web

## ordem de execução

1. **rebrand sebrae** (paleta + fontes + tokens + copy global) — base
2. **flag `eletiva_extras_enabled`** + esconder rotas/menus de extras
3. **renomear features ativas na ui** (missões → entregas, prework → preparação)
4. **construir página `/aula/:n`** (reaproveita Tutorial)
5. **dashboard novo** (reaproveita arquitetura)
6. **diagnóstico repaginado**: questionário + edge function + 6 motifs animais + regerar artes + reescrever cartas + tela de revelação
7. **`OnboardingGate`** orquestrando primeiro acesso
8. **admin: aba módulos** + seed do módulo 1 (rascunho a partir da proposta)
9. **admin: import csv da turma** + smoke test fim a fim
10. **tutor joão-de-barro**: avatar + system prompt + rename componentes
11. **descartar arquivos órfãos** confirmados (passo final, reversível)

cada bloco vai ter implementação + revisão antes do próximo.

## detalhes técnicos

- carga: ~30 arquivos editados, ~10 deletados, 7 artes regeneradas (6 animais + 1 mascote tutor)
- tabelas antigas no banco: mantidas. zero migration destrutiva.
- edge functions descartadas: deletadas via `supabase--delete_edge_functions` no passo 11
- memory atualizada: novo `mem://index.md` (sebrae + sem perestroika), `mem://design/sebrae-tokens.md`, `mem://features/diagnostico-builder.md` com mapa animais
- rollback: features escondidas voltam com toggle, arquivos deletados voltam com git, artes antigas ficam em `archetype_artwork_versions` arquivadas
