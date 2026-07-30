## o que eu verifiquei agora

- o domínio do projeto agora é **aiu.guru** (`notify.aiu.guru`, verificado, auth emails ligados). o `frattz.com` continua existindo na workspace, mas não é mais o remetente do projeto.
- a função que envia todos os emails do app ainda tem **`notify.frattz.com` escrito fixo no código** como remetente. ou seja: o app manda por um domínio que não é mais o configurado.
- no log de envios, o último `password-reset` (30/07 13:04) aparece como `sent`, isto é, a API aceitou. não há bounce nem endereço bloqueado (lista de supressão vazia). então o email saiu, mas por um remetente desalinhado com o domínio atual, que é exatamente o cenário em que o provedor do destinatário descarta em silêncio ou joga fora da caixa de entrada.
- o fluxo de "esqueci a senha" hoje não usa mais o caminho nativo: a tela chama a função `send-access-link`, que gera o link e manda pelo pipeline do app. então ele herda esse mesmo remetente errado.

diagnóstico: o envio está funcional, o remetente é que ficou apontando para o domínio antigo.

## o que fazer

### 1. apontar o envio do app para notify.aiu.guru
trocar as constantes de remetente na função de envio de emails do app para o domínio atual, e ajustar o nome do remetente (hoje está "chorahub", ficaria "NachesU", igual ao que aparece nos emails de auth).

### 2. atualizar os links de suporte nos templates novos
os templates `access-link` e `password-reset` mencionam o endereço de login. confirmo que apontam para o domínio público correto do app.

### 3. republicar as funções afetadas
reimplantar o envio de emails do app e a `send-access-link` para valerem as mudanças.

### 4. testar de verdade, não só olhar o log
- disparar um "esqueci minha senha" real
- confirmar no log que saiu com status enviado
- confirmar com você se chegou na caixa de entrada, e em qual pasta

### 5. decisão que fica pra depois do teste
agora que os emails de auth estão ativos em `notify.aiu.guru`, o caminho nativo do Supabase voltou a ser viável, e ele já tem template em português com a marca NachesU. se o teste do passo 4 confirmar entrega, dá pra simplificar depois: a tela de login volta a usar o fluxo nativo e a `send-access-link` fica só como reserva. não mexo nisso nesta rodada pra não trocar duas coisas ao mesmo tempo.

## detalhes técnicos

- arquivo: `supabase/functions/send-transactional-email/index.ts`, constantes `SITE_NAME`, `SENDER_DOMAIN` e `FROM_DOMAIN` (hoje `notify.frattz.com`) → `notify.aiu.guru`.
- `SENDER_DOMAIN` precisa ser o subdomínio delegado exato, senão a API responde "no email domain record found".
- redeploy: `send-transactional-email` e `send-access-link`.
- verificação: consulta em `email_send_log` filtrando `template_name = 'password-reset'` após o teste, mais checagem da fila e da lista de supressão.
- nenhuma migração de banco, nenhuma mudança de tela nesta rodada.
