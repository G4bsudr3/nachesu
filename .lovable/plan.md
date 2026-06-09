## tela admin de publicação + visibilidade + audit log

### 1. novas tabelas (migration)

**`user_module_overrides`** — visibilidade granular por estudante
```
user_id uuid (auth.users)
module_id uuid (modules)
visible boolean      -- true: força mostrar; false: força esconder
trail_id uuid null   -- opcional, override no nível trilha
course_id uuid null  -- opcional, override no nível curso
created_by, created_at, updated_at
```
Regra de avaliação na leitura:
1. se houver override por módulo → vale
2. senão override por trilha → vale pra todos módulos da trilha
3. senão override por curso → vale pra todos
4. senão regra padrão (enrollment + module_releases + published)

**`admin_audit_log`** — auditoria
```
id uuid, actor_id uuid (admin), actor_email text
action text  -- 'module_view','module_publish','module_unpublish',
             -- 'trail_publish','course_publish','visibility_grant',
             -- 'visibility_revoke','override_create','override_delete'
target_kind text   -- 'module' | 'trail' | 'course' | 'user_module' | 'user_trail' | 'user_course'
target_id uuid
target_label text  -- snapshot (ex: "IA na prática · trilha 1 · módulo 3")
metadata jsonb     -- diff antes/depois, contexto extra
created_at timestamptz
```
RLS: só admin lê/insere. GRANTs explícitos. Índices em (actor_id, created_at) e (target_kind, target_id).

Triggers automáticos:
- `modules.published` mudou → insere log `module_publish`/`module_unpublish`
- `trails` mudança (se adicionar coluna `published`, opcional) → log
- `courses.published` mudou → log
- `user_module_overrides` insert/delete → log

### 2. registro de "module_view"
Edge function `log-module-access` (verify_jwt em código). Cliente chama uma vez ao montar página de módulo se `isAdmin`. Função insere `admin_audit_log` com action `module_view`, target_kind `module`. Throttle simples: só registra se último view do mesmo admin no mesmo módulo foi há >2min (evita ruído de reload).

`useEletivaProgress` ou `Modulo.tsx` dispara a chamada quando admin abre — não bloqueia render.

### 3. ajuste de visibilidade no app
Adicionar helper `applyVisibilityOverrides(modules, overrides)` em `useEletivaProgress.ts` que combina overrides antes de calcular `publishedModules`. Admin bypass existente (`ADMIN_BYPASS_EMAILS`) continua intocado.

### 4. nova tela admin consolidada `/admin/publicacao`
Item novo na sidebar (`OPERACAO`). Layout:

```text
publicação & visibilidade
├─ [tab] módulos (árvore)
│   curso ▸ trilha ▸ módulo
│   cada nó: switch published, contador "X publicados / Y total"
│   bulk: publicar/despublicar trilha inteira
│   linha do módulo: link "ver overrides" → drawer com lista de users
└─ [tab] por estudante
    busca por nome/email → painel direito
    três seções: cursos / trilhas / módulos
    cada item: switch tri-estado (padrão · forçar visível · forçar invisível)
    botão "limpar overrides do estudante"
```

Reaproveita `admin_list_users` rpc + queries diretas em `courses/trails/modules`.

### 5. tela admin de auditoria `/admin/auditoria`
Tabela paginada com filtros:
- admin (select)
- ação (multi-select)
- target (busca por módulo/trilha/curso)
- período (date range, default 7d)
- export CSV

Colunas: quando · quem · ação · alvo · metadata (expand).

### 6. aba "acessos" dentro do módulo no admin
Em `/admin/eletivas/.../modulo/:id` (ou onde for o editor existente), adicionar aba mostrando últimos 50 `module_view` daquele módulo (quem · quando).

### 7. sidebar admin
Adicionar 2 items em `OPERACAO`:
- `publicação` → `/admin/publicacao` (ícone Eye)
- `auditoria` → `/admin/auditoria` (ícone History)

### detalhes técnicos
- arquivos novos: `supabase/migrations/<ts>_audit_visibility.sql`, `supabase/functions/log-module-access/index.ts`, `src/features/admin/AdminPublicacao.tsx`, `src/features/admin/AdminAuditoria.tsx`, `src/features/admin/ModuleAccessLog.tsx` (aba), `src/hooks/useAdminAuditLog.ts`, `src/hooks/useUserOverrides.ts`
- arquivos editados: `useEletivaProgress.ts` (aplicar overrides), `AdminSidebar.tsx` (2 itens), `App.tsx` (2 rotas), página do módulo (chamada log-module-access se admin), página existente de módulo admin (aba acessos)
- RLS: todas tabelas novas — só admin via `has_role(auth.uid(),'admin')`. GRANTs: `authenticated` select/insert/update/delete em overrides (policies filtram), `service_role` all, audit_log só admin select + edge function insere via service role
- não regredir: regra "1 por semana auto" continua removida (já tirada antes); ADMIN_BYPASS_EMAILS intocado; flags Chŏra intocadas

### fora de escopo
- agendamento futuro de publicação (não pedido)
- log de acesso de não-admins
- notificações de auditoria por email
