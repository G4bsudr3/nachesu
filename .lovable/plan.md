## Diagnóstico

Os templates em português e o `auth-email-hook` já existem no projeto (`supabase/functions/_shared/email-templates/*.tsx` e `supabase/functions/auth-email-hook/index.ts`), todos com copy NachesU, lowercase, "você", assunto "seu link de acesso nachesu" etc.

O e-mail que você recebeu ("Sign in to your account / One-time login link / Log In") é o **template default do Supabase Auth em inglês**. Ele só é enviado quando o hook customizado não está ativo. Como o remetente "NachesU" apareceu corretamente, o domínio `frattz.com` está verificado e funcionando — o que falhou foi a entrega do conteúdo customizado pelo hook.

Causas mais prováveis:
- O `auth-email-hook` não está deployado na versão atual (ou foi desativado).
- Lovable Emails do projeto pode ter sido desligado em algum momento.

## O que vou fazer

1. Garantir que Lovable Emails está habilitado no projeto.
2. Redeployar o `auth-email-hook` pra que o Supabase Auth volte a chamá-lo em vez de cair no template default.
3. Conferir o status final em Cloud → Emails.

Nenhum template precisa ser reescrito — eles já estão prontos e em PT-BR.

## Como verificar depois

- Pedir um novo magic link em `/auth` com um email Sebrae autorizado.
- O e-mail deve chegar com assunto **"seu link de acesso nachesu"**, título **"entra direto"** e botão **"entrar na nachesu"**.
- Se ainda vier em inglês, abro os logs do `auth-email-hook` pra ver se o Supabase está chamando o webhook.

## Detalhes técnicos

- `EMAIL_SUBJECTS` no hook já cobre os 6 tipos (signup, invite, magiclink, recovery, email_change, reauthentication).
- O hook enfileira em `auth_emails` via `enqueue_email`; o `process-email-queue` renderiza o JSX e envia.
- `SENDER_DOMAIN = notify.frattz.com`, `FROM_DOMAIN = notify.frattz.com`, `SITE_NAME = NachesU`.
- Só vou tocar em `supabase/functions/auth-email-hook/` se o redeploy puro não resolver — primeira tentativa é só reativar + redeploy.
