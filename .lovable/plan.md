## diagnóstico

estado atual:
- domínio ativo na Cloud: `notify.aiu.guru` (verificado). o hook do código aponta pra `notify.frattz.com`, mas a Cloud nunca foi configurada com esse domínio, então auth emails caem no template default do supabase (foi isso que apareceu no print: "Reset your password" em inglês com botão preto, mesmo o remetente dizendo "NachesU")
- 6 templates existem mas estão todos com identidade chŏra (logo chŏra preta, copy "chŏra lovable 2026 · porto alegre", lágrima perestroika, assinatura "vai lá e cria · chŏra")
- assets de imagem usados pelos templates vivem num bucket de outro projeto (`tfztafpdhlcaamumcdrn.supabase.co`), o que vai quebrar quando a gente trocar pra logo nachesu
- `SITE_NAME = "chorahub"` no hook
- subjects ainda em inglês: "Confirm your email", "Reset your password" etc

## o que vai ser feito

### 1. provisionar domínio frattz.com
abrir o diálogo de setup de email pra você cadastrar `frattz.com` (vai gerar `notify.frattz.com` delegado pros nameservers da lovable). você adiciona 2 NS records no seu provedor (`ns3.lovable.cloud`, `ns4.lovable.cloud`) e o resto (SPF, DKIM, MX) é gerenciado automaticamente. DNS não precisa estar verificado pra deploy seguir; emails passam a sair pelo novo domínio assim que propagar.

### 2. atualizar o `auth-email-hook`
- `SITE_NAME` → `"NachesU"`
- subjects pt-BR, lowercase, tom Naches:
  - signup → "confirme seu email pra entrar na nachesu"
  - magiclink → "seu link de acesso nachesu"
  - recovery → "nova senha nachesu"
  - invite → "você foi convidado pra nachesu"
  - email_change → "confirme seu novo email"
  - reauthentication → "código de verificação nachesu"
- `SAMPLE_PROJECT_URL` → `https://nachesu.lovable.app`

### 3. assets visuais hospedados no próprio projeto
upload pro bucket `email-assets` (criar se faltar) com SELECT público:
- `nachesu-logo.png` (preto sobre bege, ~140px)
- accent visual (estrela perestroika ou faixa de gradiente perestroika como decorativo, no lugar da lágrima chŏra)

trocar `LOGO_URL` e remover `LAGRIMA_URL` do `_chora-styles.ts` (renomeado pra `_nachesu-styles.ts`). manter paleta perestroika (bege fundo, gradiente laranja→rosa→azul no botão, preto no texto, League Gothic+Urbanist).

### 4. reescrever os 6 templates com propósito específico

cada template ganha headline própria, copy curta, microcopy que reforça o contexto. todos em lowercase, "você" (não "tu"), zero em-dash, zero emoji, zero hashtag, footer "nachesu · uma plataforma naches · em parceria com escola sebrae".

| template | headline display | corpo |
|---|---|---|
| **signup** | "bem-vinda à nachesu" | confirma o email pra começar suas eletivas. botão "confirmar email". rodapé: se não foi você, ignora |
| **magic-link** | "entra direto" | link válido por 1h, sem senha. botão "entrar na nachesu" |
| **recovery** | "nova senha" | redefine a senha em 1 clique. botão "redefinir senha". rodapé: se não foi você, sua senha continua a mesma |
| **invite** | "você foi convidado" | educador/admin te convidou. botão "aceitar convite". reforça: válido só pro seu email institucional |
| **email-change** | "confirma o novo email" | mostra email antigo → novo. botão "confirmar troca". rodapé: se não foi você, fala com a gente |
| **reauthentication** | "seu código" | OTP grande em League Gothic (já existe `codeStyle`). 6 dígitos, válido por 10 min, não compartilhe |

### 5. deploy e validação
- deploy do `auth-email-hook` e `process-email-queue` (os templates são renderizados no queue, então tem que redeployar os dois)
- abrir Cloud → Emails pra você acompanhar verificação DNS e disparar preview dos 6 templates direto da interface

## fora de escopo
- templates transacionais (contact form, notificações de progresso etc) — você pediu só os "emails do sistema", que são os auth emails. se quiser app emails depois (ex: notificação quando módulo libera), faço numa próxima rodada
- mudar nome do remetente além de "NachesU" — fica como está
- traduzir mensagens internas do supabase auth (rate limit, etc) — essas vêm da api, não dá pra customizar

## tecnicalidades
- arquivos editados: `supabase/functions/auth-email-hook/index.ts`, `supabase/functions/_shared/email-templates/{signup,magic-link,recovery,invite,email-change,reauthentication}.tsx`, `_chora-styles.ts` (renomear pra `_nachesu-styles.ts` e ajustar imports)
- upload de 1-2 assets via `storage_upload` no bucket `email-assets`
- nenhuma mudança de schema, RLS ou cliente
