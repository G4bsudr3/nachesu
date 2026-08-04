# marcar hey@frattz.com e tassiapmg como contas de teste

hoje as duas contas estão como estudante real: `is_test = false`. juntas elas têm 14 entregas na fila do admin, misturadas com as entregas de estudante de verdade.

## o que muda

1. as duas contas passam a ser conta de teste
   - `hey@frattz.com` (5 entregas)
   - `tassiapmg@gmail.com` (9 entregas)
   - só isso já tira as duas da fila de entregas, da lista de usuários e do painel de risco, que já respeitam o marcador de teste e têm o botão "mostrar teste" quando você quiser vê-las

2. estender o filtro de teste pros painéis que ainda não respeitam
   - pulso (notas e comentários), notificações e turma hoje contam todo mundo, inclusive teste
   - aplico o mesmo padrão dos outros painéis: por padrão escondem conta de teste, com um toggle "incluir teste" pra você inspecionar quando precisar

## o que não muda

- as respostas e entregas continuam no banco, nada é apagado
- as duas contas continuam podendo estudar e responder normalmente
- outras contas já marcadas como teste (`frattz@naches.app`, `mateus.frattz@edu.sebrae.com.br`) ficam como estão

## detalhes técnicos

- update de dados em `public.profiles` setando `is_test = true` nos user_ids `eeb9045d-…082` e `401e3d19-…005`
- `usePulso`, `AdminNotificacoes` e `AdminTurma` passam a cruzar com `profiles.is_test` e filtrar, seguindo o mesmo contrato de `usePendingDeliverables` (contagem de escondidos + toggle)
- nenhuma mudança de schema, nenhuma policy nova
