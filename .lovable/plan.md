# revisão crítica dos exercícios: módulos 11 a 20 de ia na prática

mesma lente aplicada nos módulos 1 a 10, agora na segunda metade da eletiva (construção no lovable e validação & evolução).

## o que os dados dizem

nenhum estudante entregou nada de 11 a 20 ainda: 0 rascunhos, 0 enviados, só a conta de teste passou por lá. ou seja, dá pra corrigir antes de doer, diferente do módulo 2.

o que dá pra medir é tempo declarado contra tempo real. somando as pílulas de cada módulo:

| módulo | soma das pílulas | declarado |
| --- | --- | --- |
| 11 | 43 a 65 min | 50 |
| 12 | 42 a 61 min | 50 |
| 13 | 42 a 62 min | 50 |
| 14 | 42 a 62 min | 50 |
| 15 | 46 a 70 min | 50 |
| 16 | 41 a 61 min | 50 |
| 17 | 42 a 66 min | 50 |
| 18 | 41 a 63 min | 50 |
| 19 | 43 a 62 min | 50 |
| 20 | 44 a 67 min | 50 |

todos os dez estouram o teto de 50 min no cenário alto, e nenhum desses números conta o trabalho que acontece fora do app (construir no lovable, testar com gente real, gravar pitch). o tempo real dos módulos 15, 16, 17 e 20 é de vários dias, não de uma sessão.

## os três problemas estruturais

**1. todo módulo pede uma versão publicada nova.** v1 no 11, v2 no 12, v3 no 13, v4 no 14, e mais iterações no 18 e 19. o campo "link da vX publicada" é obrigatório e trava a entrega em quase todos. quem não conseguiu republicar naquela semana fica preso, mesmo tendo feito o raciocínio inteiro. o link precisa ser um só, vivo, atualizado ao longo da trilha, não uma nova exigência por semana.

**2. quatro campos obrigatórios longos por exercício, sempre com a mesma forma.** de 11 a 20 todo exercício é `pbl_estruturado` com os mesmos quatro campos travando o botão (pedido_a, pedido_b, por_que, aprendi), cada um pedindo texto estruturado de vários itens. no 15, por exemplo, o portão exige 3 achados de observação + 2 sugestões interpretadas + contexto das pessoas + top 3 priorizado. é dissertação, não evidência de aprendizado.

**3. os módulos que dependem de outras pessoas não dizem que dependem.** 15 (dois testadores), 16 (convite de 5 a 8 pessoas), 17 (rodada real de uso com 3 evidências) e 20 (pitch gravado) são trabalho de campo assíncrono empacotado como exercício de 30 minutos. sem essa separação explícita, o estudante que não conseguiu reunir gente naquela semana simplesmente para, e a trilha de validação inteira desmonta.

## princípios aplicados (os mesmos de 1 a 10)

1. um portão obrigatório por exercício carrega o aprendizado; o resto vira campo opcional visível.
2. link do projeto é único e persistente, atualizado, não recriado a cada módulo.
3. exercício com carga externa declara a parte de fora do app e aceita evidência menor (áudio, print de conversa, relato curto).
4. profundidade no lugar de volume: 3 achados viram 1 achado bem interpretado + 2 opcionais.
5. tempo declarado bate com o tempo real, com núcleo e bônus separados como já fizemos nos primeiros módulos.
6. falhar é seguro: se ninguém testou o app, existe um caminho alternativo válido em vez de um beco.

## revisão módulo a módulo

**11 — mvp funcionando.** é o marco "minha ideia está no ar". manter o link obrigatório aqui, é o único módulo em que ele é o aprendizado. reduzir o portão a link + fluxo em 3 passos; critério de aceite e checklist viram opcionais.

**12 — mlp.** o valor está na comparação antes/depois dos 4 textos. portão: os 4 textos comparados. link vira "atualizei meu projeto" (confirmação), não novo campo obrigatório.

**13 — ux sem labirinto.** portão: qual etapa saiu e por que ela podia sair. contagem de toques antes/depois vira opcional, e o resultado do checklist tela por tela vira lista curta em vez de texto livre.

**14 — ia integrada.** portão: onde a ia entra no fluxo + o teste do "tira a ia". o formato escolhido e o teste com caso difícil viram opcionais. incluir caminho válido pra quem concluir que o app dele não precisa de ia, porque essa é uma resposta certa e hoje o exercício não a aceita.

**15 — teste de compreensão.** o mais pesado dos dez (46 a 70 min sem contar achar as pessoas). baixar de 2 testadores pra 1 obrigatório + 1 opcional, portão em 1 achado interpretado, e declarar a parte fora do app. aceitar áudio ou print de conversa como registro.

**16 — mvt.** exercício de planejamento, então cabe no tempo. ajustes menores: meta e convite obrigatórios, lista de convidáveis reduzida a 3 nomes com motivo, plano de medição opcional.

**17 — rodada de testes reais.** só existe se o 16 funcionou na vida real. portão: 1 evidência de uso + o que você decidiu por causa dela. as 3 evidências e os 3 feedbacks viram opcionais, e existe rota alternativa declarada pra quem não conseguiu uso real ("teste assistido com 1 pessoa"), sem punição.

**18 — iterar com critério.** já é enxuto e bem calibrado, o melhor da segunda metade. mexer pouco: só desobrigar o link novo e o backlog de 3 itens (vira 1 obrigatório).

**19 — preparação da entrega.** portfólio de prints em ordem é trabalho de arquivo, não de pensamento. portão: roteiro de pitch nos 4 atos. prints e detalhes de polish viram opcionais.

**20 — entrega final.** aqui o portão pesado se justifica: link final, pitch, declaração de uso de ia e reflexão são a certificação. manter os quatro, mas aceitar pitch em áudio explicitamente no campo e reduzir a declaração de ia a 3 linhas guiadas com exemplo pronto na tela.

## o que muda tecnicamente

- migração de dados em `module_pills.interaction_schema` dos exercícios e registros dos módulos 11 a 20: marcar campos com `optional: true`, reescrever labels e placeholders, ajustar passos
- `duration_min_low/high` das pílulas e `total_minutes` dos módulos 11 a 20 recalculados, com o que é fora do app declarado no texto e não somado ao núcleo
- reuso do que já existe: campo opcional já é suportado em `PillPBLEstruturado`, e o `EntregaChecklist` já nomeia o que falta. nenhum componente novo previsto, no máximo ajuste de rótulo em `ModuloHeader` pra "parte desse módulo acontece fora do app"
- nada de entrega existente é apagado (não há nenhuma nesses módulos)

## fora do escopo

- economia circular
- módulos 1 a 10, já revisados
- mudança nos vídeos e no texto das pílulas, exceto onde a instrução do exercício depende deles
- mudança na estrutura 4 trilhas × 5 módulos
