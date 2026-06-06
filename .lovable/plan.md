
# revisão crítica · nachesU

dois subagentes vasculharam a experiência de estudante (`src/pages/Modulo.tsx`, `src/components/eletiva/...`) e de professor (`src/features/admin/...`). síntese dos achados acionáveis abaixo, agrupados por impacto. detalhe técnico no fim.

## achados principais

### bloqueadores reais do produto
1. **professor não consegue ler 3 tipos de pílula.** `deliverableRendering/resolvers.ts:428` só cobre 7 `schemaType`. as pílulas `PillClassificador3x3` (a aula 2 que acabamos de montar), `PillPBLCorfTriplo` e `PillGuiaDePrompts` não têm resolver — caem em `state: "passiva"` e o `DeliverableAnswersList` filtra. ou seja, qualquer entrega da aula 2 hoje já chega no admin como tela vazia.
2. **entrega vira "enviado" sem o aluno mandar.** `Modulo.tsx:263-274`, no `togglePillMutation.onSuccess`, fecha o módulo e chama `submitDeliverableIfExists()` assim que a última obrigatória é marcada. quem só leu e marcou "concluí" tem o rascunho promovido pra `enviado`. educador recebe entrega incompleta.
3. **`useDeliverable` cria deliverable em branco no mount.** `pills/useDeliverable.ts:47`. abrir o módulo já cria rascunho — fila do admin enche de ruído.

### sérios mas não bloqueadores
4. botões de aprovar/pedir ajuste do `FeedbackReviewDrawer.tsx:95` não desabilitam quando feedback < 5 chars; erro só aparece via toast depois do clique.
5. `usePendingDeliverables.ts:36` sem `.limit()` e sem `staleTime` — vai engasgar com 200 estudantes.
6. `confirm()` nativo em `FeedbackReviewDrawer.tsx:187` e `AdminRubrics.tsx:122`.
7. sem pontuação numérica/rubrica com peso (`useRubrics.ts:4`). hoje só verdict binário + texto.
8. `SaveIndicator` em erro não dispara toast nem retry — estudante fecha aba achando que salvou.
9. `ModuloLockedHero` perde `MobileNav` + footer (`Modulo.tsx:324`).
10. `EletivaHome` não considera `snapLoading` na guarda → flash de "0/0 módulos".
11. touch targets <44px em `ModuloPillList.tsx:557`.
12. `DeliverableStatusPill.tsx:99` referencia "card laranja" mesmo quando trilha é azul/rosa.

### polimento
- numeração de pílulas no drawer usa `idx` em vez de `order` (`DeliverableAnswersList.tsx:55`).
- sem busca por nome de estudante no `AdminFeedbackInbox`.
- drawer estreito demais (`sm:max-w-xl`).
- `ModuloFeedbackCard` não tem fallback quando educador pediu ajuste sem texto.
- `ModuloHeader` mostra "50 min" hardcoded como fallback.
- hint "shift+enter" do `TutorChat` aparece em mobile.

---

# plano de ação · 5 etapas

cada etapa é um deploy fechado. ordem pensada pra zerar primeiro o que está corrompendo dados, depois o que melhora avaliação, e por último o polimento.

## etapa 1 — desencravar a avaliação (dados que já existem)

**objetivo:** o professor consegue ler tudo que o aluno entregou na aula 2 (e qualquer pílula nova daqui pra frente).

- adicionar 3 resolvers em `src/features/admin/deliverableRendering/resolvers.ts`:
  - `resolveClassificador3x3` — lê `content.classificador[pillId]` e o schema, lista cada um dos 13 itens classificados como `linear|circular|regenerativo` + justificativas.
  - `resolvePBLCorfTriplo` — lê `content.pbl_corf[pillId]`.
  - `resolveGuiaDePrompts` — lê o blob de prompts salvo pela pílula.
- estender `PillSchemaType` em `deliverableRendering/types.ts` com os 3 novos valores.
- mapear no `switch` (`resolvers.ts:428`).
- **fallback defensivo:** em `DeliverableAnswersList.tsx:42`, parar de esconder `state: "passiva"` quando `content[anyKey]` daquela pílula tem dados; mostrar bloco "tipo de pílula sem visualizador" com dump json colapsável, pra qualquer pílula futura não desaparecer silenciosamente.
- corrigir `index` → `answer.order` em `DeliverableAnswersList.tsx:55`.

## etapa 2 — parar de corromper entregas

**objetivo:** rascunhos só viram "enviado" quando o estudante manda; deliverable só nasce quando o aluno escreve.

- `Modulo.tsx:253-282` — no `togglePillMutation.onSuccess`, remover `submitDeliverableIfExists()`. autocompletar só fecha o módulo (`completed_at`) e mostra o burst. submit segue manual via `completeMutation`.
- mover a regra "se módulo precisa de deliverable, exige `enviado` antes de fechar" pro `completeMutation`, com toast claro.
- `pills/useDeliverable.ts:47` — separar `loadDeliverable` (só select) de `ensureDeliverable` (insert). pílulas chamam `ensure` no primeiro `onChange`/`save`, não no mount.
- limpeza de dados ruins: migration one-shot que remove deliverables `rascunho` com `content = '{}'` e sem `updated_at` recente.

## etapa 3 — avaliação útil pro professor

**objetivo:** professor pontua, sabe o que falta avaliar, e a UI não atrapalha.

- `FeedbackReviewDrawer.tsx`:
  - desabilitar "aprovar"/"pedir ajuste" enquanto `feedback.trim().length < 5`, com helper text inline.
  - separar `approveMutation` e `requestChangesMutation` pra não compartilhar `isPending`.
  - largura `sm:max-w-2xl lg:max-w-3xl`; em `lg+`, layout 2 colunas (respostas | feedback) com `sticky` no painel direito.
  - substituir `confirm()` por `AlertDialog`.
  - abrir `<details>` do histórico por padrão quando `history.length > 0`; badge com contagem no header.
- pontuação numérica:
  - adicionar coluna `score numeric(4,2)` em `deliverable_reviews` + `score_max smallint default 10` na rubrica (migration).
  - input numérico no drawer, opcional (gate por `rubric.score_type`).
- `AdminFeedbackInbox.tsx`:
  - campo de busca por nome/email (filtro em memória).
  - remover `onClick` do `<TableRow>`; deixar só botão "revisar" e link do nome.
  - `usePendingDeliverables.ts` — `.limit(200)` + `staleTime: 30_000`.

## etapa 4 — confiança do aluno

**objetivo:** estudante percebe quando salva, vê o que precisa fazer, navega bem em mobile.

- `SaveIndicator.tsx:24` — no estado `error`, disparar `toast.error` via sonner e mostrar botão "tentar de novo" inline.
- `Modulo.tsx:324` — envolver branch de `!isUnlocked` no mesmo shell (`MobileNav`, `EletivaFooter`, `bg-perestroika-bege` etc.) que o branch desbloqueado.
- `EletivaHome.tsx:158` — incluir `snapLoading` na guarda ou renderizar `EletivaProgressSkeleton` enquanto carrega.
- `ModuloPillList.tsx:557` — `min-h-[44px]` nos botões "marcar"/"concluir".
- `ModuloFeedbackCard.tsx:146` — fallback "o educador vai detalhar em breve" quando `status === "ajuste"` && `!feedback`.
- `DeliverableStatusPill.tsx:99` — trocar "card laranja" por "card de feedback acima".

## etapa 5 — polimento e voz

**objetivo:** alinhar microcopy, métricas honestas, pequenas correções de a11y.

- `ModuloHeader.tsx:58` — `{totalMinutes ? \`${totalMinutes} min\` : "tempo variável"}`.
- `ModuloProgressBar.tsx` — `if (!visible) return null` ao invés de `aria-hidden` no wrapper.
- `Modulo.tsx:338` — usar `requiredPills.length` na barra (opcionais não inflam o total).
- `TutorChat.tsx:636` — `hidden sm:block` no hint de teclado.
- `TutorChat.tsx:580` — chips sempre visíveis quando não streaming.
- `ModuloFooter.tsx:49` — alinhar copy com a voz nachesU.
- `AdminFeedbackInbox.tsx:29` — `useTimeAgo` com refresh de 60s ou `formatDistanceToNow` reativo.
- `useRubricForModule` — exibir nome da rubrica ativa no header do drawer + aviso quando caiu no `is_default`.

---

## fora de escopo (anotar, não fazer agora)

- redesenho completo do `AdminFeedbackInbox` em layout kanban por módulo.
- sistema de comentários inline em uploads de imagem.
- exportação CSV de notas pra fechamento de bimestre — provável próxima conversa.

## detalhe técnico

- migrations necessárias (etapas 2 e 3):
  - `delete from module_deliverables where status='rascunho' and content::text='{}' and coalesce(updated_at, created_at) < now() - interval '7 days';`
  - `alter table deliverable_reviews add column if not exists score numeric(4,2);`
  - `alter table rubrics add column if not exists score_max smallint default 10, add column if not exists score_type text default 'none' check (score_type in ('none','numeric','letter'));`
  - grants já existentes cobrem as colunas novas; RLS atual não precisa mudar.
- nenhum schema novo de pílula é criado; só resolvers de leitura.
- copy em lowercase pt-br, "você", sem em-dash, conforme core memory.

quer que eu comece pela **etapa 1** (desencravar a avaliação) assim que você aprovar, ou prefere reordenar?
