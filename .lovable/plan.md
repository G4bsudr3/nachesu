## o que está errado (verificado agora)

- o domínio `notify.frattz.com` está **verificado** e a fila de e-mails está **saudável**: 140 e-mails de app foram enviados com sucesso (último em 29/07).
- mas a ativação do envio de e-mails de autenticação continua presa no estágio "confirmando entrega" desde o começo. essa etapa é do lado da plataforma e já foi re-rodada mais de uma vez sem destravar.
- consequência confirmada no log de envios: **nunca saiu um único e-mail de auth pelo nosso sistema**. só existem registros de `admin-direct-message`, `course-invite`, `evasion-nudge`, `test-email`. nada de `signup`, `magiclink` ou `recovery`.
- por isso o magic link e a confirmação saem pelo remetente genérico `no-reply@auth.lovable.cloud`, em inglês, e o Gmail marca como perigoso ou joga no spam, já que remetente e link não batem.

ou seja: o problema não é DNS nem template. é que o hook de auth nunca foi ligado, e ficar esperando a ativação não está resolvendo.

## a saída: parar de depender do hook de auth

o pipeline de e-mail do app funciona perfeitamente e já sai de `noreply@notify.frattz.com`. o `admin-invite-user` já faz exatamente isso: gera o link de acesso e manda pelo nosso próprio envio. vamos usar o mesmo caminho para login e recuperação de senha, tirando o GoTrue da jogada.

### 1. nova edge function `send-access-link`

- recebe `email` e o tipo (`magiclink` ou `recovery`), valida o formato e checa a lista autorizada com a mesma regra do `validate-public-email`.
- gera o link com `auth.admin.generateLink` (mesmo padrão do `admin-invite-user`), apontando para `/app` no magic link e `/reset-password` no recovery.
- envia via `send-transactional-email`, que já usa `notify.frattz.com`.
- responde sempre igual, tenha o e-mail cadastrado ou não, para não vazar quem existe na base.

### 2. dois templates novos no registry

`access-link` e `password-reset`, em português, seguindo o visual do sistema: logo NachesU, League Gothic no título, Urbanist 16px no corpo, fundo bege. copy curta e minúscula.

### 3. trocar as chamadas na tela de login

- `src/pages/Auth.tsx`: substituir `signInWithOtp` (linha 151) e `resetPasswordForEmail` (linha 292) por chamadas à nova função.
- a mensagem de confirmação na tela continua igual, só muda quem envia.
- login por senha e `/reset-password` continuam funcionando exatamente como hoje.

### 4. acesso imediato enquanto isso

para você não ficar travado agora, defino a senha da sua conta admin direto no banco, sem depender de e-mail nenhum. você me diz qual e-mail e qual senha usar. quero senha: tets182

### 5. reenvio dos 106 pendentes

100 convites de curso e 6 nudges morreram por TTL e não voltam sozinhos. depois que o novo fluxo estiver de pé, reenvio esses em lote. R: não precisa reenviar.

## detalhes técnicos

- `send-access-link` roda com `verify_jwt = false` (é chamada por quem não está logado) e valida tudo do lado servidor, com rate limit por e-mail para evitar abuso.
- o `auth-email-hook` fica no projeto, sem ser removido. se a ativação da plataforma concluir um dia, ele passa a funcionar e o fluxo novo continua válido em paralelo.
- nada de Resend ou serviço externo: a delegação NS de `notify.frattz.com` aponta pra Lovable e um terceiro não conseguiria verificar esse subdomínio sem quebrar o que já funciona.