
# admin command center · plano completo

## diagnóstico crítico do admin hoje

andei o admin de ponta a ponta. o que está acontecendo:

**1. a porta de entrada é o lugar errado.** `/admin` cai em `AdminFbi` (legado Chŏra do evento presencial). nada que importa pra operação NachesU está em primeiro plano.

**2. 22 abas em uma única linha.** `AdminFbi.tsx` (645 linhas) controla: eletivas, revisão, trilha, tutor IA, feedback, materiais, pendentes, usuários, nudges, rubricas, settings + 12 abas Chŏra escondidas atrás de toggle. é um menu, não um painel.

**3. `AdminStats` é só uma contagem.** 4 cards (matrículas / alunos ativos / pendentes / módulos publicados) com filtro de curso + período. zero séries temporais, zero funil, zero alertas, zero comparação, zero AI. um aluno entrou hoje? cinco abandonaram? não dá pra saber sem clicar em três telas.

**4. dados ricos no banco estão invisíveis.** existem `student_engagement_risk`, `student_module_progress`, `student_pill_progress`, `module_ratings`, `module_deliverables`, `student_alerts`, `prework_progress`, `tutorial_progress`. quase nada disso aparece no `/admin` raiz. `AdminTurma` e `AdminRisco` existem mas são rotas separadas que ninguém descobre.

**5. zero hierarquia de ação.** o admin não sabe *o que fazer hoje*. tudo é navegação livre. não tem fila ("3 entregas esperando revisão · 2 alunos em risco crítico · 7 pendentes pra aprovar").

**6. zero insight gerado.** com Lovable AI Gateway de graça, ninguém usa AI pra resumir "a turma de IA está 18% atrás de Economia Circular no módulo 3, principal trava: pílula B". seria 1 chamada Gemini Flash por dia.

**7. mobile do admin é deficiente.** abas inline-flex wrap viram parede vertical no celular; tabelas com 6 colunas escapam pra direita.

## princípios novos (maio 2026, edtech assíncrono)

vindos de Linear (action-first), Vercel (insights inline), Posthog (cohort + funnel embutidos), Duolingo School Portal (signal over data), Notion AI (resumo proativo):

1. **action over data**: a primeira tela responde "o que precisa de você agora?", não "quantos alunos tem?"
2. **insight over dashboard**: AI escreve 3 frases todo dia sobre a turma. gráfico é suporte da frase, não o contrário.
3. **funil > silos**: matriculados → ativaram conta → completaram módulo 1 → completaram trilha 1 → entregaram final. uma vista, uma narrativa.
4. **segmento > linha**: estudante existe em segmentos (em chama, em risco, dormente, novo). bulk action por segmento.
5. **command palette**: cmd/ctrl+k abre tudo. nada de hunting em 22 abas.
6. **mobile-first do admin**: o frattz revisa do celular. tudo cabe.

## proposta: 5 seções, 1 home

substitui as 22 abas por **5 áreas** + **home command center**. nada é apagado, só rearrumado e priorizado. legado Chŏra continua acessível atrás da flag `eletiva_extras_enabled`.

```text
/admin                  → Command Center (novo)
/admin/turma/:slug      → Turma (já existe, vira protagonista)
/admin/aluno/:id        → Aluno (já existe, ganha timeline + AI)
/admin/conteudo         → Conteúdo (trilha + tutor + materiais + rubricas)
/admin/operacao         → Operação (pendentes + nudges + emails + risco)
/admin/legado           → tudo Chŏra atrás de toggle
```

### 1 · `/admin` Command Center (tela nova)

estrutura mobile-first, uma coluna, três blocos:

**bloco A · fila de hoje** (acima da dobra, sempre)
```text
┌──────────────────────────────────────┐
│ HOJE, 28 MAI                          │
│                                       │
│ 3 entregas esperando revisão    →    │
│ 2 alunos em risco crítico (21d) →    │
│ 7 cadastros aguardando aprovar  →    │
│ 1 módulo agendado pra amanhã    →    │
└──────────────────────────────────────┘
```
cada linha vira ação direta. zero é estado celebrado ("tudo no jeito"). conta consolidada das duas eletivas, com chip pra filtrar por eletiva.

**bloco B · pulso da turma** (insight AI + sparkline)
```text
┌──────────────────────────────────────┐
│ resumo da semana · gerado por IA      │
│                                       │
│ IA na Prática perdeu 12% de ritmo    │
│ no módulo 3. a pílula B tem 4         │
│ avaliações ≤2. Economia Circular vai │
│ bem, mas 5 alunos travaram no PBL    │
│ do módulo 2.                          │
│                                       │
│ [ver detalhe]   gerado 9h12          │
└──────────────────────────────────────┘
```
- edge function `admin-insight-digest` roda diário às 9h, salva em `admin_insights` (tabela nova, 1 linha por dia por escopo). usa `google/gemini-3.5-flash` (rápido + barato + bom em pt-BR).
- input: agregados de matrículas, conclusões, risco, ratings, deliverables, comentários de feedback dos últimos 7d vs 7d anteriores.
- prompt em pt-BR, tom Naches lowercase, 3 frases, **só fato + comparação**, sem corporativês. proibido em-dash, hashtag, emoji.
- frattz aperta um botão "regenerar agora" se quiser.

**bloco C · gráficos vivos** (4 tiles compactos com Recharts)
1. **funil de ativação** (barra horizontal): matriculados → primeiro login → módulo 1 completo → trilha 1 completa → entrega final. % e contagem absoluta por eletiva.
2. **calor de módulos** (heatmap 4×5): cada célula = módulo, cor = % de conclusão da turma. clicável → `/admin/aula/:n`.
3. **engajamento 14 dias** (sparkline área): atividade diária por eletiva, 2 linhas sobrepostas.
4. **distribuição de risco** (donut compacto): em chama / em ritmo / lento / em risco / dormente.

### 2 · `/admin/turma/:slug` Turma

a `AdminTurma` que já existe vira o protagonista. acrescenta:
- toggle no command center pra filtrar tudo por essa turma
- coluna nova "última pílula" no ritmo dos módulos
- aba lateral "segmentos" (em chama, em ritmo, em risco, dormente, novo) com bulk action: cutucar / abrir / exportar csv

### 3 · `/admin/aluno/:id` Aluno

a tela atual (`AdminStudentProfile`) ganha:
- **timeline cronológica** unificada: login, módulo iniciado, pílula completa, deliverable enviado, mensagem do tutor, nudge recebido. uma linha por evento, agrupada por dia.
- **mini resumo AI** opcional ("esta estudante avança rápido mas para na pílula C de cada módulo. provável fadiga de fim de bloco.") gerado on demand, não automático.
- ações inline: enviar mensagem, marcar como prioridade, registrar nota interna.

### 4 · `/admin/conteudo`

consolida 4 abas atuais (`trilha`, `tutor`, `materiais`, `rubricas`) numa sub-navegação local. nada muda no conteúdo de cada uma, só agrupa.

### 5 · `/admin/operacao`

consolida `pending`, `risco`, `nudges`, `emails`, `feedback inbox` em sub-navegação. é a casa do trabalho operacional invisível.

### 6 · `/admin/legado`

toda a galáxia Chŏra (fbi, prework, missoes, cartas, artworks, convidados, carta-futuro, votacao-projetos, chora-bot, feedback-d1, feedback-final) atrás de toggle único. preserva URLs existentes via redirect. só aparece se `useEletivaExtras().enabled === true`.

### 7 · command palette (cmd/ctrl + k)

componente novo `AdminCommandPalette` usando o `cmdk` (já vem com shadcn). indexa: estudantes (search por nome/email/nickname), módulos, ações ("ver pendentes", "exportar csv da turma X", "rodar nudge agora"). atalho de teclado global no layout admin.

### 8 · layout admin com sidebar

`AdminFbi.tsx` (645 linhas) some. nasce `AdminLayout.tsx` com:
- `Sidebar` shadcn collapsible (5 itens fixos + legado opcional)
- `SidebarTrigger` no header
- `AdminCommandPalette` montado no layout
- mobile: sidebar vira sheet (já é o default do shadcn sidebar)
- preserva o `<AdminRoute>` guard

URL canônica vira `/admin/<seção>`. URLs antigas (`/admin/fbi`, `/admin/missoes` etc.) redirecionam pra `/admin/legado/<aba>` sem quebrar links.

### 9 · mobile do admin

- KPIs em grid de 2 colunas no mobile (não 4)
- tabelas viram cards verticais < 640px (mesma técnica do `AdminRisco` mas aplicada uniformemente)
- fila de hoje sempre primeiro
- sidebar vira sheet com trigger no header

## escopo técnico

### frontend (novo)
- `src/pages/AdminHome.tsx` — Command Center
- `src/components/admin/layout/AdminLayout.tsx` + `AdminSidebar.tsx`
- `src/components/admin/home/ActionQueue.tsx`
- `src/components/admin/home/InsightDigest.tsx`
- `src/components/admin/home/ActivationFunnel.tsx` (Recharts)
- `src/components/admin/home/ModuleHeatmap.tsx`
- `src/components/admin/home/EngagementSparkline.tsx` (Recharts)
- `src/components/admin/home/RiskDistribution.tsx` (Recharts donut)
- `src/components/admin/AdminCommandPalette.tsx` (cmdk)
- `src/hooks/useAdminMetrics.ts` — agrega tudo em 1 query react-query, cache 60s
- `src/hooks/useAdminInsight.ts` — lê `admin_insights` + botão regenerar

### frontend (refator)
- `AdminFbi.tsx` deletado, lógica das abas que sobrevivem migra pros novos containers
- `AdminTurma.tsx` ganha sub-aba "segmentos"
- `AdminStudentProfile` ganha timeline + AI summary
- `AppRoutes`: nova hierarquia `/admin`, `/admin/conteudo/:tab?`, `/admin/operacao/:tab?`, `/admin/legado/:tab?` com redirects das URLs antigas

### backend
- **migração**: tabela `admin_insights` (id, scope text [global|course_id], summary_md, generated_at, model, period_start, period_end, raw_metrics jsonb). RLS: admin lê tudo, ninguém mais lê. GRANT explícito.
- **edge function nova** `admin-insight-digest` (verify_jwt = false pro cron, mas check de admin token via header pra chamada manual). roda diariamente via pg_cron 9h BRT, ou sob demanda quando frattz aperta "regenerar".
- **edge function nova** `admin-metrics-snapshot` opcional pra pré-agregar funil/heatmap se ficar lento (só se a query react-query passar de ~600ms).
- prompt do digest usa `google/gemini-3.5-flash` via Lovable AI Gateway (zero key).

### libs
- `recharts` já está no projeto (assumido pelo stack). se não estiver: `bun add recharts`.
- `cmdk` já vem com shadcn command. ok.

### testes
- testes existentes (52) continuam passando
- adicionar 1 teste de smoke pro `AdminHome` (renderiza fila, insight placeholder, 4 tiles)
- 1 teste pro redirect das URLs antigas

## o que **não** está no escopo

- nada do conteúdo de aluno (`/app`)
- nada de mexer em pílulas, rubricas, materiais existentes
- nada de tirar features legadas Chŏra, só mover pra `/admin/legado`
- não vou renomear tabelas nem mexer no schema dos dados de aluno
- não vou trocar a permissão do dudu (esse trabalho ficou pra outro plano)

## ordem de execução

1. migration: tabela `admin_insights` + grants + RLS
2. edge function `admin-insight-digest` + agendamento
3. `AdminLayout` + `AdminSidebar` + redirects de URL
4. `AdminHome` com fila + insight + 4 tiles
5. `AdminCommandPalette` + atalho global
6. `AdminTurma` ganha segmentos
7. `AdminStudentProfile` ganha timeline + AI on demand
8. polish mobile + qa final

## risco / mitigação

- **risco de quebrar URL bookmarked**: redirect server-side de toda rota antiga pra equivalente nova. testado em smoke.
- **risco de edge function travar**: digest cacheado por dia; se falhar, mostra "sem resumo hoje, [tentar agora]".
- **risco de query do funil pesada**: começa com cliente puro; se >600ms, move pra função pré-agregada.

## sucesso

- frattz abre `/admin` no celular de manhã e em < 5s sabe o que precisa fazer hoje
- 1 frase em pt-BR diz o que mudou na semana
- 22 abas viraram 5 + legado opcional
- nenhuma feature antiga foi perdida, só repriorizada
