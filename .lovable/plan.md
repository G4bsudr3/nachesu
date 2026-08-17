# alunos clicam no link e voltam pro login

## o que eu confirmei no banco (hoje, 17/08)

- bernardo pediu 2 links e criou **2 sessões** de autenticação (12:02:13 e 12:03:44). depois disso ainda disparou um **link de recuperação de senha** (12:04:01).
- os outros 4 estudantes do mesmo horário (julia 12:07, luiz 12:12, joão 12:15, eduardo 12:17) criaram sessão **e** geraram registro em `user_access_log` 1 a 2 segundos depois.
- bernardo não tem **nenhum** registro em `user_access_log` hoje.

isso é decisivo: o registro de acesso é disparado pelo próprio app assim que a sessão hidrata no navegador. sessão criada no servidor + zero registro no app = **o token foi consumido, mas o app nunca abriu logado no navegador dele**.

não é diferença entre eletivas: bernardo (economia circular) falhou e julia (ia) passou, no mesmo minuto, com o mesmo navegador (chrome windows). nenhum código de login trata as duas eletivas de forma diferente.

## por que isso acontece (causa ainda não confirmada, é o primeiro passo do plano)

o email leva o estudante direto pro endereço de verificação da autenticação. esse endereço é de **uso único** e devolve a sessão num fragmento de URL. dois jeitos conhecidos de quebrar:

1. algo abre o link antes do estudante (varredura de segurança do email institucional ou proxy da escola): a sessão nasce, o token queima, e quando ele clica o link já morreu.
2. o destino não está na lista de endereços liberados da autenticação, ou o fragmento se perde no caminho: o navegador chega no app sem sessão.

nos dois casos ele cai de volta na tela de login. e hoje **sem nenhuma mensagem**: o erro volta no endereço de `/app`, e a proteção de rota manda pra `/auth` descartando o erro. o estudante vê só o login em branco, acha que "não carregou", pede outro link, e o pedido novo invalida o anterior.

## o que vou fazer

### 1. confirmar a causa antes de mexer no fluxo
ligar o registro de eventos da autenticação por alguns dias e comparar, por estudante, o horário do clique com o horário do registro de acesso. isso separa "queimaram meu link antes" de "cheguei no app sem sessão".

### 2. link de acesso passa a apontar pro nosso domínio
o email deixa de apontar pro endereço de verificação cru e passa a apontar pra uma página nossa (`/entrar`), que faz a troca do código pela sessão de forma controlada, com tela de "entrando..." e mensagem clara se falhar. isso tira o token de uso único de dentro do email e imuniza contra varredura que abre link.

### 3. o erro nunca mais some
- preservar o erro ao redirecionar de `/app` pra `/auth`, pra sempre aparecer a mensagem certa (o texto já existe e é bom).
- na tela de login, quando o erro for de link queimado, já deixar o email preenchido e o botão de novo link em destaque.

### 4. um link por vez, dito na cara
avisar no envio que o link novo cancela o anterior e segurar o botão por alguns segundos, pra ninguém pedir três links e clicar no primeiro.

### 5. saída de emergência
oferecer, na mesma tela, a opção de entrar com senha para quem já tem, em vez de só magic link.

## detalhes técnicos

- `send-access-link`: parar de mandar `properties.action_link` no email; mandar `${APP_BASE}/entrar?...` carregando o hashed token, e trocar por sessão via `verifyOtp` na página.
- nova rota pública `/entrar` (`AuthCallback.tsx`): troca token por sessão, trata erro com `resolveAuthError`, redireciona pro `next`.
- `ProtectedRoute.tsx`: `Navigate` preservando `location.search` e `location.hash` ao mandar pra `/auth`.
- conferir a lista de redirect URLs liberadas da autenticação (`https://sebrae.frattz.com/**`).
- `useAccessPing` fica como está: ele é hoje o melhor sinal de "chegou logado de verdade".

## fora do escopo

- mexer em qualquer conteúdo de módulo ou nas duas eletivas.
- trocar provedor de email.
