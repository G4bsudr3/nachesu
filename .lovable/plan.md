## Form de rubrica editável no admin

Adicionar controles de `score_type` e `score_max` no formulário de rubricas do admin, completando a migration já aplicada nas etapas anteriores.

### Escopo

1. **`src/features/admin/useRubrics.ts`**
   - Estender o tipo `Rubric` com `score_type` ("numeric" | "none") e `score_max` (number | null).
   - Incluir os campos no `select` e nas mutations de create/update.

2. **Form de rubrica no admin** (provavelmente `RubricsManager.tsx` ou similar — confirmar no build)
   - Adicionar um `Select` com duas opções: "sem pontuação" e "pontuação numérica".
   - Quando `score_type === "numeric"`, mostrar `Input` numérico pra `score_max` (default 10, min 1, max 100).
   - Quando `none`, esconder o campo e salvar `score_max` como `null`.
   - Validação: `score_max` obrigatório se `numeric`.

3. **`FeedbackReviewDrawer.tsx`**
   - Ler `score_type` da rubrica ativa.
   - Esconder o input de score quando `score_type === "none"`.
   - Quando `numeric`, mostrar o `score_max` como sufixo ("/ 10") e validar range.

4. **`DeliverableAnswersList` / card do feedback no estudante**
   - Quando existir `score` salvo, exibir como "nota: X / Y" usando o `score_max` da rubrica.
   - Se `score_type === "none"`, não mostrar nada.

### Fora de escopo

- Nenhuma migration nova (schema já tem os campos).
- Sem mudança em pílulas, resolvers ou fluxo do estudante além da exibição da nota.
- Sem rubric por módulo nova — usa as existentes.

### Validação

- Criar rubrica numeric com max 10, dar nota 8 no drawer, conferir exibição "8 / 10" no card do estudante.
- Trocar rubrica pra `none`, conferir que o input de score some no drawer e a nota não aparece no card.
