## o problema

hoje o `FeedbackReviewDrawer` (revisão do educador) mostra as respostas como:

```
pílula abc12345
[texto do aluno]
```

sem o título da pílula, sem o texto da pergunta, sem o tipo (reflexão / pbl / quiz / checklist), sem ordem do módulo. o "código maluco" é o `pillId.slice(0,8)`.

além disso o drawer **só renderiza 6 dos 10 campos** que as pílulas salvam. ficaram de fora:

- `pbl_estruturado` (pílulas pbl novas com pedido a/b, prints, melhor, por_que, aprendi) — toda a entrega rica do pbl com prints não aparece pro professor
- `checklist` (pílula de pacto) — invisível
- `items` quando salvos como radar via novo `field: "items"` (sem schema dos fluxos)
- prints/uploads (`evidence_kind: upload`) não viram link clicável

resultado: pro dudu (economia circular) e pro frattz (ia na prática) revisar fica quase impossível. é o feedback que sustenta os dois cursos e está com a pior ergonomia da plataforma.

## o que vamos fazer

reconstruir o renderizador de entregas pra:

1. **resolver** cada chave do `content` jsonb contra `module_pills` (título, kind, order_index, interaction_schema) e mostrar pergunta + resposta lado a lado, em ordem do módulo.
2. **cobrir 100%** dos tipos de pílula que existem hoje (10 campos).
3. **renderizar prints/uploads** como thumbnail + link assinado.
4. **marcar pílulas obrigatórias sem resposta** explicitamente ("não respondida"), não esconder.
5. **persistir um snapshot** da pergunta no momento da entrega pra não quebrar se o schema da pílula mudar depois.

## entregas técnicas

### 1. novo módulo `src/features/admin/deliverableRendering/`

- `useDeliverableAnswers.ts` — hook que recebe um `DeliverableInbox`, busca todas as `module_pills` do `module_id` (campos: `id, order_index, kind, title, body_md, interaction_schema, required`), e retorna `ResolvedAnswer[]` ordenado por `order_index`:

  ```ts
  type ResolvedAnswer = {
    pillId: string;
    order: number;
    kind: PillKind; // 'editorial' | 'pbl_estruturado' | 'checklist_pacto' | 'conteudo_curado' | 'quiz' | 'radar' | 'bonus' | 'abertura' | 'reflexao' | 'pbl'
    title: string;
    required: boolean;
    blocks: AnswerBlock[]; // ver abaixo
    state: 'respondida' | 'parcial' | 'nao-respondida';
  };
  type AnswerBlock =
    | { kind: 'text'; question: string; answer: string }
    | { kind: 'choice'; question: string; answer: string; optionLabel?: string }
    | { kind: 'upload'; question: string; url: string; mime?: string; filename?: string }
    | { kind: 'list'; question: string; items: { label: string; value: string }[] }
    | { kind: 'checklist'; question: string; items: { label: string; checked: boolean }[] }
    | { kind: 'empty'; question: string };
  ```

- `resolvers/` — uma função pura por kind de pílula que recebe `(pill, content)` e devolve `AnswerBlock[]`:
  - `editorial.ts` → lê `schema.reflexao.prompt` + `content.reflections[pillId]`
  - `reflexao.ts` (legacy) → idem com `body_md` como fallback
  - `pbl.ts` (legacy) → `content.pbl_responses[pillId]` com prompt = título da pílula
  - `pblEstruturado.ts` → para cada campo em `schema.campos` (pedido_a, print_a, pedido_b, print_b, melhor, por_que, aprendi) lê `content.pbl_estruturado[pillId][campo]`, resolve `melhor` contra `options`, e para `print_*` gera um bloco `upload` com signed url do bucket `radar-evidences` ou `pill-attachments`
  - `checklistPacto.ts` → lê `schema.itens[]` + `content.checklist[pillId]`
  - `conteudoCurado.ts` → para cada `schema.questions[]`, casa por `q.id` com `content.guided_answers[q.id]`; resolve `single_choice` no label da option
  - `quiz.ts` → para cada `schema.questions[]`, casa com `content.quiz_answers[q.id]`, mostra a opção escolhida + se é a resposta correta (se `q.correct` existir)
  - `radar.ts` / `radarFinal.ts` → lê `content.items[]`, resolve `fluxo` contra dicionário do schema
  - `bonus.ts` → lê `content.bonus[pillId]` com prompt do schema
  - `abertura.ts` → marca como visualizada (sem entrada)

  cada resolver é pequeno, isolado e testável. fica óbvio o que falta quando aparece uma pílula nova.

- `signedUrl.ts` — helper que dá `createSignedUrl(bucket, path, 3600)` com cache em memória pro escopo do drawer.

### 2. novo `DeliverableAnswersList.tsx`

substitui o `ContentRenderer` atual. usa o hook e renderiza:

```
m02 · pílula 03 · pbl estruturado · obrigatória
"duelo de prompts"
─────────────────
pergunta: descreva o prompt simples que você testou
resposta: [texto do aluno em quote block]

pergunta: print do resultado
resposta: [thumb 80x80 → abre signed url]

pergunta: qual ficou melhor? (a | b)
resposta: b — "porque foi mais específico..."

⚠ pergunta "o que você aprendeu" — não respondida
```

estilo: cada pílula é um card com header (badge kind + número + título), blocos em pares pergunta/resposta com tipografia clara. pílula sem resposta fica colapsada com um chip "não respondida". atalho "ver como aluno vê" usa o novo `/app/eletiva/:slug/modulo/:n` (já existe `moduloHref`).

### 3. atualizar `FeedbackReviewDrawer.tsx`

trocar `<ContentRenderer content={...} />` por `<DeliverableAnswersList deliverable={deliverable} />`. resto do drawer (rubric chips, feedback textarea, aprovar/ajustar/reabrir) fica igual.

### 4. snapshot defensivo no momento da entrega

acrescentar ao `useDeliverable` (ou ao `useAutoSaveField`) um campo `content.questions_snapshot` salvo na **primeira** vez que o aluno toca em qualquer campo daquela pílula. estrutura:

```jsonc
content.questions_snapshot = {
  [pillId]: {
    title: "...",
    kind: "pbl_estruturado",
    order_index: 5,
    fields: {
      pedido_a: "descreva o prompt simples que você testou",
      print_a: "print do resultado",
      melhor: { label: "qual ficou melhor?", options: [...] }
      ...
    }
  }
}
```

o resolver usa esse snapshot quando existir (resiliente a edits do schema) e cai no schema atual quando não existir (entregas antigas). zero migração de dados.

### 5. preview pro educador testar

adicionar atalho no `AdminEletivaReview` (que hoje só lista pílulas/escopo): botão "ver como entrega de aluno" em cada pílula → abre o `DeliverableAnswersList` com um deliverable mock construído a partir dos placeholders do schema. ajuda dudu e frattz a validarem perguntas antes de publicar.

## fora de escopo desta rodada

- exportar entrega em pdf
- comentários por bloco/pergunta (hoje feedback é único por entrega)
- timeline de revisões anteriores
- alertas por email pro professor de fila pendente (já existe `usePendingDeliverables` count, basta consumir depois)

## arquivos tocados

novos:
- `src/features/admin/deliverableRendering/useDeliverableAnswers.ts`
- `src/features/admin/deliverableRendering/DeliverableAnswersList.tsx`
- `src/features/admin/deliverableRendering/signedUrl.ts`
- `src/features/admin/deliverableRendering/resolvers/*.ts` (10 arquivos pequenos)
- `src/features/admin/deliverableRendering/types.ts`

editados:
- `src/features/admin/FeedbackReviewDrawer.tsx` — trocar o renderer
- `src/components/eletiva/pills/useDeliverable.ts` — adicionar snapshot de perguntas
- cada pílula em `src/components/eletiva/pills/*.tsx` e `src/components/eletiva/modulo/Pill*.tsx` — chamar `recordQuestionsSnapshot(pill)` no mount (uma linha cada)
- `src/features/admin/AdminEletivaReview.tsx` — botão de preview por pílula

zero schema novo, zero migração obrigatória.

## validação

depois de implementar, abrir o drawer com:
- uma entrega real do módulo 1 ia na prática (tem `reflections` + `bonus`)
- uma entrega do módulo 2/3 (pbl_estruturado + checklist) — pode ser criada manualmente seguindo o fluxo
- uma entrega vazia (só `submitted_at` sem campos)

cada um deve mostrar título da pílula, texto da pergunta e resposta legível ou chip "não respondida". prints abrem em nova aba.