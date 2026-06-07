## o que está acontecendo (diagnóstico no banco, agora)

rodei as queries direto na base. **o progresso está sendo salvo normal**, o problema é só de visibilidade no admin.

números reais hoje:

- **22 estudantes matriculados** ao todo (não 100+). 11 em IA na Prática, 13 em Economia Circular.
- **10 estudantes já começaram** a responder a aula 1 (têm rascunho salvo no banco, com conteúdo de verdade — de 46 até 2484 caracteres por entrega).
- **1 entrega "enviada"** formalmente (botão "enviar pro educador" clicado).
- **1 entrega já com retorno do educador** (revisado).
- **8 entregas em rascunho** que o inbox simplesmente **não mostra**.

quebrado por curso:

```text
IA na Prática              11 matriculados · 6 começaram · 1 enviou · 2 completaram módulo
Economia Circular & Reg.   13 matriculados · 4 começaram · 0 enviou · 0 completaram módulo
```

ou seja: o autosave (`module_deliverables`, status `rascunho`) tá funcionando. o que falta é o inbox te mostrar "fulano começou e tá no meio". hoje o filtro padrão é `pendentes` (= status `enviado`), e nem existe opção `rascunho` no dropdown. por isso parece que "só 1 respondeu".

## o que fazer

### 1. adicionar visibilidade de rascunhos no feedback inbox
- novo valor no filtro de status: **"em rascunho"** (já existe "pendentes / em ajuste / revisados / todos").
- novo contador no header: `X em rascunho` ao lado de `pendentes · em ajuste · revisados`.
- coluna "enviado" passa a mostrar `rascunho há Xd` (cinza) quando `submitted_at` é null.
- ao abrir o drawer de uma entrega em rascunho, mostrar o conteúdo atual + aviso "ainda não foi enviado pro educador, você está vendo um rascunho", **sem permitir revisar** (não dá retorno em rascunho — só visualiza pra acompanhar).
- exportar CSV passa a incluir rascunhos quando o filtro escolhido for "em rascunho" ou "todos".

### 2. painel "panorama da turma" no admin home (curto)
um card único acima da fila de ação, por curso:

```text
IA na Prática
11 matriculados · 6 começaram · 1 enviou · 2 completaram aula 1
```

assim você bate o olho e sabe que o progresso tá sendo salvo, mesmo sem ninguém ter "enviado". query simples agregando `enrollments`, `module_deliverables`, `student_module_progress`.

### 3. validar o botão "atualizar" do inbox
o botão chama `refetch()` da query react-query, que já existe. provavelmente "não atualiza" porque você esperava ver mais gente — e na verdade ele tá certo, só não tinha o que mostrar com o filtro `pendentes`. depois do item 1, isso some sozinho. se ainda sentir lag, adiciono `await queryClient.invalidateQueries(...)` explícito + toast "atualizado".

### 4. garantir o autosave dos estudantes (revisão defensiva)
o `useDeliverable` + `useAutoSaveField` (debounce 700ms) já estão certos: lazy-create (não cria rascunho vazio no mount), merge por chave, mutação que escreve `content` + `updated_at`. vou só:
- adicionar **indicador "salvando…" / "salvo há Xs"** mais visível em cada pílula da aula 1 (hoje existe mas é discreto demais — vou levantar pra `text-xs` com ícone, ancorado embaixo de cada bloco).
- logar um `console.warn` quando o save falhar (hoje só seta `status = "error"` silencioso). sem mudar lógica, só visibilidade.

## o que **não** vou mexer

- schema de `module_deliverables` — está correto.
- regra "rascunho não vira pendente automaticamente" — é proposital, o estudante precisa clicar enviar.
- nada no fluxo do estudante além do indicador de save mais claro.

## detalhes técnicos

arquivos tocados:

- `src/features/admin/usePendingDeliverables.ts` — adicionar `"rascunho"` em `InboxFilter`, branch de query (`status='rascunho'` + `submitted_at IS NULL`), retornar `rascunhoCount`.
- `src/features/admin/AdminFeedbackInbox.tsx` — opção no `<Select>`, contador no header, render da coluna `enviado` pra rascunho, CSV.
- `src/features/admin/FeedbackReviewDrawer.tsx` — modo "somente leitura" quando `status='rascunho'`.
- `src/pages/AdminHome.tsx` (ou componente novo `AdminTurmaPanorama.tsx`) — card de panorama por curso.
- `src/components/eletiva/pills/useDeliverable.ts` — `console.warn` no `onError` do mutation.
- pílulas da aula 1 (`src/components/eletiva/pills/*.tsx`) — subir o indicador de autosave pra fora do hover discreto.

nenhuma migration, nenhuma mudança de RLS, nenhum endpoint novo.
