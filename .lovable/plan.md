## Causa raiz

Os estudantes cadastrados por planilha entram com `profiles.status = 'pending'` (trigger `handle_new_user` marca como pending quando o email não está em `invited_participants`).

Quando você clica **aprovar** em `/admin/pendentes`, o código roda:

```ts
supabase.from("profiles").update({ status: "active", ... }).eq("user_id", userId)
```

Mas as policies RLS atuais de `public.profiles` só têm:

- SELECT: todos autenticados
- INSERT: só o próprio user (`auth.uid() = user_id`)
- UPDATE: **só o próprio user** (`auth.uid() = user_id`)

Não existe policy permitindo admin atualizar profile de outra pessoa. Resultado: o UPDATE afeta 0 linhas, o Supabase retorna sucesso (sem erro), o toast mostra "aprovado", mas o status no banco continua `pending`. Verifiquei no banco: os 6 perfis pendentes recentes (Julia, Bernardo, Tiago, Maria, Victor) seguem todos com `status='pending'` mesmo após sua tentativa de aprovação.

Quando o estudante loga, `ProtectedRoute` lê o status, vê `pending` e joga ele de volta pra `/app/pending`. Loop infinito.

O mesmo problema afeta o botão **arquivar** e qualquer outra ação admin sobre profile alheio (ex: salvar quiet hours em `AdminStudentProfile`).

## Correção

Migração SQL adicionando duas policies em `public.profiles`:

1. `admin atualiza qualquer profile` — UPDATE USING `has_role(auth.uid(), 'admin')`
2. Backfill: setar `status='active'` + `approved_at=now()` + `approved_by_admin_id=<frattz>` nos 6 perfis pending atuais (você já tinha intenção de aprovar todos).

Sem mudança de schema, sem código React — o fluxo de aprovar já estava certo, só faltava a permissão.

## Verificação

- Após migração: `SELECT count(*) FROM profiles WHERE status='pending'` deve voltar 0.
- Próxima aprovação de novo cadastro deve persistir status `active`.
- Estudantes afetados conseguem logar e cair em `/app` normal.

## Detalhes técnicos

```sql
CREATE POLICY "admin atualiza qualquer profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

UPDATE public.profiles
SET status='active',
    approved_at=now(),
    approved_by_admin_id='eeb9045d-9b35-42dd-98e4-355269f0a082'
WHERE status='pending';
```

(o user_id do frattz `hey@frattz.com` já está confirmado no banco.)