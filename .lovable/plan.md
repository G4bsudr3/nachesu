## plano: corrigir avisos do linter de segurança

uma única migration consolidando todas as correções. nada de mudança em código front, só DB.

### 1. search_path mutável (3 funções)

adicionar `SET search_path = public` (ou `public, extensions` pras que usam vector) via `ALTER FUNCTION`:

- `public.scope_forbidden_terms(text)`
- `public.trg_module_publish_scope_check()`
- `public.trg_release_scope_check()`

(as outras já estão com `SET search_path TO 'public'` — confirmado via `pg_proc.proconfig`)

### 2. extensão `vector` em public (1)

mover pgvector pra schema dedicado:

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;
```

risco: colunas `vector(N)` continuam funcionando porque o tipo é resolvido pelo OID, mas funções RPC/SQL que referenciam `vector` sem qualificar precisam de `search_path` incluindo `extensions`. já vou ajustar `match_chora_bot_chunks` e qualquer função que usa o tipo pra incluir `extensions` no search_path.

### 3. funções `SECURITY DEFINER` executáveis por anon/authenticated (76 warnings)

a regra: trigger functions e funções internas **não** devem ter EXECUTE pra `PUBLIC`/`anon`/`authenticated`. funções RPC legítimas (chamadas do cliente) mantêm.

**revogar EXECUTE de PUBLIC, anon, authenticated** (apenas service_role/postgres chamam, ou são triggers):

- triggers: `auto_link_builder_card_user`, `auto_link_fbi_user`, `claim_course_invites_on_signup`, `cleanup_hub_engagement_for_target`, `enforce_chora_bot_cutoff`, `enforce_single_active_enrollment`, `handle_new_user`, `notify_deliverable_reviewed`, `notify_module_released`, `recompute_module_progress`, `validate_admin_role_mutation`, `validate_hub_engagement_target`, `validate_project_vote`, `trg_module_publish_scope_check`, `trg_release_scope_check`
- internas/admin: `assert_module_in_scope`, `compute_module_metrics`, `scope_check_course`, `admin_list_users`, `admin_list_pending_profiles`, `read_email_batch`, `enqueue_email`, `delete_email`, `move_to_dlq`

**manter EXECUTE pra authenticated apenas** (revogar de anon):

- `get_my_card_state`, `get_my_future_letter_group`, `get_my_future_letter_response`, `get_my_project_vote_result`, `save_future_letter_response`, `seal_future_letter`, `is_future_letter_group_member`, `is_future_letter_group_open`, `is_future_letter_group_open_and_owned`, `has_role`, `match_chora_bot_chunks`, `get_project_voting_top_ten`

**manter EXECUTE pra anon+authenticated** (chamadas pré-login):

- `lookup_user_by_email`, `lookup_invited_canonical`, `can_submit_public_fbi`, `get_public_card_by_token`, `mark_card_first_view`

padrão por função:
```sql
REVOKE EXECUTE ON FUNCTION public.<fn>(<args>) FROM PUBLIC, anon, authenticated;
```

e quando precisar restaurar pra um role específico:
```sql
GRANT EXECUTE ON FUNCTION public.<fn>(<args>) TO authenticated;
```

### 4. buckets públicos listáveis (7 warnings)

buckets `public=true` com policy SELECT abrangente em `storage.objects` permitem `list()`. nenhum desses precisa ser listado pelo cliente — leitura é sempre por URL direta conhecida.

solução: trocar as policies SELECT abrangentes (tipo `bucket_id = 'X'`) por policies que exigem `name` específico OU restringir listing. abordagem prática: adicionar `WITH CHECK (false)` não funciona pra SELECT; em vez disso, manter SELECT por URL pública (que vai pelo CDN e não chama `list()`) e **revogar** policies de listing autenticado:

- `auth lista hub-materials` → drop
- `auth lista hub-project-covers` → drop
- demais policies de leitura ficam, mas a leitura via URL pública não passa por essas policies (o CDN serve direto)

obs: buckets `public=true` no Supabase **sempre** permitem GET via URL — o warning é só sobre `list()`. removendo as policies "lista" anônimas/auth, o `list()` para de funcionar e o warning some sem quebrar leitura por URL.

policies a revisar e ajustar:
- `builder-card-images`, `email-assets`, `builder-card-og`, `archetype-artworks`, `turma-mascots`, `hub-materials`, `hub-project-covers`, `hub-album`, `hub-certificates`, `pill-attachments` — pra cada, manter apenas policies escopadas por path/owner; remover policies SELECT amplas tipo `bucket_id = 'X'` sem outra restrição.

### entregável

1 migration `supabase/migrations/<ts>_security_linter_fixes.sql` com:

```text
-- 1. fix search_path
ALTER FUNCTION public.scope_forbidden_terms(text) SET search_path = public;
ALTER FUNCTION public.trg_module_publish_scope_check() SET search_path = public;
ALTER FUNCTION public.trg_release_scope_check() SET search_path = public;

-- 2. mover vector
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;
ALTER FUNCTION public.match_chora_bot_chunks(...) SET search_path = public, extensions;

-- 3. revogar execute em ~25 funções internas + ajustar grants nas demais
REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM PUBLIC, anon, authenticated;
...

-- 4. dropar policies SELECT amplas em storage.objects
DROP POLICY "auth lista hub-materials" ON storage.objects;
DROP POLICY "auth lista hub-project-covers" ON storage.objects;
... (auditar uma a uma as 7 buckets flagadas)
```

depois rodo o linter de novo e itero no que sobrar.

### riscos

- mover pgvector: já mitigado fixando `search_path` da função que usa o tipo. RLS/queries via Supabase JS não são afetadas (não usam tipo direto).
- revogar EXECUTE em funções de trigger é seguro — triggers rodam como owner. mas se alguma edge function chama RPC sem `service_role`, vai quebrar. vou checar callers em `supabase/functions/**` antes de revogar.
- remover policies de listing pode quebrar telas que chamam `supabase.storage.from('x').list()`. vou grepar por `.list(` antes.

quer que eu execute essa migration ou prefere revisar antes de algum passo específico (ex: mover pgvector é o mais arriscado)?
