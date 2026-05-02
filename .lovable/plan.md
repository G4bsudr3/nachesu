
# aula 1 — "abrir o olho" como módulo testável

transformar o briefing do dudu (5 partes, 50 min, PBL com radar de problemas) num módulo da eletiva 100% navegável por aluno e professor, sem mexer na arquitetura existente de `modules` + `module_pills` + `module_deliverables`. eletiva sebrae continua por fora; identidade duduo aparece dentro da página do módulo.

## princípio

cada uma das 5 partes do encontro vira **uma pílula** do módulo 01. o radar de problemas vira **deliverable estruturado** (`module_deliverables.kind = 'mixed'`) com payload em `content jsonb`. o aluno só avança pra próxima pílula depois de fechar a anterior. admin vê tudo.

## arquitetura

```text
modules.number = 1  (eletiva fundamentos & ia → trocar trilha pra "enxergar")
└── module_pills (5 itens, ordem fixa, todas required salvo bônus)
     ├── 01 abertura          → pilula_a   (vídeo placeholder + transcrição)
     ├── 02 conteúdo curado   → pilula_b   (2 cards externos + 3 perguntas-guia)
     ├── 03 radar de campo    → exercicio_pbl (formulário tabela editável + upload)
     ├── 04 checagem rápida   → pilula_c   (quiz 3 perguntas com feedback)
     └── 05 bônus opcional    → registro   (required=false)
└── module_deliverables (1 por aluno, kind='mixed')
     └── content = { items: [...], quiz_answers: {...}, guided_answers: {...} }
```

nada de tabela nova. tudo cabe em `module_pills.body_md` + um campo novo `interaction_schema jsonb` na própria pílula pra descrever quiz/formulário. payload do aluno fica em `module_deliverables.content`.

## decisões já fechadas com você

1. **identidade**: eletiva sebrae por fora (header, footer, dashboard). dentro de `/app/modulo/1`, paleta + tipografia duduo.
2. **escopo**: aula 1 inteira funcional (mvp testável de ponta a ponta).
3. **admin**: completo já — submissions, csv, métricas, alerta de evasão.
4. **vídeo do dudu**: placeholder + accordion "ler em vez de assistir" fechado.

---

## o que vamos construir

### 1. base do módulo (migrations + seed)

- migration: adiciona `interaction_schema jsonb` em `module_pills` (descreve quiz/form). adiciona `cover_color text` em `modules` pra o accent duduo.
- seed do módulo 01: troca trail/objetivo/título atual por **"missão 1: abrir o olho"** (objetivo, total_minutes=50, deliverable_description preenchido, published=true).
- seed das 5 pílulas com copy exata do briefing (transcrição, cards externos, instruções do radar, quiz, bônus).
- registra na tabela `trails` uma trilha "enxergar" (cor `#F25E3D`) ou reusa a trilha 1 atualizando título — confirmo durante a execução qual quebra menos coisa pro resto da eletiva.

### 2. tema duduo dentro do módulo

novo `<DuduoTheme>` provider local que aplica via css-vars na div raiz da página `/app/modulo/:n`, sem vazar pra fora:

- cores: `--bg #F5EEE1`, `--ink #202124`, `--accent #F25E3D`, `--gold #EFD7A9`, `--cream #F2D8DC`, `--blue #448FF2`, `--teal #75BF9C`, `--amber #F2BC57`, `--mute #9AA0A7`.
- tipografia: importa **Sora 800** via google fonts no `index.html` (já tem league gothic + urbanist). títulos do módulo passam a usar sora; corpo continua urbanist.
- doodles: 4 svgs orgânicos novos (seta, espiral, sublinhado, círculo) em `src/components/duduo/doodles/` aplicados como decoração em momentos chave (instruções do radar, tela final).

ativação por `data-theme="duduo"` no wrapper. coexiste com tema perestroika sem conflito porque a página inteira de módulo já é um shell isolado.

### 3. as 5 pílulas como componentes ricos

componentes novos em `src/components/eletiva/pills/`:

- `PillAbertura.tsx` — player 16:9 escuro com play falso em `--accent`, `<Accordion>` "ler em vez de assistir" fechado por padrão, botão "começar a missão →".
- `PillConteudoCurado.tsx` — 2 cards externos (vídeo ellen macarthur, reportagem portal impactto) com link, duração, descrição de 1 linha. abaixo, **3 perguntas-guia**: 2 de texto longo (com mínimo de caracteres), 1 múltipla escolha. salva em `module_deliverables.content.guided_answers`.
- `PillRadar.tsx` — o coração da aula. tabela editável mobile-first com botão "+ adicionar item". 4 campos por linha: descrição, onde, fluxo (dropdown 6 opções), evidência. evidência aceita upload (storage bucket novo `radar-evidences`, privado, rls própria-do-aluno) + link + áudio. validação ao enviar: ≥5 itens, ≥2 fluxos diferentes, evidência em todos. mensagem de erro "regra anti-óbvio" em destaque. salva em `module_deliverables.content.items` + sobe arquivos pro storage.
- `PillQuiz.tsx` — 3 perguntas: 1 single, 1 multi-select, 1 texto longo sem feedback. cada pergunta mostra feedback inline depois de responder (verde/vermelho com texto exato do briefing).
- `PillBonus.tsx` — instrução pra buscar kurzgesagt no youtube + textarea opcional ("o dado que mais me chocou foi ___ porque ___"). selo dourado quando responder.

cada componente recebe `pill`, `deliverable` e `onSave` e é gentil: auto-save com debounce, indicador "salvo" sutil, "salvar e voltar depois" no rodapé.

### 4. progressão linear dentro do módulo

a página `Modulo.tsx` ganha um modo **"step-by-step"** quando o módulo tem pílulas com `interaction_schema`. em vez de mostrar todas em accordion, mostra **uma por vez** com:

- barra de progresso fixa no topo (5 passos, accent `#F25E3D`).
- "tempo restante estimado" ao lado da barra (soma `duration_min_high` das pílulas que faltam).
- cada pílula só desbloqueia quando a anterior é marcada concluída via interação (não só checkbox).
- bônus (passo 5) é opcional: módulo é marcado concluído ao terminar o passo 4.
- "salvar e voltar depois" persiste a posição (`localStorage` + última pílula concluída no banco).

modo legado (lista de pílulas com checkbox) continua funcionando pros outros 19 módulos. flag por pílula: se `interaction_schema is not null`, vira step-by-step.

### 5. tela final pós-conclusão

quando aluno fecha o quiz (passo 4):

- headline grande sora 800: "missão 1 cumprida".
- texto exato do briefing.
- **render do radar do aluno**: cards bonitos com a evidência (foto/áudio/link) + flag do fluxo. é o "output concreto" que o briefing pede.
- 2 ctas: "ver minha lista" → fica na própria tela; "voltar pro início" → `/app`.
- mascote em pose `celebrating` discreta (acessório, não protagonista — duduo é editorial, não infantil).

### 6. admin completo

nova rota `/admin/aula/1` (e padrão `/admin/aula/:n`). três abas:

- **submissions**: tabela aluno × status, % conclusão, n° itens no radar, fluxos selecionados, link pro detalhe individual com evidências baixáveis.
- **métricas**: 4 cards com os alvos do briefing (taxa conclusão, mediana de itens, % com diversidade de fluxos, tempo médio). gráfico de distribuição de fluxos (barra horizontal).
- **alertas**: lista de alunos em risco (sem entrega 48h após available_from, ou entrega com <3 itens, ou listas idênticas detectadas por hash). botão "marcar como contatado".

botão **exportar csv** no topo: gera planilha com todas as respostas (radar items + quiz + perguntas-guia) por aluno, timestamp incluso. usa edge function `export-module-csv` pra montar no servidor.

### 7. notificações

edge function `module-1-watcher` (cron diário):

- 24h antes de prazo (se houver `available_until` definido pelo admin): envia email "ainda dá tempo de fazer o radar".
- 48h após available_from sem nenhuma entrega: marca em `student_alerts` (tabela nova) e aparece na aba alertas do admin. opcionalmente dispara email pro professor via `send-transactional-email`.

por enquanto, sem prazo final → só dispara o alerta de 48h.

### 8. storage para evidências do radar

- bucket novo `radar-evidences` (privado).
- rls: aluno faz `INSERT/SELECT/DELETE` só dos arquivos cujo path começa com seu próprio `user_id/`. admin lê tudo.
- aceita imagem (jpg, png, webp), áudio (mp3, m4a, ogg), até 10mb.
- limite de 10 arquivos por radar (1 por item).

---

## detalhes técnicos (técnico, pode pular se quiser)

- **migrations** (ordem):
  1. add `module_pills.interaction_schema jsonb` + `modules.cover_color text`.
  2. cria bucket `radar-evidences` + policies.
  3. cria tabela `student_alerts` (user_id, module_id, kind, raised_at, contacted_at, notes).
  4. cria função `compute_module_metrics(module_id uuid)` returns jsonb (security definer, só admin chama).
- **dados**: insert das 5 pílulas com `interaction_schema` populado pro radar/quiz/perguntas-guia. registro do módulo 01 ajustado (título, objetivo, deliverable_description, published=true).
- **fontes**: adicionar Sora no index.html sem mexer nas outras famílias.
- **rotas novas**: `/admin/aula/:n` (já protegida por `AdminRoute`).
- **edge functions**: `export-module-csv`, `module-1-watcher` (cron via supabase scheduler).
- **shadcn**: usar `Tabs`, `Progress`, `Accordion`, `Sheet` (pra mobile do radar), `Dialog` (pra preview de evidência).
- **form do radar**: react-hook-form + zod (validação composta: ≥5 items, ≥2 fluxos únicos, evidência por item).
- **upload**: `supabase.storage.from('radar-evidences').upload(path, file)` + signed url pra leitura.
- **persistência incremental**: cada salvamento dá upsert em `module_deliverables` com `status='rascunho'` até aluno bater "enviar meu radar →" → vira `enviado`.

## arquivos a criar/editar (ordem de impacto)

1. migrations (4 arquivos).
2. `src/components/duduo/DuduoTheme.tsx` + 4 doodles svg.
3. `src/components/eletiva/pills/Pill*.tsx` (5 componentes).
4. `src/components/eletiva/pills/EvidenceUploader.tsx` (compartilhado).
5. refactor leve em `src/pages/Modulo.tsx` pra suportar modo step-by-step.
6. `src/pages/admin/AdminAula.tsx` + `src/features/admin/useAulaSubmissions.ts`.
7. `src/components/admin/AulaMetrics.tsx` + `AulaAlerts.tsx` + `AulaSubmissionsTable.tsx`.
8. supabase functions: `export-module-csv`, `module-1-watcher`.
9. seed sql do módulo 01 com copy completa do briefing.
10. atualização da `.lovable/plan.md` documentando o modelo "aula com interaction_schema".

## o que NÃO vou fazer agora (e por quê)

- não vou mudar o módulo 02-20: continuam no modo lista-de-pílulas legado. o modo step-by-step é opt-in por pílula.
- não vou criar mascote/ilustração nova pra duduo — você não aprovou asset. uso só doodles vetoriais simples.
- não vou plugar lovable ai aqui (o briefing não pediu — quiz é determinístico).
- não vou trocar fontes globalmente. sora vive só dentro de `data-theme="duduo"`.

## sinais que vamos confirmar depois do build

- abrir `/app/modulo/1` num celular 375px e fazer o fluxo inteiro: ler abertura, responder perguntas-guia, adicionar 5 itens no radar com 1 foto, fechar quiz, ver tela final.
- abrir `/admin/aula/1` e ver a submission aparecer na lista, baixar csv, ver métricas atualizando.
- recarregar no meio do radar e confirmar que rascunho voltou.

quando aprovar, executo na ordem listada e te chamo pra testar assim que o fluxo do aluno estiver de pé (antes do admin completo) pra você sentir o feel da identidade duduo.
