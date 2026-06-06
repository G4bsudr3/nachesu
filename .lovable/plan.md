# status · revisão crítica nachesU (executada)

todas as 5 etapas do plano "revisão crítica nachesU" foram aplicadas. resumo do que ficou no código:

## etapa 1 · resolvers faltantes
- `src/features/admin/deliverableRendering/types.ts` — `PillSchemaType` extendido com `classificador_linear_circular_regenerativo`, `pbl_corf_triplo`, `guia_de_prompts`, `video_embed`, `video_with_transcript`.
- `resolvers.ts` — 3 novos resolvers + dispatcher + fallback `resolveUnknownWithData` que mostra dump raw se a pílula tem dados mas nenhum schema reconhecido.
- `DeliverableAnswersList.tsx` — usa `answer.order` em vez de `idx`; passivas com dados (fallback raw) deixam de ser filtradas.

## etapa 2 · parar de corromper entregas
- `Modulo.tsx` — autocomplete via `togglePillMutation` não chama mais `submitDeliverableIfExists()`. submit segue manual via `completeMutation`.
- `pills/useDeliverable.ts` — query só carrega; criação migrou para `ensureDeliverable` chamado no primeiro save (on-write).
- migration one-shot deletou rascunhos vazios com >7 dias parados.

## etapa 3 · avaliação útil
- migration: `module_deliverables.score numeric(5,2)`, `rubrics.score_max smallint default 10`, `rubrics.score_type text default 'none' check(...)`.
- `useRubrics.ts` — `Rubric` carrega `score_type`/`score_max`/`is_fallback`. `normalize()` consolidado.
- `FeedbackReviewDrawer.tsx` — drawer `sm:max-w-2xl lg:max-w-3xl`. Mutations separadas em `approveMutation`/`ajustarMutation`. Botões desabilitam até feedback ≥5 chars. Input numérico de nota aparece quando `rubric.score_type === "numeric"`. Histórico abre por padrão com badge de contagem. Fallback de rubrica padrão indicado abaixo do nome. `confirm()` da IA virou `AlertDialog`.
- `usePendingDeliverables.ts` — `.limit(500)` + `staleTime: 30_000`.
- `AdminFeedbackInbox.tsx` — campo de busca por nome/apelido; `TableRow.onClick` removido (revisar = botão; nome = link); `timeAgo` reativo via `useNow` 60s.

## etapa 4 · confiança do aluno
- `SaveIndicator.tsx` — dispara `toast.error` ao entrar em estado de erro; copy "não salvou · tenta digitar de novo".
- `Modulo.tsx` (branch `!isUnlocked`) — agora envelopa `bg-perestroika-bege`, `MobileNav` e `EletivaFooter`.
- `EletivaHome.tsx` — `loading` agora inclui `snapLoading` quando o curso já está conhecido.
- `ModuloPillList.tsx` — botão "marcar/concluída" `min-h-[44px]`.
- `ModuloFeedbackCard.tsx` — fallback quando `status === "ajuste"` sem texto.
- `DeliverableStatusPill.tsx` — "card laranja" → "card de feedback".

## etapa 5 · polimento
- `ModuloHeader.tsx` — `{totalMinutes} min` ou "tempo variável".
- `ModuloProgressBar.tsx` — `if (!visible) return null` no lugar de `aria-hidden`.
- `Modulo.tsx` — barra usa `requiredPills` como total quando existem obrigatórias.
- `TutorChat.tsx` — chips visíveis sempre que não streaming; hint shift+enter `hidden sm:block`.
- `ModuloFooter.tsx` — copy alinhada ("só marque quando tiver entregue de verdade").

## fora de escopo (anotado pra próximo)
- formulário no `AdminRubrics.tsx` pra editar `score_type`/`score_max` (hoje só via SQL ou default).
- substituir `confirm()` na deleção de rubrica.
- redesenho do inbox em layout kanban + exportação CSV.
