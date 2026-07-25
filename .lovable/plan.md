## situação atual (já pronto no repo, verificado)

- **Módulo 2 no banco**: `reciclar não é o suficiente`, 5 pílulas publicadas com todo o texto do briefing (abertura com vídeo + transcript, 2 cards curados + 3 perguntas-guia, classificador 3x3 com os 10 exemplos fixos + `radar_source_module_id` apontando pra Aula 1, quiz com as 3 perguntas + gabaritos + feedbacks, bônus "Story of Stuff").
- **Componente `PillClassificador3x3`**: já criado, já renderizado no `ModuloPillList`. O hook `useAula1RadarItems` já puxa os 3 primeiros itens do `deliverable.items` do módulo 1 do aluno.
- **Assinatura visual Duduo** (creme + laranja-vermelho + Sora 800): já aplicada em toda a eletiva de Economia Circular via `[data-eletiva="ecc"]`.
- **Pré-requisito Aula 1 completa**: o sistema de `unlockedModuleIds` já bloqueia o módulo 2 até o 1 fechar (`snapshot.sequentialUnlock`).

O que o briefing pede que **ainda falta** entregar são os dois "além da pílula": a celebração pós-aula com os cards coloridos + o painel do professor com distribuição agregada.

## o que vou construir

### 1. tela pós-conclusão "missão 2 cumprida" — cards coloridos por categoria

Componente novo `<ModuloConclusaoClassificador />` que renderiza acima do `ModuloCelebration` padrão só quando `courseSlug === "economia-circular"` e `moduleNumber === 2` e `isCompleted`.

O componente:

- Lê o deliverable do próprio aluno pra reconstruir o classificador (`content.classificacao_aula2[pillId]`).
- Junta os 10 itens fixos do schema + os 3 itens puxados do Radar do módulo 1 (mesma lógica do `useAula1RadarItems`).
- Renderiza os 13 cards agrupados em 3 colunas por categoria, cada card com fundo da cor da categoria (linear `#9AA0A7`, circular `#75BF9C`, regenerativo `#448FF2`), texto do item e — quando existir — a justificativa embaixo.
- Cabeçalho "missão 2 cumprida" (Sora 800), copy exato do briefing, e chip contador ("X linear · Y circular · Z regenerativo").
- Vazio-friendly: se por algum motivo não houver classificações salvas, mostra fallback discreto e não quebra.

Integração: adicionar o slot no `Modulo.tsx` logo depois do `<ModuloCelebration />` existente, atrás de um guard `courseSlug === "economia-circular" && moduleRow.number === 2`.

### 2. painel do professor — distribuição agregada de classificações

Nova rota admin `/admin/eletiva/economia-circular/modulo/2` protegida por `AdminRoute`, com:

- **KPIs no topo**: total de alunos matriculados, quantos completaram o módulo, quantos fizeram o classificador, mediana de itens classificados.
- **Distribuição por item (13 linhas)**: barra empilhada horizontal por item mostrando % linear / circular / regenerativo da turma. Ao lado, badge "gabarito: X" (do briefing).
- **Ranking de discordância**: os 5 itens onde a turma mais divergiu (menor % na categoria dominante) — o painel de dor pedagógica que o briefing chama de "altamente informativo".
- **Amostra das justificativas**: por item, 3 justificativas escolhidas por ordem cronológica (com o nickname do aluno). Serve pro professor entender o raciocínio, não só a resposta.

Implementação:

- Uma RPC nova `admin_module2_classificador_stats(course_slug, module_number)` que roda com `SECURITY DEFINER`, checa `has_role(auth.uid(), 'admin')` e agrega `content -> 'classificacao_aula2'` de todos os `module_deliverables` do módulo. Retorna JSON com KPIs, distribuição por item e amostra de justificativas.
- Página `src/pages/AdminEletivaModulo2.tsx` com `useQuery` chamando a RPC, layout dentro do `AdminLayout`.
- Um link novo na `AdminSidebar` (ou no `AdminHome`) quando a rota fizer sentido: "eletiva · economia circular · módulo 2".

### 3. ajustes pontuais (baixo risco)

- **Guard do pré-requisito visível**: se o aluno abrir `/app/eletiva/economia-circular/modulo/2` sem ter fechado o 1, o `ModuloLockedHero` atual já bloqueia — mas o copy é genérico. Adicionar um caso especial no `ModuloLockedHero` (quando `moduleNumber === 2 && prev não foi fechado`) que mostra o texto exato do briefing: "Precisamos de pelo menos 3 itens no seu Radar — volta lá e completa antes de seguir."
- **Validação da regra "≥3 itens no Radar"**: hoje o `PillClassificador3x3` só mostra fallback quando a query volta vazia. Melhorar pra quando `items.length < 3`, mostrar o mesmo aviso + CTA "voltar pro módulo 1".

## fora do escopo desta rodada

- Reescrever qualquer conteúdo/schema do módulo 2 (o banco já bate 1:1 com o briefing).
- Drag-and-drop no classificador — o dropdown atual já cumpre a regra do briefing ("drag-drop OU dropdown"). Se você quiser trocar depois, faço em outra rodada.
- Dashboard genérico do professor pra todos os módulos — este PR entrega só o de "distribuição de classificações" que o briefing pede pra Aula 2.

## detalhes técnicos

- RPC nova em `public.admin_module2_classificador_stats(_course_slug text, _module_number int)` retornando `jsonb`. Roda `SECURITY DEFINER` com `SET search_path = public`. Bloqueia com `RAISE EXCEPTION` se `NOT has_role(auth.uid(), 'admin')`. Sem `GRANT` novo além do padrão de funções (`GRANT EXECUTE ... TO authenticated`).
- Zero mudança de tabela: tudo agrega o JSON já persistido em `module_deliverables.content`.
- Componentes novos: `src/components/eletiva/modulo/ModuloConclusaoClassificador.tsx`, `src/pages/AdminEletivaModulo2.tsx`. Rota adicionada em `src/App.tsx` dentro do bloco admin já existente.
- Nada foge do escopo dos tokens `[data-eletiva="ecc"]` — a celebração e o painel do professor herdam a paleta Duduo automaticamente.

## como valido

- Fluxo do aluno: abro `/app/eletiva/economia-circular/modulo/2` com um usuário que já fez o Radar, classifico os 13 itens, concluo, screenshot da tela "missão 2 cumprida" com os cards coloridos.
- Fluxo do professor: entro como admin, abro `/admin/eletiva/economia-circular/modulo/2`, screenshot da distribuição e da amostra de justificativas.
