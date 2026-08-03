# reorganizar "correção & acompanhamento" + análise crítica com IA

## o que o diagnóstico mostrou

- **correções** (`/admin/correcoes`) e **respostas** (`/admin/respostas`) leem exatamente a mesma fonte (`usePendingDeliverables`) e abrem o mesmo painel de correção (`FeedbackReviewDrawer`). a única diferença é o filtro: correções mostra só `pendentes`, respostas mostra tudo com busca, filtros e export csv. são duas portas pro mesmo lugar.
- **revisão** (`/admin/review`) não é sobre estudante: é `AdminEletivaReview`, um checador de qualidade do conteúdo publicado da eletiva (pílulas, textos, espelho da landing). está na seção errada, o que é a maior causa da confusão.
- já existe "rascunhar com IA" dentro do painel de correção (edge function `draft-deliverable-feedback`, usa a rubrica do módulo). o que falta é a **análise crítica visível** antes do rascunho, e o mesmo apoio de IA na **resposta em thread** pro estudante.

## reorganização da sidebar

seção **eletivas & conteúdo** (ganha o item que estava fora de lugar):
- eletivas
- ia na prática · módulos
- economia circular · módulos
- publicação
- **revisão de conteúdo** (era "revisão")
- trilha
- materiais

seção **entregas dos estudantes** (era "correção & acompanhamento"):
- **entregas** → `/admin/entregas`, uma página só, com contador de pendentes no item
- pendentes (aprovação de conta)
- risco

`correções` e `respostas` deixam de ser dois itens. `/admin/correcoes` e `/admin/respostas` passam a redirecionar pra `/admin/entregas` (nada quebra em link salvo).

## página única de entregas

uma lista em tabela (padrão `AdminTable` já usado no admin), com:

- filtros inline por status: **aguardando correção** (default), **ajustes pedidos**, **corrigidas**, **todas**
- filtro por eletiva e por módulo, busca por estudante
- contagem acima da lista + destaque de espera > 7 dias (comportamento que já existe em correções)
- export csv (mantém o que existe em respostas)
- clique na linha abre o mesmo painel de correção, agora com navegação anterior/próxima dentro do filtro ativo

isso mantém tudo que as duas telas faziam, sem duplicar a leitura mental.

## apoio de IA na correção

no painel de correção, um bloco novo **"análise da IA"**, acima do campo de feedback:

1. botão `analisar com IA` gera, a partir da entrega + rubrica do módulo:
   - leitura crítica em tópicos: o que está forte, o que está frágil, o que falta evidência
   - sinalização de risco de cópia/resposta genérica quando for o caso
   - sugestão de veredito (aprovado / ajustar) e de nota, sempre como sugestão
2. botão `usar como rascunho` joga o texto no campo de feedback, já em tom NachesU (minúsculo, direto, sem punição), totalmente editável antes de enviar
3. nada é enviado ao estudante automaticamente: o envio continua sendo uma ação explícita do educador
4. o mesmo botão passa a existir na **resposta em thread** (`deliverable_messages`), gerando um rascunho curto de réplica considerando o histórico da conversa

## detalhes técnicos

- `src/components/admin/layout/AdminSidebar.tsx`: mover item, renomear, nova seção, badge de contagem de pendentes.
- `src/App.tsx`: rota `/admin/entregas`; `/admin/correcoes` e `/admin/respostas` viram `<Navigate replace>`.
- nova `src/pages/AdminEntregas.tsx` fundindo `AdminCorrecoes.tsx` + `AdminFeedbackInbox.tsx` (filtros, csv, drawer, navegação prev/next). os dois arquivos antigos saem depois que a rota nova estiver validada.
- edge function `draft-deliverable-feedback` ganha `mode: "analysis" | "draft" | "reply"` no body, mantendo o comportamento atual como default (`draft`). retorno da análise: `{ strengths[], gaps[], suggested_verdict, suggested_score, notes_md }`. continua admin-only via `has_role`, validando o body.
- IA pela Lovable AI (gateway já configurado, `LOVABLE_API_KEY`), sem chave nova. erros 429/402 aparecem como toast claro no painel, sem virar feedback vazio.
- sem mudança de schema: `module_deliverables` e `deliverable_messages` já cobrem o fluxo.
- checagem no browser: fila com filtros, análise, rascunho, envio e thread, em desktop e mobile.
