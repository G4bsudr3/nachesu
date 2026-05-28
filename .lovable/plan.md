## o que vai acontecer

### 1. reset do `mateusfrattezi@gmail.com` (user_id `04bd3c2b…`)

mantém a conta e as 2 matrículas (IA + Economia Circular). apaga todo o histórico de uso pra você refazer a jornada do zero. tabelas afetadas (todas filtradas por `user_id`):

- `student_pill_progress` — pílulas concluídas
- `student_module_progress` — progresso por módulo
- `module_deliverables` (+ `deliverable_messages` em cascata) — entregas e feedbacks
- `tutor_conversations`, `tutor_message_events`, `tutor_daily_counters`, `tutor_safety_events`, `tutor_safety_escalations` — histórico do tutor IA
- `notifications` — notificações acumuladas
- `prework_progress`, `tutorial_progress`, `tutorial_idea` — onboarding/tutorial
- `student_alerts`, `student_engagement_risk` — sinais do admin
- `fbi_responses` (legado, se houver) — limpa só desse user
- `profiles.tutor_consent_at` → `null` pra reaparecer o modal de consentimento do tutor

as 2 linhas de `enrollments` ficam intactas (active nas duas eletivas).

### 2. cadastro do `frattz@naches.app` na eletiva IA na Prática

cria 1 linha em `course_invites` (`email_normalized = frattz@naches.app`, course = `ia-na-pratica`). assim, quando você fizer signup com esse e-mail, o trigger `claim_course_invites_on_signup` matricula automaticamente.

### 3. cadastro do `mateus.frattz@edu.sebrae.com.br` na eletiva Economia Circular

mesma coisa: 1 linha em `course_invites` apontando pra `economia-circular`. signup vai matricular automático.

### como fazer login depois

abre `/auth`, pede magic link com o e-mail novo, clica no link que chega, conta é criada e a matrícula é reivindicada na hora.

---

## confirmações antes de executar

1. **enrollments do mateusfrattezi@gmail.com**: você quer manter as 2 matrículas ativas (IA + Economia) pra alternar na jornada, ou quer deixar só uma?
2. **builder_cards / archetype** do mateusfrattezi: é fluxo legado Chŏra atrás de flag, normalmente não aparece pro estudante NachesU. posso ignorar (não mexer) ou limpar junto. sugiro **ignorar**.
3. **conta auth do mateusfrattezi**: mantenho o user `auth.users` (e a senha, se tiver) ou você prefere apagar a conta inteira pra refazer signup do zero? sugiro **manter a conta** e só zerar o progresso, é mais rápido.

me confirma esses 3 pontos (ou só fala "pode seguir o sugerido") que eu executo.