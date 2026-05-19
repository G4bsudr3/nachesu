
# revisão pedagógica — nachesu

leitura do produto como **eletiva online assíncrona** de 20 semanas pra estudante de 1º ano EM (14-15 anos), mobile-first, com PBL como espinha. abaixo: o que está bom, onde fura, e proposta de correção em ondas.

---

## 1. o fluxo faz sentido?

### o que está bom
- hierarquia limpa: dashboard → eletiva → módulo. um próximo passo único.
- switcher só aparece com 2+ matrículas. matrícula única bloqueada por trigger (já implementada).
- desbloqueio sequencial garante ritmo semanal sem precisar de calendário rígido.
- mascote (joão-de-barro) com 6 poses dá personalidade sem virar Duolingo genérico.

### onde fura (ordenado por impacto pedagógico)

**a. ritmo da eletiva não está visível.** o estudante não sabe "estou no módulo 3 da semana 3, esperado". não tem cadência semanal exposta, nem o `available_from` aparece como expectativa ("o próximo abre em 4 dias"). resultado: aluno pode achar que travou ou pode atropelar tudo em um fim de semana e perder o efeito da assincronia distribuída.

**b. desbloqueio é só sequencial — não respeita janela temporal.** se o admin libera 5 módulos de uma vez por erro de operação, o aluno faz tudo num dia. e se admin atrasa um release, o aluno vê só "esse abre quando você fechar o anterior", sem data prevista. precisa combinar `module_releases.release_at` + sequencial.

**c. trilhas existem na arquitetura mas estão escondidas como atalho.** o aluno entra no módulo 7 sem entender que ele faz parte da trilha 2 "problema & decisão" e que esse é o arco que vai durar 5 semanas. tem `trail` no `ModuloHeader` mas falta uma página de trilha (não só /trilhas que é o mapa inteiro frio) que ensine o arco narrativo: "agora você está entendendo. nos próximos 5 módulos…"

**d. EletivaHome é página fantasma.** o dashboard já tem o CTA do próximo módulo. quem cai em /app/eletiva/:slug vê: hero + próximo passo + 3 atalhos. duplica o dashboard sem agregar nada novo. ou ela vira **a tela da eletiva ativa** (mapa de 20 + arcos das 4 trilhas + diário/anotações + tutor + materiais escopados) e o dashboard fica raso, ou ela some.

**e. transição entre módulos não celebra fim de trilha.** ao terminar módulo 5 (fim da trilha 1) e abrir o 6 (trilha 2), nada acontece. perda enorme de momento pedagógico — é a hora natural pra reflexão arcada ("o que mudou pra você nessas 5 semanas?") e antecipação ("agora você vai…"). signature moment óbvio que não está sendo capturado.

**f. mobile-first declarado, mas tutor é sheet lateral que ocupa tela inteira sem permitir ver o exercício PBL ao mesmo tempo.** estudante perde o briefing enquanto pergunta. fix: tutor abre como bottom-sheet ~70vh com o pill briefing fixo no header.

---

## 2. tem inteligência adequada pra entender o uso?

### o que tem
- `student_pill_progress` e `student_module_progress` (started/completed timestamps).
- `daysSinceLastActivity` calculado no dashboard.
- tutor tem contexto de "módulos concluídos" e "em andamento" da trilha.

### o que falta (crítico pra produto educacional assíncrono)

**g. zero detecção de evasão.** aluno some 14 dias e não acontece nada — sem e-mail, sem notificação, sem alerta pro educador. pra produto assíncrono isso é o principal vetor de mortalidade. precisa de:
- job semanal que olha `daysSinceLastActivity` por aluno x eletiva
- e-mail transacional do tutor (joão-de-barro) com tom acolhedor, não cobrança
- dashboard admin de "alunos em risco" (já tem stub de AdminStats, falta a view de risco)

**h. tempo real x tempo estimado não é coletado.** módulo diz "50 min" mas não sabemos se o aluno típico fez em 25 ou 90. sem isso, impossível calibrar a próxima geração de módulos. já temos started_at/completed_at — só falta uma view materializada e um relatório admin.

**i. tutor não sabe que pílulas o aluno já fez no módulo atual.** o contexto enviado é só "módulos concluídos da trilha", não "pílulas vistas no módulo em andamento". então tutor pode explicar algo que o aluno acabou de assistir. enriquecer `buildTrailContext` com pílulas da sessão atual.

**j. nada captura "onde o aluno trava".** se aluno abre módulo 8 e fica 4 dias sem fechar, ninguém sabe se foi pílula B (vídeo) ou o PBL. precisa de evento simples `pill_opened_at` (não só completed) e um indicador "tempo médio entre abrir e concluir" por pílula. comportamento padrão em LMS sério, falta aqui.

**k. reações/comentários em materiais existem; em pílulas e módulos não.** se uma pílula confunde 40% da turma, ninguém descobre até o fim da eletiva.

---

## 3. validação dos exercícios está coerente?

### como está hoje
- pílulas de conteúdo passivo: marca manual (botão "marcar")
- `PillReflection`: auto-conclui em 60 chars
- `PillPBL`: auto-conclui em 80 chars
- módulo se conclui automaticamente quando todas as pílulas `required` estão fechadas
- `module_deliverables.status` vai pra "enviado" automaticamente, mas não tem fluxo de review visível pro aluno

### onde fura

**l. critério 60/80 chars é cosmético, não pedagógico.** "estou cansado e quero terminar" tem 33 chars. "fui na padaria comprar pão acho que o exercício foi legal blablabla" tem 80 e zero substância. proposta:
- contagem mínima continua como sinal fraco
- adicionar **rubrica leve via IA** no momento de marcar como concluído: chamada ao Gateway que devolve 1 de 3 estados (incompleto / superficial / consistente) com microfeedback de 1 frase. não bloqueia, só sugere. respeita "make failure feel safe".
- educador vê na review o estado da IA + texto bruto.

**m. registro de "enviado" sem ciclo de devolutiva é vácuo.** se o educador nunca devolve nada, o aluno aprende que ninguém lê. precisa:
- estado visível no módulo: rascunho → enviado → revisado (com data + 1 frase do educador)
- tela do educador pra revisar lote por turma (Dudu e frattz não vão revisar 100 alunos individualmente, então: revisar em lote por trilha, comentário pode ser coletivo ou individual)
- notificação leve ("seu educador respondeu seu registro do módulo 3")

**n. não tem como o aluno revisar a própria resposta consolidada.** ele escreveu reflexões em 20 módulos e não tem uma página "meu diário da eletiva" — texto solto fica preso dentro de cada módulo. proposta: `/app/eletiva/:slug/diario` que agrupa registros + PBLs por trilha. isso vira material pra recuperar pra prova de pitch final.

**o. exercício PBL não tem entrega tangível final.** project knowledge diz "Mini-Dossiê de Negócio Regenerativo + pitch 2-3 min" pra econ. circular e "link do projeto V-final + pitch + reflexão" pra IA. nada disso aparece como um deliverable estruturado no fluxo. tem `module_deliverables` por módulo, mas não tem `course_deliverable` (entrega final certificada).

**p. quiz/radar/curated_content_with_questions** existem como tipos de schema rico, mas não há feedback formativo no momento — só salva. quiz sem mostrar gabarito imediato é antieducacional pra 14-15 anos. confirmar comportamento atual; se for "salvou e seguiu", adicionar feedback contextual (correto/quase/refaça) sem virar prova.

---

## 4. materiais de referência em diferentes formatos

### o que está bom
- `/app/hub/materiais` aceita pdf, slides, link, vídeo, imagem, doc
- drawer com preview embed pra youtube/pdf/gslides
- categorias (apresentação, leitura, referência, ferramenta, vídeo, outro)
- thumbnail auto + bagde "novo" 7d
- reações + comentários por material

### onde fura

**q. materiais não estão escopados por eletiva no UI.** o hook `useHubMaterials` aceita `courseId`, mas `/app/hub/materiais` chama sem passar. então o estudante de econ. circular vê os materiais de IA misturados. **bug grave de coerência pedagógica** — mesmo problema que motivou o refactor de scope check nos módulos. fix de 1 linha.

**r. materiais não estão amarrados a módulos/trilhas.** material existe no plano "hub", solto. o aluno terminando o módulo 7 não vê "leituras complementares desse módulo". propor relação opcional `material -> module_id | trail_id | course_id` (3 níveis) e renderizar no rodapé do módulo + na trilha + no hub. infra já permite (campo `course_id` existe; basta adicionar `trail_id` e `module_id`).

**s. nada distingue "obrigatório" de "complementar".** numa eletiva de 50min/semana, se o aluno achar que precisa ler 200 páginas, desiste. precisa de toggle `is_required` ou `priority` (essencial/aprofundar/opcional) visível no card.

**t. drawer perde estado de leitura.** abriu um PDF, leu metade, fechou — não há "continuar de onde parou" nem "li isso". simples bool `material_read[material_id]` por user faria milagre na sensação de progresso.

**u. material em áudio/podcast não tem tratamento.** detectKind reconhece vídeo mas não mp3/spotify. pra estudantes que estudam no ônibus, perda real.

**v. nenhuma forma do educador postar material no contexto de uma pílula durante a semana.** se Dudu quer mandar "essa reportagem saiu hoje e cabe no módulo 4", ele precisa subir no admin global. proposta: do próprio admin do módulo, "anexar material a este módulo" puxando do bucket ou colando link.

---

## 5. o que mais falta?

**w. resposta "errada" segura.** nenhum lugar mostra erro de forma acolhedora hoje. o quiz que existe não tem o tratamento "tente de novo, vamos pensar juntos". projeto educacional pra adolescente exige isso.

**x. estimativa de duração agregada da semana.** dashboard não diz "essa semana você tem ~50 min de eletiva". só mostra o próximo módulo. juntar `total_minutes` dos módulos disponíveis na semana corrente.

**y. notificações in-app.** zero. nenhum "módulo novo liberado", nenhum "tutor respondeu", nenhum "educador devolveu". precisa de uma camada mínima — bell no PageHeader + tabela `notifications`.

**z. accessibility / motion-safe.** maior parte respeita, mas o player de vídeo lite-youtube e algumas animações framer não checam `prefers-reduced-motion`. auditoria.

**aa. PWA / offline mínimo.** estudante no ônibus sem 4G perde a aula. ao menos cache de pílulas-texto e PDFs essenciais.

**ab. parental/visibilidade institucional.** menores de idade. educador da escola precisa de uma view de turma com progresso por aluno + alertas (já mencionado em "g", "m").

**ac. tom de voz inconsistente em pílulas legadas usa "tu".** já documentado no plan.md anterior. passe de copy.

**ad. certificado final.** existe a infra legada Chŏra (certificado), mas não está conectada ao fluxo NachesU. completou os 20 módulos e entregou o deliverable final → emite. hoje, ao fechar o módulo 20, nada acontece.

---

## 6. o que é desnecessário / desativar

- **EletivaHome** como página separada do dashboard. ou vira a verdadeira "casa da eletiva ativa" (com diário, mapa, materiais escopados, tutor) ou some. duplicação atual confunde.
- **`/app/hub` como conceito**: já redireciona, ok. mas `/app/hub/materiais` continua exposto. mover pra `/app/eletiva/:slug/materiais` reforça escopo.
- **toda área legado Chŏra** (FBI, carta, projeto, votação, álbum, builder card, missões, prework, tutorial, feedback final, futureLetter): vivem atrás de flag — manter atrás de flag e remover dos menus default. já está, mas conferir que não vaza no mobile nav nem em settings.
- **arquétipos/cartas de builder** como conceito visível pro estudante NachesU: confunde. manter infra (já existe), mas não promover na jornada nachesu sem decisão explícita.

---

## proposta em ondas

### onda 1 — coerência (1 sprint, alta prioridade pedagógica)
1. escopar materiais por eletiva ativa no UI (`HubMateriais` passa `courseId`).
2. mostrar `release_at` previsto na tela de "módulo travado".
3. cadência da semana no dashboard (próximo módulo + estimativa total).
4. tutor recebe pílulas-da-sessão no contexto.
5. estados visíveis de entrega: rascunho → enviado → revisado (mesmo que review ainda não exista).
6. transição de fim de trilha: tela curta de marco entre módulo 5↔6, 10↔11, 15↔16.

### onda 2 — inteligência (1 sprint)
7. tabela `student_pill_events` (opened_at, completed_at) — base pra analytics.
8. job semanal de detecção de evasão + e-mail acolhedor do joão-de-barro.
9. dashboard educador "turma agora": progresso, alunos em risco, tempo médio.
10. revisão em lote dos deliverables.
11. rubrica leve via Lovable AI no submit (não bloqueia, sugere).

### onda 3 — profundidade pedagógica (1-2 sprints)
12. `/app/eletiva/:slug/diario` — diário consolidado.
13. materiais atrelados a módulo/trilha + priority (essencial/aprofundar/opcional).
14. notificações in-app.
15. fim de eletiva → deliverable final estruturado → certificado.
16. quiz com feedback formativo.
17. áudio/podcast como tipo de material.

### onda 4 — polimento
18. EletivaHome refatorada (ou eliminada).
19. PWA offline mínimo.
20. Auditoria a11y + reduced-motion completa.
21. Passe de copy "tu→você" nas pílulas de econ. circ.

---

## perguntas antes de qualquer implementação

1. **escopo deste loop**: você quer que eu já implemente a **onda 1** inteira (são 6 itens curtos, alta densidade pedagógica) ou prefere validar essa leitura primeiro e abrir os itens em loops separados?
2. **deliverable final + certificado**: confirmar que o entregável final dos cursos é "mini-dossiê + pitch" (econ. circ.) e "link do projeto + pitch + reflexão" (ia na prática) — quero modelar a tabela final em cima disso.
3. **alertas de evasão e revisão dos educadores**: Dudu e frattz vão revisar individualmente, em lote por turma, ou só consumir o "alunos em risco"? muda muito o produto admin.
4. **EletivaHome**: descontinuar e fortalecer o dashboard, ou transformá-la na "casa da eletiva ativa" com diário/materiais escopados/tutor (e dashboard fica mais raso)?
