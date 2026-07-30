## resposta curta

dá pra consertar com o frattz.com. não precisa de Resend.

## o que os dados mostram

- `notify.frattz.com` está **verificado** e a fila de envio está **saudável**: 140 emails de admin e 200 convites saíram por ele com sucesso, o último em 29/07.
- o que está travado é só a **ativação do caminho de envio dos emails de autenticação**: o status do projeto retorna "send path not ready, timed out waiting for email delivery path verification".
- no histórico de envio não existe **nenhum** registro de email de auth (signup, magiclink, recovery). ou seja: o hook de auth nunca chegou a rodar, por isso o Gmail recebeu o template padrão em inglês vindo do remetente genérico da plataforma.

conclusão: o domínio envia. o que falta é religar o hook de auth e destravar a verificação, que ficou pendurada num timeout.

sobre o Resend: hoje ele **não funcionaria** nesse subdomínio, porque `notify.frattz.com` está delegado por NS para os nameservers da Lovable. usar Resend exigiria remover essa delegação (até 72h de propagação) e perderíamos os templates já prontos em português. não vale a pena.

## plano

1. rodar de novo a configuração da infraestrutura de email do projeto (é idempotente) pra refazer fila, cron e segredos e destravar o timeout de verificação.
2. reaplicar os templates de auth já existentes preservando o visual atual (League Gothic no título, Urbanist 16px no corpo, logo NachesU) e reimplantar o `auth-email-hook`, que é o gatilho que faz o reconcile da ativação recomeçar.
3. conferir o status da ativação depois do deploy e confirmar que o remetente passou a ser `noreply@notify.frattz.com`.
4. teste real: pedir um magic link para uma conta de teste e verificar no histórico de envio que aparece uma linha de `magiclink` com status `sent`.

## pendência separada (fora desse conserto)

106 emails morreram por TTL e não são reenviados sozinhos: 100 convites de curso e 6 nudges de evasão. posso reenviar depois que o envio de auth estiver confirmado, se você quiser.

## detalhe técnico

o hook `auth-email-hook` já está no código, com os 6 templates em português e enfileiramento via `enqueue_email` na fila `auth_emails`. nada precisa ser reescrito, só reimplantado para disparar o reconcile do lado da plataforma. o `FROM_DOMAIN` e o `SENDER_DOMAIN` já apontam para `notify.frattz.com`.
