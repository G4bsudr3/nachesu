## fase 3 · comunicação personalizada (implementada)

mensagens manuais educador→estudante e templates de nudge editáveis pelo admin.

### entregas

**3.1 · mensagens diretas**
- tabela `admin_messages` (subject, body_md, link, email_sent, read_at, notification_id)
- edge function `send-admin-message` (admin-only, valida role; cria notification + opcional e-mail)
- novo enum de notification `admin_direct_message`
- template transacional `admin-direct-message` (markdown leve: bold, itálico, link)
- composer dentro do `/admin/aluno/:userId` com histórico das últimas 30 mensagens

**3.2 · nudge templates editáveis**
- tabela `nudge_templates` com 3 níveis seedados (medium/high/lost)
- interpolação `{nome}`, `{curso}`, `{professor}`, `{dias}` em runtime
- `check-student-evasion` agora lê templates do banco (fallback pra copy hardcoded se vazio)
- e-mail dos nudges roteado pro template `admin-direct-message` quando há template no banco
- editor `AdminNudgeTemplates` em nova tab `nudges` no admin

### arquivos novos
- `supabase/functions/send-admin-message/index.ts`
- `supabase/functions/_shared/transactional-email-templates/admin-direct-message.tsx`
- `src/features/admin/useNudgeTemplates.ts`
- `src/features/admin/AdminNudgeTemplates.tsx`
- `src/features/admin/studentProfile/useAdminMessages.ts`
- `src/features/admin/studentProfile/StudentMessageComposer.tsx`

### arquivos tocados
- migration: tabelas + enum value + seeds
- `registry.ts` (template novo)
- `check-student-evasion/index.ts` (lê templates + interpola)
- `AdminStudentProfile.tsx` (seção mensagem direta)
- `AdminFbi.tsx` (tab nudges)

## fase 4 · rubrica configurável + AI-draft (implementada)

editor passou de chips hardcoded pra rubricas editáveis, com rascunho de feedback assistido por IA respeitando tom Naches.

### entregas
- tabela `rubrics` (slug, name, description, is_default, criteria jsonb) + `modules.rubric_id`
- rubrica padrão "geral" seedada com os 5 chips originais
- editor `AdminRubrics` em nova tab `rubricas` (CRUD + descrição por critério)
- `FeedbackReviewDrawer` carrega rubrica do módulo (ou default) e renderiza chips dinâmicos com tooltip
- edge function `draft-deliverable-feedback` (admin-only): lê entrega + rubrica + módulo, chama Lovable AI (gemini-3-flash-preview, tool calling), devolve `{ draft_md, suggested_tags }`
- botão "rascunhar com IA" no drawer: preenche feedback (com confirm se já tiver texto), abre preview, mescla tags sugeridas válidas

### arquivos novos
- `supabase/functions/draft-deliverable-feedback/index.ts`
- `src/features/admin/useRubrics.ts`
- `src/features/admin/AdminRubrics.tsx`

### arquivos tocados
- migration: tabela `rubrics`, coluna `modules.rubric_id`, seed default
- `FeedbackReviewDrawer.tsx` (chips dinâmicos + handler IA)
- `AdminFbi.tsx` (tab nudges/rubricas)

### próximas fases pendentes
- fase 5: unificação tutor / chora-bot
