# simular hey@frattz.com nos módulos 1 a 5 de ia na prática

criar um histórico realista de estudante pra você testar a correção pelo admin e a experiência de notificação no celular.

## o que vai acontecer

a conta `hey@frattz.com` (apelido "hey") já está matriculada nas duas eletivas e hoje está zerada: nenhuma pílula concluída, nenhuma entrega. depois dessa simulação ela vai aparecer como estudante que fez os 5 primeiros módulos de **ia na prática** direitinho:

- todas as pílulas dos módulos 1 a 5 marcadas como concluídas
- os 5 módulos com data de conclusão, espalhados nos últimos dias (não tudo no mesmo minuto, pra parecer estudo real)
- as 5 entregas com **todos os campos preenchidos** com respostas escritas em primeira pessoa, no tom de um estudante de 14-15 anos
- as 5 entregas com status **enviado**, esperando correção, ou seja, elas caem na fila de `/admin/entregas`

nada muda na eletiva de economia circular.

## as respostas

cada módulo tem um exercício prático e um registro final, com campos diferentes (comparar dois prompts, pacto de compromissos, mapa de problema, etc). vou ler o formato de cada pílula e escrever resposta específica pra cada campo, incluindo as escolhas de múltipla escolha e os checklists. sem lorem ipsum e sem resposta genérica repetida: cada módulo tem uma resposta própria, com erro e dúvida no meio, pra você conseguir testar a análise da ia e escrever feedback de verdade.

campos de print/imagem ficam vazios, porque não dá pra simular upload de arquivo.

## depois disso, o que você testa

1. abre `/admin/entregas`, filtra por ia na prática, acha "hey" e responde módulo por módulo
2. cada feedback enviado gera notificação pro estudante
3. entra no celular com `hey@frattz.com` e vê o sino, o card de feedback no topo do módulo e o fluxo de leitura

## observações técnicas

- alterações só de dados, via insert/update: `student_pill_progress`, `student_module_progress`, `module_deliverables` para o user `eeb9045d-…082`
- `module_deliverables.content` escrito no mesmo formato que o app grava, chaveado por pílula, pra que a régua de completude do admin (`computeCompleteness`) reconheça a entrega como completa
- `submitted_at` preenchido junto com `status = 'enviado'`, `reviewed_at` nulo
- datas retroativas coerentes: módulo 1 mais antigo, módulo 5 mais recente
- nenhum arquivo de código muda

## fora do escopo

- não marco `is_test` na conta, então ela aparece na fila normal do admin (se preferir separar, dá pra ligar depois)
- não simulo respostas de economia circular
- não simulo módulos 6 em diante
