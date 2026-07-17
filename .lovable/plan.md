# Convite de acesso via admin

Nova aba em `/admin/usuarios` pra admin cadastrar uma pessoa e disparar magic link de acesso na hora.

## Fluxo do admin

1. Em `/admin/usuarios`, nova aba **"convidar"** ao lado da lista atual.
2. Formulário curto:
   - **email** (obrigatório)
   - **nome completo** (obrigatório)
   - **apelido** (opcional, default = primeiro nome)
   - **papel**: estudante (default) ou admin
   - **eletiva(s)**: nenhuma, IA na Prática, Economia Circular, ou ambas (checkbox múltiplo)
3. Botão **"criar e enviar convite"**.
4. Toast confirma envio + a linha aparece na lista de usuários.

## O que acontece no backend

Nova edge function `admin-invite-user` (admin-only, valida `has_role admin`):

1. Cria user em `auth.users` via `admin.createUser({ email, email_confirm: true })` (sem senha; entra por magic link).
2. Trigger `handle_new_user` já cria profile ativo (email fica marcado como confirmado, então cai no ramo `active`).
3. Se `role = admin`, insere `('admin')` em `user_roles` (a função já tem service role, e o guard `validate_admin_role_mutation` respeita `auth.uid()` do JWT do admin chamador, que precisa ser propagado).
4. Pra cada eletiva marcada, cria `enrollment` ativo + `course_invite` claimed.
5. Gera magic link via `admin.generateLink({ type: 'magiclink', email, options: { redirectTo: 'https://sebrae.frattz.com/app' } })`.
6. Enfileira email transacional novo `admin-invite` com: nome do convidado, quem convidou, papel, eletivas matriculadas, botão "entrar na nachesu" apontando pro `action_link` do magic link.

Se o email já existe em `auth.users`: retorna erro claro "essa pessoa já tem conta" (admin pode ir na lista e reenviar magic link separadamente — fora de escopo dessa iteração).

## Template de email novo

`supabase/functions/_shared/transactional-email-templates/admin-invite.tsx`, seguindo o padrão visual dos 6 templates de auth já ajustados (League Gothic título, Urbanist corpo, logo NachesU, gradiente perestroika no botão, footer institucional). Copy curta em português lowercase:

> **você foi convidado pra nachesu**
> [nome do convidado],
> [quem convidou] te deu acesso à nachesu como [papel].
> [se tiver matrícula] você já tá matriculado em: [eletivas].
> clica no botão pra entrar direto, sem senha.
> [ botão: entrar na nachesu ]
> o link é único e vale por 1 hora. se pedir de novo, avisa a gente.

Registrar em `registry.ts`.

## Front

- Nova aba/tab no `AdminUsers.tsx` usando o mesmo padrão de tabs já existente no admin.
- Componente `AdminInviteUserForm.tsx` com Zod + react-hook-form, chama `supabase.functions.invoke('admin-invite-user', { body })`.
- Sucesso → toast + reset do form + invalida query de lista de usuários.
- Erro → mostra `error.context.text()` do FunctionsHttpError.

## Fora de escopo (não faz nessa iteração)

- Reenvio de magic link pra user existente
- Convite em massa (CSV)
- Editar/revogar convite pendente
- Mensagem custom do admin no email (usuário optou por não incluir agora)

## Detalhes técnicos

- Edge function `admin-invite-user`: verify_jwt padrão (Lovable Cloud), valida admin via `has_role`, usa `SUPABASE_SERVICE_ROLE_KEY` pra `auth.admin.*`.
- Concessão de admin: como `admin-upsert-user` explicitamente NÃO concede admin por segurança, essa função tbm não vai. Se `role=admin` for pedido, faço via `INSERT INTO user_roles` chamando com o **client autenticado do admin** (não service role), pra passar pelo guard `validate_admin_role_mutation` — igual ao que já funciona no fluxo de user roles.
- Trigger `handle_new_user` já lida com profile e user_roles participant, então não precisa migration nova.
- Nenhuma tabela nova. Nenhuma alteração de schema.
