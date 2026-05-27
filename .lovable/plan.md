## fase 2 · perfil 360° do estudante

cria uma página `/admin/aluno/:userId` que junta, num só lugar, tudo que o educador precisa saber pra acompanhar uma pessoa — sem precisar pular entre inbox, turma, tutor e e-mails.

### entregas

**2.1 · rota e shell da página**
- nova rota `/admin/aluno/:userId` (protegida por `AdminRoute`)
- link a partir de:
  - `AdminUsers` (botão "ver perfil" em cada linha)
  - `AdminTurma` (clicar no card do estudante)
  - `AdminFeedbackInbox` (clicar no nome em cima do deliverable)
  - `FeedbackReviewDrawer` (link "ver perfil completo" no header)
- header com foto/iniciais, nome, nickname, e-mail, status (`profiles.status`), papéis, data de entrada, matrículas ativas (`enrollments` + `courses.title`) e botão "resetar senha" reaproveitando `admin-reset-password`

**2.2 · painel de progresso por curso**
- pra cada `enrollments` ativa, mostrar:
  - % de módulos liberados que foram concluídos (`module_progress` × `module_releases`)
  - última atividade (max `module_progress.updated_at` ou `module_deliverables.updated_at`)
  - sinal de risco: sem atividade há ≥ N dias (reusa lógica de `check-student-evasion`, sem disparar nudge)
  - link "ver módulo atual"

**2.3 · histórico de entregas e feedback**
- timeline reversa de `module_deliverables` do estudante: módulo, status (pill já existente), `submitted_at`, `reviewed_at`, verdict
- cada item expande inline a thread (`deliverable_messages`) reaproveitando `useDeliverableThread` em modo read-only + ação "abrir drawer de revisão" (`FeedbackReviewDrawer`)
- indicador "feedback lido há X" (`content.feedback_read_at`)

**2.4 · transcrições do tutor IA**
- lista de `tutor_conversations` do estudante (já tem RLS admin SELECT), agrupadas por trilha
- expandir → renderiza `messages` jsonb em bolhas (markdown leve), sem permitir edição
- contador de mensagens, última interação, primeira pergunta da sessão
- escopo desta fase: somente `tutor_trail-chat` (TutorChat). `chora_bot_messages` fica fora porque é fluxo legado atrás da flag `eletiva_extras_enabled`

**2.5 · histórico de comunicação**
- últimos itens de `evasion_nudges` (data, nível, dias inativos)
- últimos `notifications` enviadas pra esse user (`target_id` quando aplicável)
- últimos `email_send_log` com `metadata->>'user_id' = :userId` ou `recipient_email = profile.email`

**2.6 · notas internas do educador (opcional, leve)**
- nova tabela `admin_student_notes` (id, user_id, author_id, body_md, created_at, updated_at) — só admin lê/escreve
- input curto com markdown, lista cronológica no fim da página
- notificação interna não dispara nada pro estudante (zero risco de vazamento)

### detalhes técnicos

**migrations**
- `CREATE TABLE public.admin_student_notes (...)` + GRANTs (`authenticated`, `service_role`) + RLS com `has_role(auth.uid(), 'admin')` em todas as policies
- nenhum schema novo além disso. `tutor_conversations`, `module_deliverables`, `notifications`, `email_send_log`, `evasion_nudges` já têm SELECT pra admin

**hooks novos (em `src/features/admin/`)**
- `useStudentProfile(userId)` — junta `profiles`, `user_roles`, `enrollments`, `courses`
- `useStudentProgress(userId)` — `module_progress` + `module_releases` por curso
- `useStudentDeliverables(userId)` — lista + status, reaproveita tipos de `usePendingDeliverables`
- `useStudentTutorConversations(userId)` — `tutor_conversations` agrupadas por trilha
- `useStudentCommunication(userId)` — `evasion_nudges` + `notifications` + `email_send_log`
- `useAdminStudentNotes(userId)` — CRUD da tabela nova

**componentes novos (em `src/features/admin/studentProfile/`)**
- `StudentProfileHeader.tsx`
- `StudentProgressPanel.tsx`
- `StudentDeliverableTimeline.tsx` (reusa `DeliverableStatusPill`, `FeedbackMarkdown`, `FeedbackReviewDrawer`)
- `StudentTutorTranscripts.tsx`
- `StudentCommunicationLog.tsx`
- `StudentInternalNotes.tsx`
- `AdminStudentProfile.tsx` (page, monta tudo)

**arquivos tocados**
- `src/App.tsx` (rota nova)
- `src/pages/AdminUsers.tsx` (link "ver perfil")
- `src/features/admin/AdminFeedbackInbox.tsx` (nome do estudante vira link)
- `src/features/admin/FeedbackReviewDrawer.tsx` (link "ver perfil completo")
- `src/pages/AdminTurma.tsx` (card do estudante vira link)

### fora desta fase
- mensagens manuais do admin pro estudante e templates editáveis de nudge → fase 3 (custom communication)
- rubrica configurável e AI-draft de feedback → fase 4
- unificação tutor / chora-bot → fase 5

### ordem de implementação
1. migration `admin_student_notes` (uma só) → aguardar aprovação
2. hooks (`useStudentProfile`, `useStudentProgress`, `useStudentDeliverables`, `useStudentTutorConversations`, `useStudentCommunication`, `useAdminStudentNotes`)
3. componentes da página + rota nova
4. links de entrada (`AdminUsers`, `AdminTurma`, `AdminFeedbackInbox`, `FeedbackReviewDrawer`)
5. notas internas (`StudentInternalNotes`)
6. teste end-to-end: abrir um estudante real, abrir um deliverable a partir da timeline, abrir thread, conferir transcrição do tutor, adicionar nota interna

posso seguir?