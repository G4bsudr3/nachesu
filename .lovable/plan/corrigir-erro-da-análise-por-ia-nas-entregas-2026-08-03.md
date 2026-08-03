# corrigir erro da análise por ia nas entregas

## o que aconteceu

o botão chama a função `draft-deliverable-feedback`, que responde erro antes de chegar na ia. o log da função mostra:

```text
deliverable lookup failed
message: "column modules_1.summary does not exist"
```

a busca da entrega pede um campo `summary` do módulo que não existe no banco. a tabela `modules` tem: `title`, `number`, `objective`, `deliverable_description`, `rubric_id`, `total_minutes`, entre outros. como a consulta falha, a função devolve "entrega não encontrada" (404) e o front mostra "Edge Function returned a non-2xx status code".

não é problema de permissão, de créditos nem do modelo. é só o nome da coluna.

## correção

Em `supabase/functions/draft-deliverable-feedback/index.ts`:

- trocar o select do módulo de `modules(id, number, title, summary, rubric_id)` para `modules(id, number, title, objective, deliverable_description, rubric_id)`
- montar o contexto do módulo a partir de `objective` (e incluir `deliverable_description` como "o que o módulo pediu de entrega"), no lugar do antigo `summary`
- redeploy da função e teste real numa entrega existente, conferindo os três modos: análise crítica, rascunho de feedback e rascunho de resposta na conversa

## detalhe técnico

o contexto enviado à ia fica melhor com os dois campos: `objective` explica a intenção do módulo e `deliverable_description` diz o que era esperado na entrega, o que deixa a crítica mais precisa sobre "está fora do que o módulo pediu".
