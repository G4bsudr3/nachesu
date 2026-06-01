## o que vou construir

duas frentes independentes mas relacionadas: (1) observabilidade dos convites por email, (2) auto-cadastro pra emails `@edu.sebrae.com.br` com escolha de eletiva no signup.

---

### 1. painel de convites em tempo real (admin)

nova rota `/admin/convites` (link na sidebar admin) com:

- **stats por eletiva** (cards): total de convites, enviados, falhados, suprimidos, ainda na fila, % de claim (logaram)
- **tempo médio de processamento**: diff entre `created_at` do `pending` e do `sent` correspondente, agrupado por eletiva (últimas 24h / 7d / 30d)
- **tabela ao vivo**: últimos 50 sends de `email_send_log` filtrados por `template_name = 'course-invite'`, dedup por `message_id`, colunas: eletiva (parse do metadata), email, status (badge), tempo de processamento, erro. realtime via `supabase.channel('email_send_log')` + invalidate
- **filtros**: por eletiva (dropdown), por status, time range (24h/7d/30d/custom)
- **botão "reenviar pra falhados"** por eletiva (chama `send-course-invites-batch` filtrando só os emails com status `dlq`/`failed`)

queries deduplicam por `DISTINCT ON (message_id)` ordem `created_at DESC`. metadata do send-transactional-email já carrega `course_id` (vou garantir isso no `send-course-invites-batch` se ainda não estiver).

acesso: `<AdminRoute>` que já existe.

---

### 2. lista completa de usuários + permissão automática `@edu.sebrae.com.br`

#### 2a. ver usuários cadastrados
o `AdminUsers.tsx` já existe e usa `admin_list_users()`. vou:
- adicionar coluna "eletiva matriculada" (join com `enrollments` + `courses`)
- adicionar filtro por domínio do email
- adicionar filtro "sem matrícula"
- adicionar busca por email/nome

#### 2b. liberar signup automático pra `@edu.sebrae.com.br`

hoje o fluxo de signup depende de `course_invites` pré-existente pro trigger `claim_course_invites_on_signup` matricular. emails sebrae sem convite prévio caem como `profiles.status = 'pending'` sem matrícula.

mudança:
- **frontend (`Auth.tsx`)**: quando o email termina em `@edu.sebrae.com.br` E não há `course_invites` pra ele (chamo edge function `check-sebrae-eligibility` que retorna `{ allowed: true, has_pre_invite: bool, course_slug?: string }`), mostro um **seletor de eletiva** ("qual eletiva você se inscreveu?" → IA na Prática | Economia Circular) antes do submit
- a escolha vai como `options.data.chosen_course_slug` no `signUp`
- **trigger `handle_new_user`** estendido: se `raw_user_meta_data->>'chosen_course_slug'` está presente E não há convite, cria `enrollment` direto pro curso escolhido e seta `profiles.status = 'active'`. domínio `@edu.sebrae.com.br` é validado no trigger antes de aceitar
- estudante vê **APENAS a eletiva escolhida** — isso já é garantido pelo `enforce_single_active_enrollment` e pelo `MinhasEletivas` que lista só `enrollments` do user

#### 2c. para emails fora do domínio sem convite
mantém comportamento atual (cai em `pending`, admin aprova).

---

### estrutura técnica

**migração** (1 só):
- nova função `get_course_invite_stats(_course_id uuid, _since timestamptz)` → retorna `{ total, sent, failed, suppressed, pending, claimed, avg_processing_ms }` deduplicando por `message_id` do `email_send_log` com `metadata->>'course_id' = _course_id`
- estende `handle_new_user` pra honrar `chosen_course_slug` quando email termina em `@edu.sebrae.com.br`
- nova função `is_sebrae_email(text)` simples

**edge function nova**: `check-sebrae-eligibility` (público, sem JWT) — retorna se o email pode entrar e se tem convite prévio (curso já definido).

**ajuste em `send-course-invites-batch`**: garantir `metadata: { course_id, course_slug }` em todo enqueue (pra o painel agrupar).

**frontend novo**:
- `src/pages/AdminConvites.tsx` (painel)
- `src/features/admin/useCourseInviteStats.ts` (hook com realtime)
- `src/features/admin/InviteStatsCards.tsx`, `InviteLogTable.tsx`
- adicionar rota em `App.tsx` + item na `AdminSidebar.tsx`
- `src/pages/Auth.tsx`: campo seletor condicional + chamada de elegibilidade
- `src/pages/AdminUsers.tsx`: nova coluna eletiva + filtros

---

### perguntas antes de executar

1. **domínio**: confirmo só `@edu.sebrae.com.br`? algum outro domínio sebrae que deva entrar junto (ex: `@sebraemg.com.br`, `@sebrae.com.br`)?
2. **se o estudante sebrae errar a eletiva no signup**, ok deixar admin trocar manualmente em `AdminUsers` (mudando enrollment)? ou quer um fluxo de auto-correção?
3. **realtime no painel**: ok usar supabase realtime no `email_send_log` (já tem RLS, vou habilitar publication se faltar)? alternativa é polling 10s.
4. **rota do painel**: `/admin/convites` ok, ou prefere embutir como aba dentro de `/admin/eletivas`?
