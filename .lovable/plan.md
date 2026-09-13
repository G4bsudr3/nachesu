# revisar 3827 entregas sem enlouquecer

duas telas novas no admin, nessa ordem: **projetos** (quem entregou projeto de verdade no lovable) e **triagem por ia** (a ia lê tudo em segundo plano e você só olha o que precisa de olho humano).

## 1. painel de projetos

nova página `/admin/projetos`, um card por estudante de ia na prática (não uma linha por entrega).

cada card mostra:
- nome completo e turma do estudante
- o link mais recente do projeto, clicável, abrindo em nova aba
- o módulo de onde veio esse link e a data
- selo de estado do link: no ar, fora do ar, ou link que não é um projeto lovable
- histórico: ao expandir, todas as versões anteriores do link (módulos 5, 11, 12, 13, 14, 18, 19, 20) em ordem de tempo, pra você ver a evolução
- status da revisão da entrega final e um botão que abre a revisão direto

filtros no topo: só quem tem projeto, só quem não tem nenhum link ainda, só link quebrado, só ainda não revisado. busca por nome. exportar csv com nome, turma, link final e status.

isso responde de cara "quem construiu algo de verdade e o que eu preciso abrir".

## 2. triagem por ia em lote

hoje a análise por ia existe, mas só uma entrega por vez, com você esperando na tela. muda pra isso:

- a análise de cada entrega fica guardada no banco, então roda uma vez só e depois é instantânea
- um botão "analisar este recorte" dispara a fila: a ia processa as entregas pendentes em pequenos lotes, com barra de progresso, e você pode fechar a tela
- cada entrega ganha um veredito da ia: **ok**, **revisar** ou **atenção** (resposta vazia, genérica, copiada de ia, fora do que o módulo pediu), mais duas linhas de justificativa e a nota sugerida
- na fila de entregas isso vira uma coluna com selo colorido e um filtro novo por veredito, ordenando primeiro o que a ia marcou como atenção
- a ia nunca aprova sozinha: ela só ordena e resume

## 3. aprovar em lote

na fila de entregas, caixinha de seleção por linha e um "selecionar todas as ok da ia". com a seleção feita, um botão marca todas como revisadas de uma vez, com um feedback padrão editável (ou o feedback individual que a ia rascunhou, se preferir).

antes de gravar aparece uma confirmação com o número exato de entregas e os nomes, porque isso manda notificação pro estudante. tudo fica registrado no log de auditoria com seu nome.

## detalhes técnicos

- nova tabela `deliverable_ai_reviews` (deliverable_id único, verdict, resumo, nota sugerida, modelo, timestamp), com rls só pra admin e grants explícitos
- `draft-deliverable-feedback` ganha modo `triage`, que grava o resultado na tabela nova
- nova edge function `triage-deliverables-batch`: lote fixo por chamada, trava de execução única, marca progresso por item, e para na hora em caso de crédito esgotado ou bloqueio, mostrando o motivo no admin
- modelo: `openai/gpt-6-astra` via responses api, chamada em streaming consumida no servidor
- extração dos links: função no cliente que varre `content` das entregas atrás de url, marcando as que são `*.lovable.app` ou domínio próprio; checagem de link no ar pela function existente `check-video-links` adaptada, em cache curto
- aprovação em lote: rpc security definer que atualiza `module_deliverables` e grava `admin_audit_log`, respeitando o fluxo de notificação já existente
