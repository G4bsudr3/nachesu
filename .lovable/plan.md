# revisão crítica — o que falta de altíssimo impacto

o estado atual (pós-onda 1): materiais escopados, deliverable rascunho→enviado→revisado, EletivaHome atualizada, fila de revisão pro educador, tutor com pílulas da sessão. boa base. o que falta agora não é "feature a mais", é **fechar 3 ciclos quebrados** que comprometem a tese do produto.

ranqueei por impacto/esforço, não pela ordem original do plan.md.

---

## 1. detecção de evasão + nudge do joão-de-barro  *(maior alavanca isolada)*

**problema:** estudante de 14-15 anos, eletiva 100% assíncrona, 20 semanas. some 14 dias e nada acontece. esse é o **principal vetor de mortalidade** de qualquer LMS assíncrono pra adolescente — é literalmente o que diferencia 30% de conclusão de 70%.

**hoje:** zero detecção, zero e-mail, zero alerta pro educador. `daysSinceLastActivity` só vive no dashboard do próprio aluno (quem não abre não vê).

**o que entra:**

- view `student_engagement_risk` (low/medium/high baseada em dias parado + módulo atrasado vs `release_at` esperado).
- edge function diária `check-student-evasion` chamada por cron (pg_cron) que dispara e-mail acolhedor assinado pelo joão-de-barro a partir do dia 7, escalando texto no dia 14 e 21. tom: "senti falta", nunca "você está atrasado".
- bloco "alunos em risco" no admin (substitui o AdminStats stub) com filtro por eletiva, lista nome + dias parados + último módulo + botão "abrir conversa por e-mail".
- opt-out simples (link unsubscribe respeitado).

**por que primeiro:** salva matrícula. nada do que vier depois importa se metade da turma evade na semana 4.

---

## 2. notificações in-app + closing the loop do feedback do educador

**problema:** o ciclo "aluno entrega → educador revisa → aluno volta e lê" hoje só fecha se o aluno reabrir o módulo por conta própria. devolutiva sem notificação é devolutiva que ninguém leu, e o aluno reaprende que "ninguém revisa mesmo".

**hoje:** zero camada de notificação. Realtime está em `module_deliverables` mas só funciona com a aba aberta no módulo certo.

**o que entra:**

- tabela `notifications` (user_id, kind, title, body, link, read_at).
- triggers: educador marca revisado → notifica aluno. admin libera módulo novo → notifica turma. tutor não notifica.
- bell no `PageHeader` com badge não-lidas + dropdown últimas 10 + página `/app/notificacoes`.
- e-mail transacional opcional só pra "educador respondeu" (não pra cada release, vira spam).

**por que segundo:** transforma a fila de revisão recém-feita em algo que o aluno **vê**. sem isso, a onda 1 vira árvore caindo em floresta vazia.

---

## 3. release_at + cadência semanal visível

**problema:** estudante não tem **expectativa temporal**. quando fecha o módulo 3, vê "módulo 4 abre quando fechar o anterior" — mas já fechou. ou vê módulo bloqueado sem saber quando abre. resultado: ou atropela tudo num fim de semana (perde efeito da assincronia distribuída de 20 semanas) ou acha que travou.

**hoje:** `module_releases.release_at` existe na tabela, **não aparece em lugar nenhum na UI**. EletivaHome mostra liberado/bloqueado, não quando.

**o que entra:**

- card de módulo bloqueado mostra "abre {data} ({n} dias)" quando `release_at > now()`.
- dashboard mostra estimativa da semana: "essa semana você tem ~50 min" (somando `total_minutes` dos módulos com release na semana corrente).
- pílula "próximo módulo abre em X" no card da eletiva quando aluno já completou tudo disponível.
- respeita lógica dupla: precisa estar liberado por release_at **e** sequencial.

**por que terceiro:** define o **ritmo do produto**. baixo esforço técnico (campo já existe), altíssimo retorno pedagógico.

---

## 4. dashboard de turma pro educador  *(o admin que falta)*

**problema:** Dudu e frattz hoje conseguem ver fila de revisão e stats globais. não conseguem ver **uma turma** ("quem da Adm 2026 está em risco? quem completou trilha 2?"). pra educador que quer agir, isso é o painel.

**hoje:** AdminStats é genérico, AdminUsers é cru, sem corte por eletiva/turma + estado.

**o que entra:**

- página `/admin/turma/:courseId` com 4 blocos:
  1. matriculados ativos + concluintes por trilha (barra de progresso)
  2. alunos em risco (vem do item 1)
  3. tempo médio real x estimado por módulo (já temos started_at/completed_at)
  4. entregas aguardando revisão (link pra fila já existente)
- export csv simples pra reunião com escola Sebrae.

**por que quarto:** mais alavanca do **admin** sem ser feature de aluno. fecha o lado institucional que a parceria com Sebrae exige (item "ab" do plan).

---

## 5. fim de trilha como signature moment

**problema:** ao fechar módulo 5 (fim trilha 1 "fundamentos") e abrir o 6 (trilha 2 "problema & decisão"), nada acontece. é o **momento natural** pra reflexão arcada e antecipação, e é onde a narrativa pedagógica vive. perder isso é perder o que diferencia NachesU de "lista de aulas".

**hoje:** zero marco. próximo módulo abre igual a qualquer outro.

**o que entra:**

- tela curta `/app/eletiva/:slug/marco/:trail` que aparece automaticamente entre módulo 5↔6, 10↔11, 15↔16, 20↔fim.
- conteúdo: "trilha {n} fechada. o que mudou em você nessas 5 semanas?" (campo livre, opcional, salvo) + preview narrativo da próxima trilha + joão-de-barro em pose `celebrating`.
- bloqueia 1 vez só (flag em `student_module_progress` ou tabela `trail_milestones`).
- ao fim das 4 trilhas → encaminha pro deliverable final + certificado (gancho pra futura onda).

**por que quinto:** é o signature moment do produto. sozinho não salva ninguém, mas é o que faz lembrar da NachesU 6 meses depois.

---

## o que **não** entra agora (e por quê)

- **rubrica IA no submit (item l do plan):** alto risco de virar julgamento moral pra adolescente, precisa pesquisa de copy antes. adiar.
- **diário consolidado (item n):** legal, mas só importa se o aluno chegar até lá — itens 1/2 garantem isso primeiro.
- **PWA offline:** real, mas só vale a pena depois de validar que existe uso recorrente.
- **quiz com feedback formativo:** só relevante se quiz estiver sendo de fato usado nas pílulas — verificar uso antes.
- **EletivaHome refatorada vs eliminada:** decisão de produto pendente da pergunta 4 do plan, não tem ainda uma versão certa.

---

## ordem proposta de execução

se for pra fazer tudo: 1 → 2 → 3 → 4 → 5 (mais ou menos 4 loops, evasão e notificações são os maiores; release_at e signature moment são curtos).

se for pra fazer só **um**: **1 (evasão)**. é o único que muda a curva de conclusão da eletiva.

se for pra fazer só **dois**: **1 + 2**. evasão + notificações se reforçam: o aluno que volta por e-mail precisa achar a devolutiva esperando.

---

## perguntas antes de executar

1. **qual o escopo deste loop**: faço só o item 1 (detecção de evasão completa, com edge function + cron + e-mail + admin de risco), faço 1+2 juntos (evasão + notificações, ciclo fechado), ou faço 1+2+3 (já entra cadência visível também)? R: faça o que der e deixe engatilhado o que faltar.
2. **tom do e-mail do joão-de-barro**: preciso confirmar que você quer assinatura do tutor (mascote, terceira pessoa "o joão sentiu sua falta") ou do educador da eletiva (Dudu/frattz). muda tudo. R: melhor Dudu ou frattz.
3. **gatilho de release_at na UI**: hoje todos os 20 módulos da eletiva têm release_at preenchido com cadência semanal real, ou só os primeiros? se faltar, faço uma migration simples preenchendo a cadência padrão. R: na verdade nem vai precisar dessa cadência semanal, terão vezes que serão disponibilizadas mais de uma aula por semana.