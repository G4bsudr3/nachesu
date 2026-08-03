# notificações de entrega: status, histórico e métricas

## respondendo primeiro suas perguntas

**os dois existem e são funcionais?**

- notificação in-app na correção de entrega: **existe e funciona**. quando o educador responde/revisa, um gatilho no banco cria a notificação, ela aparece no sino em tempo real e leva pro módulo certo, na âncora do feedback.
- e-mail correspondente à correção de entrega: **não existe**. não há template de "sua entrega foi corrigida" no sistema de e-mails. hoje só saem e-mails de convite, link de acesso, senha, mensagem direta do admin, nudge de evasão e alerta do tutor. ou seja, ao responder as entregas do hey@frattz.com hoje, ele recebe só o sino, nenhum e-mail.

**dá pra metrificar?**

- notificação lida: **sim**, já é registrado (`read_at`). dá pra medir quantas foram entregues e quantas foram abertas.
- e-mail enviado/falhou: **sim**, existe log por envio com status (enviado, na fila, falha definitiva). hoje esse log só é legível pelo servidor, precisa liberar leitura pra admin.
- e-mail **aberto**: **não**. o provedor atual não devolve evento de abertura pro banco. só temos "aceito pelo provedor" e "rejeitado/bounce". não vou fingir métrica de abertura.
- push no celular visto: **não**. o app não tem push nativo, a notificação vive dentro do app. "visto no celular" = notificação lida no app.

**último login de cada usuário:** o dado existe no sistema de autenticação, mas hoje nenhuma tela do admin mostra. dá pra expor.

## o que vou construir

### 1. e-mail de entrega corrigida
novo template branded NachesU (League Gothic no título, Urbanist no corpo, logo, remetente atual), disparado quando o educador envia feedback ou muda a entrega pra revisado/ajuste. conteúdo: nome do estudante, eletiva, número e nome do módulo, trecho do feedback e botão que abre exatamente o mesmo link da notificação in-app (módulo, âncora do feedback). idempotente por entrega + revisão, pra não duplicar em reenvio.

### 2. aba "notificações & e-mails" no perfil do estudante no admin
já existe um bloco de comunicação no perfil; vou ampliar pra incluir:
- linha por entrega: quando foi corrigida, se a notificação foi criada, se foi lida (e quando), se o e-mail saiu, status do e-mail (enviado, na fila, falhou com o motivo)
- botão reenviar e-mail quando falhou
- último login do estudante no topo do perfil

### 3. página `/admin/notificacoes`
visão geral, no mesmo padrão de tabela do resto do admin:
- filtros: período, eletiva, tipo (correção, mensagem, módulo liberado, nudge), status do e-mail
- cards de resumo: notificações criadas, % lidas, e-mails enviados, e-mails com falha
- tabela: estudante (nome oficial + turma), tipo, quando, lida?, e-mail (status), erro quando houver
- export CSV

### 4. teste real com hey@frattz.com
depois de publicar as funções, respondo uma das 5 entregas simuladas e confirmo: notificação no sino, e-mail chegando, link abrindo o módulo certo na âncora do feedback. te mando o resultado antes de você abrir no celular.

## detalhes técnicos

- template novo em `_shared/transactional-email-templates/` + registro em `registry.ts`; deploy das funções de e-mail depois
- disparo do e-mail no mesmo caminho que hoje só grava notificação (envio server-side via função de e-mail transacional, com chave de idempotência `deliverable-reviewed-<id>-<revisão>`)
- migração pra permitir SELECT em `email_send_log` só pra `admin` (hoje é service_role only), com dedupe por `message_id` (última linha por mensagem)
- último login via função security definer que lê `auth.users.last_sign_in_at`, exposta só pra admin
- sem tabela nova: uso `notifications`, `email_send_log`, `module_deliverables`

## fora do escopo

- push nativo no celular (exigiria PWA com service worker e permissão; posso planejar depois)
- rastreamento de abertura de e-mail por pixel
- mudar o fluxo de notificação de módulo liberado ou de nudge
