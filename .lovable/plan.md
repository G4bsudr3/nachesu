## diagnóstico

abri todas as entregas (`module_deliverables`) no banco. existem **11 registros**, todos do módulo 1:

| estudante | status | enviou? | conteúdo |
|---|---|---|---|
| Joao11522 | enviado | sim | completo |
| frattz | revisado | sim | completo |
| Gabriela11681 | **rascunho** | não | **completo** (quiz, 5 evidências, guided, bônus) |
| Victor11771 | rascunho | não | precisa conferir |
| Leticia11573 | rascunho | não | precisa conferir |
| Lara11507 | rascunho | não | precisa conferir |
| Henrique11843 | rascunho | não | precisa conferir |
| Maria11633 | rascunho | não | precisa conferir |
| Victor11671 | rascunho | não | precisa conferir |
| Mateus Frattz | rascunho | não | precisa conferir |
| duduobregon | rascunho | não | precisa conferir |

ou seja: **só duas pessoas no mundo entregaram de fato**. nove estão paradas em rascunho.

## por que a Gabriela aparece como rascunho

o `module_deliverables.content` dela tem tudo: quiz_answers (p1, p2, p3), 5 itens com evidência (`items`), guided_answers (q1, q2, q3) e bônus (dado + porque). respondida em todos os campos.

mas o status só vira `enviado` quando a estudante clica **"concluir módulo"** no fim da página (`completeMutation` em `Modulo.tsx:144`). ela preencheu, o autosave salvou rascunho, e ela saiu sem fechar o módulo. nenhum registro em `student_pill_progress` confirma que ela tenha clicado "marcar pílula como feita" — então o gate "termine as obrigatórias primeiro" travaria o botão se ela tentasse.

a tag verde **"respondida"** que aparece na sua tela é por pílula (significa "tem texto salvo"), não por módulo. nada a ver com `enviado`.

## o que vou fazer

### 1. classificar "rascunho completo" no admin (essencial)

no `AdminFeedbackInbox` e no drawer de revisão:

- adicionar um cálculo de **completude do conteúdo** (não do progresso de pílula): pra cada pílula `required`, verifico se as chaves esperadas estão preenchidas no `content` (`quiz_answers.p1/p2/p3`, `items` com >= mínimo, `guided_answers.qX`, etc.). reaproveito os `resolvers` que já existem em `deliverableRendering/resolvers.ts` — eles já sabem ler cada tipo de pílula.
- nova badge **"rascunho completo"** (cinza-verde) ao lado de **"rascunho"** quando todas as obrigatórias têm resposta substantiva.
- novo filtro no `<Select>` de status: `pendentes`, `rascunho completo`, `rascunho parcial`, `ajuste`, `revisados`, `todos`. quem está em "rascunho completo" virou candidato a cutucar.

### 2. ação admin "marcar como enviado" pra rascunhos completos

no drawer de revisão, quando o deliverable estiver em rascunho completo:

- botão **"marcar como enviado em nome do estudante"** que chama um novo RPC `admin_submit_deliverable(deliverable_id)` (`SECURITY DEFINER`) setando `status='enviado'` + `submitted_at=now()` + log no `deliverable_messages` ("enviado manualmente pelo educador porque o rascunho estava completo").
- isso resgata as 8 pessoas que já fizeram o trabalho e estavam invisíveis.

### 3. corrigir o gate no lado do estudante (causa raiz)

hoje, mesmo com tudo preenchido, o botão "concluir módulo" pede que cada pílula tenha sido **marcada como feita** (`student_pill_progress`). isso é fricção desnecessária pra esse tipo de pílula sem ação explícita de "concluir". duas opções pequenas:

- **(preferida)** detectar autocomplete: quando o autosave salva e o conteúdo da pílula passa no `resolvers` como "respondido", inserir automaticamente em `student_pill_progress` (`completed_at=now()`). assim "preencheu = concluiu".
- alternativa: no botão "concluir módulo", se faltar marcar pílula mas o conteúdo dela estiver completo, marcar na hora antes de submeter.

vou pela primeira: marcação implícita no `useDeliverable` quando o save bem-sucedido cobrir todos os campos obrigatórios daquela pílula.

### 4. nudge visível pro estudante

no `DeliverableStatusPill` / topo do módulo: se `status='rascunho'` e todas as obrigatórias estão respondidas, badge laranja **"falta só apertar concluir"** + scroll para o CTA. evita que o próximo estudante caia no mesmo buraco.

## detalhes técnicos

- **frontend**:
  - novo helper `src/features/admin/deliverableRendering/completeness.ts` reusando `resolvePill` → retorna `{ requiredTotal, requiredAnswered, isComplete }`.
  - `usePendingDeliverables.ts`: ao mapear `RpcRow`, juntar com `admin_module_pills` pra cada `module_id` único (em batch) e calcular completude por linha; expor `completeness` no `DeliverableInbox`.
  - `AdminFeedbackInbox.tsx`: nova badge "rascunho completo", novo filtro, atualizar contadores no header (`X rascunhos completos`).
  - `FeedbackReviewDrawer`: botão "marcar como enviado" condicional.
  - `Modulo.tsx` + `useDeliverable.ts`: marcar pílula como concluída automaticamente quando o conteúdo passa no resolver.
- **db** (migration nova):
  - `admin_submit_deliverable(p_id uuid)` `SECURITY DEFINER`, valida `has_role(auth.uid(), 'admin')`, set `status='enviado'`, `submitted_at=now()` (se for null), insere mensagem no `deliverable_messages`.
- **sem mudança de schema** em tabelas.

## fora de escopo

- não vou rodar a "marcação como enviado" em lote agora: prefiro você revisar caso a caso no admin com a nova badge. me confirma depois se quer um botão "marcar todos os rascunhos completos como enviados".
- não mexo na RLS atual: as RPCs criadas anteriormente continuam servindo o inbox.
