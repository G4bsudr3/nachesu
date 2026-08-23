# auditoria do reenvio de entrega

## o que já verifiquei no código e no banco

**1. o bug do reenvio já está corrigido.** em `ModuloFeedbackCard.tsx`, o `reopenMutation` já limpa os quatro campos:

```
status: "rascunho", submitted_at: null, reviewed_at: null, reviewer_id: null
```

isso espelha o `reopenMutation` do lado admin (`FeedbackReviewDrawer.tsx`, que faz `reviewed_at: null, reviewer_id: null, status: "enviado"`). com `reviewed_at` limpo, o writer do aluno em `Modulo.tsx` (`submitDeliverableIfExists`, filtrado por `.is("reviewed_at", null)`) volta a casar a linha.

**2. no banco não sobrou nenhuma entrega presa.** hoje existem 356 `enviado`, 141 `rascunho` (nunca enviados) e 3 `revisado`. nenhuma linha em `ajuste`, nenhuma linha com `reviewed_at` preenchido e `status = rascunho`.

**3. existe um problema real ainda aberto: módulo conclui mesmo se a entrega não for enviada.** no `completeMutation` de `Modulo.tsx`, a ordem é: grava `student_module_progress.completed_at` → depois chama `submitDeliverableIfExists()`. essa função não checa erro nem quantas linhas casaram. resultado: 20 pares (estudante, módulo) hoje estão com módulo concluído e entrega sem `submitted_at`. isso conta pro progresso e pro certificado sem o educador ver a entrega.

## o que vou fazer

### a) teste end-to-end do ciclo completo
com um estudante de teste (`is_test`), rodar no navegador o ciclo real:

1. abrir um módulo, preencher e concluir → conferir `status = enviado`, `submitted_at` preenchido
2. como educador, revisar pedindo correção → `status = ajuste`, `reviewed_at` e `reviewer_id` preenchidos
3. como estudante, clicar em "revisar e reenviar" → conferir que os quatro campos voltaram ao estado de rascunho limpo
4. concluir de novo → conferir `status = enviado`, `reviewed_at` nulo
5. conferir que a entrega reaparece na fila do educador em `/admin/entregas` (filtro pendentes)

evidência: screenshots das telas + a linha do banco em cada etapa, colada na resposta.

### b) acoplar conclusão do módulo e envio da entrega
em `src/pages/Modulo.tsx`:

- `submitDeliverableIfExists` passa a devolver a linha atualizada (`.select("id")`) e a propagar erro
- a ordem no `completeMutation` inverte: primeiro envia a entrega, só depois grava `completed_at`. se o envio falhar, o módulo não conta como concluído e o estudante vê a mensagem de erro
- caso a entrega esteja com `reviewed_at` preenchido (já revisada e o estudante concluiu de novo sem reabrir), o writer limpa os marcadores de revisão junto, em vez de casar 0 linhas em silêncio
- módulo sem nenhuma linha em `module_deliverables` continua concluindo normalmente (nada a enviar)

### c) regularizar as 20 linhas presas
migração pontual que marca como `enviado` (com `submitted_at` = `updated_at` da linha) as entregas cujo módulo já está concluído mas que nunca foram enviadas, pra elas aparecerem na fila do educador.

### d) teste automatizado
teste unitário da regra "se o envio da entrega falha, `completed_at` não é gravado", isolando a função de conclusão.

## detalhes técnicos

arquivos tocados: `src/pages/Modulo.tsx` (writer + ordem do `completeMutation`), um teste novo em `src/pages/__tests__/`, uma migração de dados. `ModuloFeedbackCard.tsx` e `FeedbackReviewDrawer.tsx` ficam como estão.
