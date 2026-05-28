## escopo

instrumentar o tutor IA pra ter dados, dar controle pro admin e refinar a experiência do estudante. nada de RAG, nada de mexer em `tutor_conversations` (segue sendo a fonte de histórico).

## diagnóstico do código atual

- **edge function `tutor-trail-chat`** já recebe `trail_id`, `module_id`, `pill_prompt`, `pill_title`, stream-proxy do Gemini Flash, persiste em `tutor_conversations` (linhas 388-397). bom ponto pra adicionar logging + gating.
- **duas superfícies** consomem essa função:
  1. `src/pages/TutorPage.tsx` (full-page, trilha switcher, sem contexto de pílula).
  2. `src/components/eletiva/TutorChat.tsx` (Sheet dentro do módulo, com `pillContext` + `moduleId`).
- **`tutor_conversations`** é jsonb único por (user_id, trail_id). zero granularidade por troca.
- **`AdminTutor.tsx`** (223 linhas) lê tudo de `tutor_conversations`, agrega no client. nenhuma métrica de latência, modelo, off-scope ou rating.
- **zero controles operacionais**: sem kill switch, sem limite por aluno, sem addon de system prompt, sem troca de modelo.

## backend (1 migração + 2 funções novas + 1 edit)

### nova tabela `tutor_message_events`

1 linha por troca user→tutor. campos: `id uuid pk`, `user_id uuid`, `course_id uuid null`, `trail_id uuid`, `module_id uuid null`, `pill_title text null`, `user_chars int`, `assistant_chars int`, `tokens_estimate int` (chars/4), `latency_ms int`, `off_scope bool` (heurística por regex), `helpful smallint null` (1=👍 / -1=👎), `created_at timestamptz default now()`. índices: `(created_at desc)`, `(trail_id, created_at desc)`, `(user_id, created_at desc)`.

RLS: SELECT só admin. INSERT/UPDATE só service_role (escrito pela edge function). GRANT a `authenticated` (SELECT) + `service_role` (ALL).

### nova tabela `tutor_settings` (singleton id=1)

`id int pk default 1 check (id=1)`, `enabled bool default true`, `per_user_daily_limit int default 50` (0 = sem limite), `model text default 'google/gemini-2.5-flash'`, `system_prompt_addon text null`, `updated_by uuid null`, `updated_at timestamptz default now()`. RLS: SELECT a `authenticated` (o cliente precisa ler `enabled` pra renderizar avisos), UPDATE só admin via `has_role`. seed inicial via INSERT na migration.

### edição `supabase/functions/tutor-trail-chat/index.ts`

- no início: carrega `tutor_settings`. se `enabled=false` → 503 `{ error: "tutor pausado pela equipe" }`.
- se `per_user_daily_limit > 0`: conta `tutor_message_events` do `user_id` desde 00:00 (timezone BRT). se ≥ limite → 429 com `retry_after = amanhã`.
- usa `tutor_settings.model` (fallback pro hardcoded atual).
- se `tutor_settings.system_prompt_addon` não null, concatena no final do system prompt.
- mede `t0 = Date.now()` antes do fetch, `latency_ms = Date.now() - t0` no `finally`.
- detecta off-scope com regex simples na resposta: `/foge\s+um\s+pouco\s+daqui|isso aí o .+ resolve melhor/i` (frases canônicas do prompt).
- no `finally` (depois do upsert em `tutor_conversations`), faz `admin.from('tutor_message_events').insert({...})` com tudo.

### nova edge function `tutor-rate-message`

POST `{ trail_id, helpful: 1 | -1 | null }`. valida JWT, busca o evento mais recente do user nessa trilha (últimos 10 min), `update helpful = ?`. retorna `{ ok: true }`. `verify_jwt = false` (validação manual no código).

### nova edge function `tutor-admin-digest`

POST `{}` (só admin). lê últimos 7d de `tutor_message_events` + agrega top trilhas + top alunos + amostra de 200 últimas mensagens de usuário (via `tutor_conversations.messages` filtrado por `updated_at`). chama `google/gemini-2.5-flash` via Lovable AI Gateway com prompt: "extrai 5 dores recorrentes, 3 sinais de frustração, 2 oportunidades pedagógicas". cacheia em `admin_insights` com `scope='tutor:7d'`. usa a tabela `admin_insights` existente (não cria nova).

## frontend estudante

### `src/components/chora-bot/TutorStarterPrompts.tsx`

chips contextuais baseados em `pillTitle` / módulo atual. exemplos:
- "me explica de outro jeito a pílula b"
- "me dá 1 exemplo curto"
- "tô travado, e agora?"
- "valida meu raciocínio: ..."

3-4 chips, click prefilla o input.

### `src/components/chora-bot/TutorMessageActions.tsx`

inline em cada resposta do tutor: copiar (`Copy` lucide), 👍, 👎 (envia POST pra `tutor-rate-message`, mostra estado selecionado, idempotente). usa toast discreto.

### `src/components/chora-bot/TutorContextChip.tsx`

barrinha entre header e mensagens: "o tutor sabe que você tá em **módulo 03 · pílula b**". some quando não tem contexto.

### `src/components/chora-bot/TutorUsageChip.tsx`

no header da Sheet/página: "12/50 hoje" vindo de hook `useTutorUsage()` (query simples em `tutor_message_events` filtrada por user + hoje). some quando `per_user_daily_limit = 0`. fica vermelho quando >80%.

### `src/components/chora-bot/TutorDisabledNotice.tsx`

quando `tutor_settings.enabled = false`, substitui o input por um aviso editorial: "o tutor tá pausado agora. avisa o educador se precisar".

### edits em `TutorPage.tsx` e `TutorChat.tsx`

ambos consomem os componentes acima. hook compartilhado novo:
- `src/hooks/useTutorSettings.ts` (query simples a `tutor_settings`, cache 5min).
- `src/hooks/useTutorUsage.ts` (count em `tutor_message_events` do user no dia).

## frontend admin

### `src/pages/AdminTutor.tsx` (página dedicada, substitui `AdminTutor.tsx` legado)

acessível via `/admin/tutor` (já existe no sidebar). 4 seções:

1. **KPI bar** (4 cards): perguntas 7d, alunos únicos 7d, % com 👍, latência mediana.
2. **AI digest** (lê `admin_insights` scope='tutor:7d', botão "regenerar" → chama `tutor-admin-digest`). mesmo padrão visual do `AdminHome`.
3. **gráficos lado a lado**:
   - sparkline 30d (perguntas/dia) via SVG puro.
   - barras por trilha (perguntas + alunos únicos).
4. **controles operacionais** (`tutor_settings`): kill switch (Switch shadcn), slider de limite diário (0-200), input de modelo (Select com presets), textarea de addon do system prompt (com aviso "isso vai ANTES da pergunta do estudante, todas as respostas"). botão salvar.

componentes auxiliares em `src/features/admin/tutor/`:
- `TutorKpiBar.tsx`
- `TutorTimelineSparkline.tsx`
- `TutorTrailBars.tsx`
- `TutorControls.tsx`
- `TutorDigestCard.tsx`
- `TutorRecentMessages.tsx` (drawer com últimas 50 perguntas, filtro por trilha)

### refator `AdminFbi` aba "tutor"

a aba `tutor` em `AdminFbi.tsx` passa a renderizar `<AdminTutorCommand />` (novo nome, no `src/features/admin/AdminTutorCommand.tsx`). o componente antigo (`AdminTutor.tsx`) fica como `<AdminTutorLegacy />` se o switch "ver visão legada" estiver ligado (dropdown discreto), mas o default é o novo. — alternativa mais limpa: **substituo direto**, sem legado, já que o novo é superset.

## fora de escopo

- RAG / embeddings.
- mudar schema de `tutor_conversations`.
- cost tracking em USD (usamos só tokens_estimate).
- legado Chŏra bot (que já tá atrás de flag).

## arquivos

**criados**
- `supabase/migrations/<ts>_tutor_instrumentation.sql`
- `supabase/functions/tutor-rate-message/index.ts`
- `supabase/functions/tutor-admin-digest/index.ts`
- `src/components/chora-bot/TutorStarterPrompts.tsx`
- `src/components/chora-bot/TutorMessageActions.tsx`
- `src/components/chora-bot/TutorContextChip.tsx`
- `src/components/chora-bot/TutorUsageChip.tsx`
- `src/components/chora-bot/TutorDisabledNotice.tsx`
- `src/hooks/useTutorSettings.ts`
- `src/hooks/useTutorUsage.ts`
- `src/features/admin/AdminTutorCommand.tsx`
- `src/features/admin/tutor/TutorKpiBar.tsx`
- `src/features/admin/tutor/TutorTimelineSparkline.tsx`
- `src/features/admin/tutor/TutorTrailBars.tsx`
- `src/features/admin/tutor/TutorControls.tsx`
- `src/features/admin/tutor/TutorDigestCard.tsx`
- `src/features/admin/tutor/TutorRecentMessages.tsx`

**editados**
- `supabase/functions/tutor-trail-chat/index.ts` (settings gating + logging + addon + modelo dinâmico)
- `src/pages/TutorPage.tsx` (starters + actions + context chip + usage chip + disabled notice)
- `src/components/eletiva/TutorChat.tsx` (mesmos componentes integrados)
- `src/pages/AdminFbi.tsx` (aba tutor passa a renderizar `AdminTutorCommand`)
- `.lovable/plan.md`

## risco e mitigação

- **edição na edge function** pode quebrar o tutor em produção. mitigação: settings carregadas em `try/catch` com fallback pro hardcoded; tudo opcional, default permissivo.
- **`tokens_estimate` por chars/4** é grosseiro mas suficiente pra ranking relativo; quando admin precisar de fatura, troca por contagem real.
- **off_scope por regex** é heurística frágil. é só uma sinalização, não decisão. admin vê o ranking, não bloqueia ninguém.
- **digest pode estourar token**: limito amostra a 200 últimas mensagens × 240 chars ≈ 48k chars (~12k tokens, dentro do flash).
- **limite diário default 50** é generoso pra estudante curioso, restritivo o suficiente pra evitar abuso. fácil de ajustar via UI.

## ordem de execução

1. migração `tutor_instrumentation` (cria 2 tabelas, RLS, GRANTs, seed do settings).
2. edge function `tutor-trail-chat` (gating + logging).
3. edge functions `tutor-rate-message` + `tutor-admin-digest`.
4. hooks `useTutorSettings` + `useTutorUsage`.
5. componentes estudante (chips, actions, notice).
6. integração em `TutorPage` + `TutorChat`.
7. componentes admin (`tutor/*`).
8. `AdminTutorCommand` integrado em `AdminFbi`.
9. plan.md.
10. validar: console logs limpos, abrir tutor, mandar 1 pergunta, conferir linha em `tutor_message_events`, abrir `/admin/tutor`, conferir KPIs, mudar kill switch, ver bloqueio.
