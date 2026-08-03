# entrega do módulo 1 nunca chegou na sua fila

## o que aconteceu com a Rafaela

ela fez o módulo 1 inteiro. o texto dela está salvo no banco, com as três reflexões respondidas. só que a entrega ficou com status `rascunho`, e a fila de `/admin/entregas` só mostra o que está `enviado`. por isso o módulo 2 aparece pra você e o 1 não.

linha do tempo real dela (Rafaela11541, IA na prática):

```text
14/06 12:20  começa o módulo 1
14/06 17:18  marca as últimas pílulas -> módulo 1 vira "concluído"
             a entrega do módulo 1 continua "rascunho"
14/06 19:57  abre o módulo 2 (já desbloqueado)
22/06 14:11  clica em "concluir" no módulo 2 -> entrega 2 vai como "enviado"
```

## por que o sistema deixou

hoje existem dois caminhos diferentes pra fechar um módulo:

1. marcar as pílulas obrigatórias uma a uma. quando a última é marcada, o módulo é dado como concluído automaticamente e a entrega **não** é enviada, de propósito (foi uma decisão anterior pra não promover rascunho em branco).
2. clicar no botão de concluir o módulo. esse caminho envia a entrega junto.

o desbloqueio do módulo seguinte olha só pra conclusão do módulo, nunca pro status da entrega. resultado: quem fecha pelo caminho 1 avança com a entrega parada em rascunho.

não é caso isolado: hoje existem **43 entregas em rascunho de 17 estudantes** em módulos já marcados como concluídos.

## o que proponho fazer

### 1. fechar o buraco (o principal)

no auto-fechamento por pílulas, se a entrega do módulo tiver conteúdo preenchido, ela é enviada junto (mesma regra do botão concluir). se estiver realmente em branco, o módulo não fecha sozinho: o estudante vê um aviso curto pedindo o registro antes de avançar.

### 2. recuperar as 43 entregas presas

carga única promovendo pra `enviado` só os rascunhos com conteúdo real em módulos já concluídos, usando a data de conclusão do módulo como data de envio. rascunho vazio fica como está.

### 3. deixar visível no admin

na fila de entregas, um filtro/aviso "rascunho preso" mostrando entrega com conteúdo em módulo concluído, pra você nunca mais depender de perceber isso na mão.

## detalhes técnicos

- `src/pages/Modulo.tsx`, `togglePillMutation.onSuccess`: hoje comenta explicitamente que não submete. passa a reaproveitar `submitDeliverableIfExists()` quando `content` tem resposta preenchida, e bloqueia o auto-complete quando a pílula de registro é obrigatória e está vazia
- opção mais forte (dizer se quer): exigir `status='enviado'` da entrega obrigatória em `useEletivaProgress` pra liberar o módulo seguinte. muda a regra de desbloqueio pra todo mundo, por isso deixei fora do escopo padrão
- migração de dados: update em `module_deliverables` filtrando por `status='rascunho'`, `content` não vazio e `student_module_progress.completed_at is not null`
- filtro novo em `src/features/admin/AdminFeedbackInbox.tsx`, só leitura
