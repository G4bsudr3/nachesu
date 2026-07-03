## resumo executivo

o email de teste chegou pra você porque ele passa pelo caminho de **email transacional** (`send-transactional-email` → `process-email-queue` → SMTP autenticado em `notify.frattz.com`). esse caminho está 100% saudável (58 admin-direct-message + 1 test-email, todos com status `sent`).

os emails de **autenticação** (recovery/signup/magic link) usam um caminho totalmente diferente e esse caminho **nunca foi acionado com sucesso**. essa é a raiz do problema da diretora.

## os 3 sintomas destrinchados

### 1. "senha dá errado no login"

o backend confirma: **78 de 78 profiles têm `has_password = true**`. ou seja, nenhum usuário está "sem senha cadastrada". o erro é de credencial mesmo (senha diferente da que a pessoa acha que cadastrou, ou nunca definiu senha e só entrou por magic link). isso é comportamento esperado do Supabase Auth, não bug. o remédio real é o fluxo de reset funcionar.

### 2. "email de reset demora e vai pro spam"

audit do banco:

```
template_name        | status | count
---------------------+--------+-------
admin-direct-message | sent   | 58
test-email           | sent   |  1
```

**zero emails de recovery/signup/magiclink no `email_send_log**`. isso significa que o `auth-email-hook` (a função que renderiza e enfileira os emails de auth com branding NachesU via `notify.frattz.com`) **nunca foi invocado com um evento real de auth**. logs da função só mostram chamadas do endpoint `/preview` do painel Cloud → Emails, nenhum evento webhook do Supabase Auth.

conclusão: o Supabase Auth está caindo no **SMTP default do Supabase** (rate limit de ~3-4 emails por hora, remetente genérico não autenticado no domínio `notify.frattz.com`). daí:

- **demora** = fila do SMTP default do Supabase estourando rate limit quando várias pessoas pedem junto
- **spam** = SPF/DKIM/DMARC de `notify.frattz.com` não batem com o remetente real (SMTP do Supabase envia por outro domínio)

### 3. "mesmo chegando, não conseguem trocar a senha"

duas causas prováveis, combinadas com a demora:

**a) link expirado.** token de recovery do Supabase dura 1h por padrão. se o email demora 30-60min pra chegar (rate limit), o aluno abre e o token está prestes a expirar ou já expirou. daí a página `/reset-password` mostra "link inválido" (tem essa branch no código: `!hasRecoverySession → t("reset_link_invalid_title")`).

**b) token consumido pelo scanner do Gmail.** o Gmail (e Outlook, e antivírus corporativo do Sebrae) pré-visita links de email pra escanear phishing. como o link default do Supabase é uso único (`?type=recovery&token=...`), o scanner "clica" primeiro, invalida o token, e quando o aluno clica de verdade dá tela de "link inválido". o link customizado do template NachesU já tem mitigação por Site URL correto, mas como o auth-email-hook não está rodando, esse link customizado nunca é usado.

**c) hipótese menor:** Site URL do projeto = `https://nachesu.lovable.app`, mas os alunos acessam por `https://sebrae.frattz.com`. o allow list já cobre os dois, então isso **não** quebra o reset, mas contribui pra confusão (link do email default aponta pro `nachesu.lovable.app`, não pro domínio bonito).

## o problema técnico exato

o `auth-email-hook` está deployed mas **não conectado ao Supabase Auth** como hook ativo. o setup do email prod (`email_config.prod_infra_setup`) provavelmente rodou parcial ou o webhook do Auth não foi ativado. sintomas confirmam:

- `email_send_log` sem NENHUMA linha de auth em 14 dias
- logs da função só mostram calls do painel de preview, zero eventos reais
- template preview no painel deu "Template build failed" (indicador secundário de que o setup de prod ficou incompleto)

quando o Auth precisa mandar email e o hook não responde, ele silenciosamente usa o SMTP default → daí toda a cadeia de problemas.

**problemas adjacentes menores** encontrados durante a auditoria:

- logs antigos do `auth-email-hook` mostravam `Module not found: _shared/email-templates/signup.tsx` no endpoint de preview (não afeta envio real, mas explica o "Template build failed" no painel)
- o link `redirectTo` no `Auth.tsx` usa `window.location.origin/reset-password` (correto), mas o email default do Supabase ignora isso e usa Site URL (`nachesu.lovable.app`)

## o que **não** é o problema

- não é DNS de `notify.frattz.com` (verificado, e transacionais chegam limpo)
- não é a página `/reset-password` (código correto, listener OK, updateUser OK)
- não é senha não cadastrada (todos os 78 profiles têm `has_password`)
- não é bug de código do frontend

## próximo passo - Posso aplicar, foi aprovado!

o fix é forçar o Supabase Auth a rotear os emails de auth pelo `auth-email-hook` (que já está deployed e sabe usar `notify.frattz.com`). caminhos possíveis:

1. **re-scaffold do auth email templates** com `confirm_overwrite: true` + redeploy — reconecta o webhook do Auth
2. se o problema for `prod_infra_setup` incompleto: **publicar o projeto** re-provisiona o cron/hook de prod
3. no meio tempo, o Site URL poderia mudar pra `https://sebrae.frattz.com` pra os links ficarem no domínio certo

me confirma se quer que eu execute o passo 1 (recomendado, resolve em 1 ação e mantém tudo customizado NachesU) — ou se prefere que eu investigue mais antes.