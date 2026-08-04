# revisão crítica dos exercícios: módulos 1 a 10 de ia na prática

antes de propor mudança, olhei os dados reais de quem passou por esses módulos. o que você sentiu no módulo 2 aparece no banco.

## o que os dados dizem

| módulo | começaram o exercício | entregaram | ficaram parados no meio |
| --- | --- | --- | --- |
| 1 | 16 | 9 | 8 |
| 2 | 8 | 2 | 4 |
| 3 | 5 | 3 | 0 |
| 4 | 4 | 3 | 0 |
| 5 | 1 | 2 | 0 |

o funil despenca exatamente no módulo 2: metade dos que abrem o exercício abandonam com rascunho salvo. no módulo 1 também: 8 rascunhos parados.

nota: o exercício de alucinação é o do **módulo 3** ("caça à alucinação"). o do módulo 2 é o de prompt corf. os dois têm o mesmo problema estrutural, então trato os dois.

## o diagnóstico central: o exercício pede trabalho de digitação, não trabalho de pensamento

o exercício do módulo 2 exige, pra liberar o botão de entregar:

- 3 prompts reescritos em corf
- 6 prints de tela (versão ruim e versão corf de cada um)
- 3 textos "o que mudou"
- 1 conclusão geral

são **13 campos obrigatórios**, todos bloqueando o envio, sendo 6 uploads de imagem feitos no celular. e logo depois, no registro do mesmo módulo, o estudante precisa subir **mais 2 prints** e preencher 3 templates. é o mesmo trabalho três vezes.

o que a pessoa aprende no terceiro prompt que ela não aprendeu no primeiro? nada. a repetição aqui não é prática deliberada, é volume. e o print é a pior parte: alt+printscreen no celular, salvar, achar na galeria, subir, esperar. seis vezes. é aí que o aluno larga.

o mesmo padrão no módulo 3: dois prints obrigatórios (resposta da ia e prova externa) travando a entrega de um exercício cuja substância é "eu descobri que a ia errou e como eu provei isso".

## os princípios que vou aplicar nos 10 módulos

1. **um print obrigatório por exercício, no máximo.** print vira evidência opcional, não portão. o texto do estudante é a evidência principal.
2. **profundidade no lugar de repetição.** 1 caso bem trabalhado vale mais que 3 rasos. onde tiver repetição, corto pra 1 obrigatório + 1 opcional "quer treinar mais".
3. **o campo tem que provocar pensamento, não transcrição.** trocar "o que mudou" por comparação com critério ("qual das duas você entregaria pro professor? por quê?").
4. **portão de entrega só nos campos que carregam o aprendizado.** os demais viram opcionais visíveis, sem bloquear.
5. **tempo declarado tem que bater com o tempo real.** o módulo 2 diz 18-22 min e na prática é 40+.
6. **exercício com carga externa (entrevista, safári, gravação) precisa dizer que é assíncrono**, com a parte de dentro do app separada da parte de fora.

## revisão módulo a módulo

**módulo 1 — duelo de respostas.** conceito bom (comparar duas respostas), mas 8 rascunhos parados indicam portão apertado. reduzir campos obrigatórios ao par pergunta + veredito comentado; print opcional.

**módulo 2 — operação prompt.** de 3 prompts para 1 obrigatório (o de geografia, que é o mais próximo da vida escolar) + 2 opcionais. prints opcionais. campo novo de comparação com critério de escolha. e retirar do registro a exigência de mais 2 prints: o registro herda o que já foi feito no exercício e foca só nos 3 templates + reflexão.

**módulo 3 — caça à alucinação.** boa ideia, execução burocrática. manter os 3 passos, mas: prints opcionais, e o coração passa a ser "o que te fez desconfiar" e "que pergunta você faria diferente". incluir orientação de pergunta que quase garante o erro (fato local ou pós-2024), pra ninguém travar em "a ia acertou tudo".

**módulo 4 — expedição de ferramentas.** revisar se testar 2 ferramentas cabe em 18-24 min contando cadastro. proposta: 1 ferramenta testada a fundo + 1 avaliada por observação.

**módulo 5 — primeira construção publicada.** é o momento mais alto do curso e está com 22-30 min, o que é irreal pra um primeiro build no lovable. reescalar o tempo e quebrar em duas partes: construir e publicar / testar com uma pessoa.

**módulo 6 — safári de problemas: 10 em 7 dias.** 10 problemas em 20-28 min não fecha. o exercício é de campo, ao longo da semana. separar explicitamente: coleta fora do app, registro dentro. e baixar a meta pra 5 problemas com contexto, que é o que gera escolha boa no módulo 7.

**módulo 7 — a escolha: 10 viram 1.** depende do 6, então acompanha o corte pra 5. adicionar critério visível (paixão, viabilidade, impacto) como escala no próprio formulário, não só como texto na pílula.

**módulo 8 — ficha viva: entrevista + persona.** entrevista com pessoa real dentro de 22-30 min é otimista. mesmo tratamento do módulo 6: parte em campo declarada, registro curto no app. permitir entrevista por áudio.

**módulo 9 — in/out.** o exercício mais enxuto e mais bem calibrado dos 10. mexer pouco.

**módulo 10 — grava, assiste, regrava.** 25-40 min é honesto, mas gravação de vídeo é o maior ponto de trava emocional do curso. permitir entrega em áudio ou texto falado, e deixar isso explícito antes da gravação.

## o que muda tecnicamente

- ajustes de conteúdo em `module_pills.interaction_schema` dos exercícios e registros dos módulos 1 a 10 (campos, obrigatoriedade, textos, passos), via migração de dados
- ajuste de `duration_min_low/high` dos exercícios e de `total_minutes` dos módulos afetados
- nos componentes de pílula (`PillPBLCorfTriplo`, `PillPBLEstruturado`, `PillGuiaDePrompts`), suporte a campo opcional que não entra na régua de liberação do botão de entregar, e a bloco "quer treinar mais" recolhido por padrão
- nenhuma entrega já enviada é apagada; rascunhos parados continuam válidos e passam a poder ser enviados com os novos critérios

## fora do escopo

- economia circular e módulos 11 a 20 de ia
- mudança na estrutura 4 trilhas × 5 módulos
- mudança nas pílulas de conteúdo (vídeos e texto), exceto onde a instrução do exercício depende delas
