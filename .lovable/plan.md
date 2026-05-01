vou propor dois artefatos:

1. **`.lovable/plan.md` reescrito** como documento de referência viva do projeto (estado atual + decisões + roadmap), não mais um plano de tarefa pontual
2. **knowledge do projeto atualizado** pra colar em "Project Knowledge" no Lovable

ambos cobrem que o produto é da **eletiva Sebrae** mas o código herda nomes do **Chora Lovable** intencionalmente, e fixam o que já foi construído, descartado e o que vem.

---

## 1. arquivo `.lovable/plan.md` (substitui o atual)

````markdown
# Plano vivo · Eletiva IA na Prática (Sebrae) sobre o Hub Chŏra Lovable

> Este arquivo é a **fonte de verdade** do estado do projeto. Atualizar a cada
> decisão estrutural, nunca apagar histórico.
> Última atualização: maio 2026

## 1. Contexto

Este projeto serve a **dois produtos** que dividem a mesma base de código:

- **Chŏra Lovable** (origem): imersão presencial co-produzida por Perestroika
  + frattz, 25-26 abril 2026, Instituto Caldeira POA. ~40 adultos. Já rodou.
- **Eletiva IA na Prática · Escola do Sebrae** (uso atual): trilha online
  20 módulos × 50 min, drip semanal, 1º ano EM (14-15 anos). Início março
  2026 previsto. Proponente: frattz.

Decisão de arquitetura: **manter naming "Chora Lovable" no código** (rotas,
tabelas, componentes, edge functions) por inércia e velocidade. A renomeação
acontece só na **camada visível** (UI, copy, metadata). Quem ler o código
precisa saber disso.

Mapeamento mental:
| Conceito Eletiva       | Nome no código                          |
|------------------------|------------------------------------------|
| trilha/módulo          | a criar (`tracks`, `modules`)            |
| projeto autoral aluno  | reusa `projects` + tabelas hub           |
| diagnóstico inicial    | `fbi_responses` (FBI = Formulário Início)|
| carta de arquétipo     | `builder_cards` + `archetype_artworks`   |
| tutor IA               | `chora-bot-*` edge functions             |
| aluno                  | `profiles` (auth.users)                  |
| admin (frattz/Sebrae)  | `user_roles` enum `admin`                |

## 2. Identidade dos dois produtos

| Aspecto             | Chŏra Lovable             | Eletiva Sebrae          |
|---------------------|---------------------------|-------------------------|
| Paleta              | Perestroika               | **Perestroika** (mantida) |
| Tipografia          | League Gothic + Urbanist  | idem                    |
| Tom                 | frattz, lowercase, "você" | idem                    |
| Mascote tutor       | João-de-barro             | idem                    |
| Logo                | `<ChoraLogo />`           | substituir por neutro futuro |
| Domínio             | chora.lovable.app         | a definir Sebrae        |

Decisão fixa: **mascotes da eletiva mantêm paleta Perestroika** mesmo no
contexto Sebrae. Não usar azul institucional Sebrae em lugar nenhum.

## 3. Estado atual do banco (o que já existe)

Tabelas em produção (parcial, foco no que é reusável pela eletiva):

- `profiles` · aluno
- `user_roles` · enum `app_role` (`admin`, etc.) com `has_role(uid, role)` SDF
- `fbi_responses` · 19 perguntas, vira input pra carta + diagnóstico arquétipo
- `invited_participants` · pre-fill da planilha Perestroika
- `builder_cards` · carta de arquétipo do aluno
- `archetype_artworks` + `archetype_artwork_versions` · arte por arquétipo
  (compartilhada, não por aluno) — populada com os 6 mascotes Perestroika
- `builder_archetype` enum: `visionario | artesao | experimentador |
  conector | pragmatico | narrador`
- `missions` + `mission_submissions` · trilha pré-evento Chora
- `prework_items` + `prework_progress` · pré-curso Chora
- `materials` · biblioteca de recursos
- assets, comments, reactions, future_letters, hub_album, etc. (Chora)
- **schema da eletiva já existe** (criado em onda anterior, vazio até a onda 1):
  - `trails` (id, order_index, title, description, color)
  - `modules` (id, trail_id, number UNIQUE, order_index, title, objective,
    deliverable_description, total_minutes=50, available_from, published)
  - `module_pills` (id, module_id, order_index, kind `pill_kind`, title,
    body_md, duration_min_low/high, video_url, attachment_url, required)
  - `module_deliverables` (user_id, module_id UNIQUE, kind `deliverable_kind`,
    content jsonb, status `deliverable_status`, feedback)
  - `module_ratings` (user_id, module_id, rating, comment)
  - `student_module_progress` (user_id, module_id, started_at, completed_at)
  - `student_pill_progress` (user_id, pill_id, completed_at)
  - enums: `pill_kind` (pilula_a/b/c, exercicio_pbl, registro),
    `deliverable_kind` (link/text/checklist/mixed),
    `deliverable_status` (rascunho/enviado/revisado)
  - trigger `recompute_module_progress` já fecha módulo automaticamente
    quando todas as pílulas required estão done

Edge functions ativas:
- `generate-builder-card` · texto + classificação de arquétipo
- `generate-archetype-artwork` + `restore-archetype-artwork` · imagem da carta
- `generate-card-og-image` · og:image do compartilhamento
- `chora-bot-chat` + `chora-bot-ingest` + `chora-bot-suggest-prompt` · tutor
- `analyze-feedback-d1`, `analyze-feedback-final`, `analyze-turma`
- `submit-public-fbi`, `validate-public-email`
- `send-transactional-email`, `process-email-queue`, `auth-email-hook`
- `mascote-voting`, `select-mascote` (chora)
- `import-perestroika-spreadsheet`

## 4. O que JÁ foi construído pra eletiva

- 7 mascotes Perestroika gerados (Nano-banana Pro): joão-de-barro tutor +
  6 arquétipos (gavião visionário, aranha artesão, macaco-prego experimentador,
  abelha conector, tatu pragmático, bem-te-vi narrador). Todos em
  `src/assets/arquetipos/{slug}.png` e plugados no `archetype_artworks`.
- Página `/app/carta` (`MinhaCarta.tsx`) com todos os estados:
  none | gerando | revisao | erro | publicada.
- Admin `AdminCards`, `AdminArtworks` funcionando com pipeline texto + arte
  compartilhada por arquétipo.
- Tutor João-de-barro plugado em `BotAvatar`, `ChoraBotFab`, banner do hub.
- Memórias salvas: `mem://design/mascote-estetica.md`, regra paleta no índice.

## 5. O que foi DESCARTADO (não retomar)

- Tabela `archetypes` própria pra carta. Decisão: reusar `builder_archetype`
  enum + `archetype_artworks` que já existem.
- Geração de imagem por aluno individual em `builder_cards`. Hoje a imagem é
  compartilhada por arquétipo via `applyArchetypeArtwork()`.
- Diagnóstico/quiz separado. O FBI já classifica via `generate-builder-card`.
- Renomear código de "chora-bot" → "joao-de-barro" agora. Custa muito,
  ganho zero. Só substituir asset + rótulo de UI.
- n8n / automações externas (workspace knowledge proíbe).

## 6. O que VEM (estrutura da eletiva)

Eletiva Sebrae tem forma fractal definida:

```
4 trilhas × 5 módulos × 5 partes (3 pílulas + 1 PBL + 1 registro)
```

| Trilha | Módulos | Tema |
|--------|---------|------|
| 1 · Fundamentos & IA       | 1-5   | conceito, prompt eng., comparação, no-code |
| 2 · Problema & Decisão     | 6-10  | caça ao problema → escopo → pitch          |
| 3 · Construção no Lovable  | 11-15 | MVP → MLP → UX → IA integrada → teste      |
| 4 · Validação & Evolução   | 16-20 | MVT → testes reais → iteração → entrega    |

Estrutura padrão de módulo:
- **Pílula A** 6-9 min · aula curta
- **Pílula B** 6-9 min
- **Pílula C** 5-8 min
- **Exercício PBL** 18-30 min
- **Registro/evidência** 3-10 min

### 6.1 Schema da eletiva (já existe, ver §3)

O schema foi criado numa onda anterior e tá pronto. Resumo nomenclatural
(diferente da proposta original — os nomes reais valem):

```
trails                    (não "tracks")
modules                   number 1-20 UNIQUE, sem slug, usar /modulo/:number
module_pills              (não "module_parts"); kind via enum pill_kind
module_deliverables       1 entregável por módulo por aluno (UNIQUE)
module_ratings            avaliação opcional do módulo
student_module_progress   (não "module_progress")
student_pill_progress     (não "part_progress")
```

RLS: aluno vê módulos `published=true AND (available_from IS NULL OR <= now())`.
Pílulas filtram pelo módulo. Admin vê tudo via `has_role('admin')`.

**Pendente criar (Onda 3)**: `student_projects` (dossiê do projeto autoral
atravessando as 4 trilhas) + tabela de feedback IA do PBL.

### 6.2 Rotas novas (aluno)

```
/app                              dashboard reformulado (3 modos hero)
/app/trilha                       constellation view (signature moment)
/app/modulo/:number               página editorial do módulo (number 1-20)
/app/modulo/:number/p/:order      player da pílula (order 1-5)
/app/projeto                      dossiê vivo do projeto autoral
/app/carta                        já existe
/app/conquistas                   selos por trilha (brasão de builder)
/app/admin/trilha                 AdminTrilha (CRUD trails/modules/pills)
```

### 6.3 Signature moments aprovados (workspace knowledge)

1. **Constellation View** da trilha · 20 estrelas Perestroika animadas em SVG,
   conectadas por linhas que acendem com progresso. Respeita
   `prefers-reduced-motion` (versão estática editorial).
2. **Transição módulo concluído** · LagrimaGradient desce, preenche estrela
   na constelação (GSAP, 800ms), revela próximo. Som opt-in.
3. **João-de-barro contextual** · em toda página de módulo, mascote no canto
   com 1 linha de provocação contextual. Click abre `chora-bot` com contexto.

### 6.4 Inovações simples / alto impacto (aprovadas no plan anterior)

- Modo foco no player de pílula
- Anotações inline durante leitura
- Streaks semanais discretos (sem culpa)
- Release party visual (countdown 6h antes de drip)
- "Pergunta o joão" dentro de cada PBL
- Comparação de prompts swipeable (módulos 2-4)
- Constelação compartilhável (export PNG)

### 6.5 PBL com feedback IA

Edge function nova `evaluate-pbl-submission` usando Lovable AI Gateway
(gemini-2.5-flash). **Opt-in por aluno**: botão "quero feedback do joão".
Não é nota, é provocação no tom frattz.

### 6.6 Conquistas (substitui certificado único genérico)

4 selos Perestroika (1 por trilha) → formam **brasão de builder** completo →
desbloqueia certificado oficial Sebrae (reusa `CertificateRenderer`).

## 7. Decisões fixadas

Movidas pra onda 1 (ver §8). Esta seção fica como histórico de aberturas
resolvidas. Próximas decisões abertas voltam aqui.

## 8. Roadmap em ondas

### Onda 1 · foundation (em andamento)
- ~~Migration do schema~~ **já existia, reaproveitado**
- ~~Seed das 4 trilhas + 20 módulos + 100 pílulas placeholder~~ **feito (maio 2026)**
- `AdminTrilha` CRUD com edição inline de módulos/pílulas, toggle published,
  campo available_from, edição de body_md das pílulas
- Hooks `useTrails`, `useModule(number)`, `useMyProgress`, `useDeliverable`
- Dashboard `/app` com card "próximo módulo" puxando do progresso do aluno

### Decisões fixadas (antes definidas como pendentes na §7)
1. **Drip configurável via `available_from` por módulo, default null = liberado.**
   Admin pode preencher data por módulo no AdminTrilha pra fazer drip semanal.
2. **Seed feito com placeholders editáveis.** Conteúdo real entra via admin.
3. **Feedback IA do PBL: opt-in.** Botão "quero feedback do joão" dentro do
   exercício, dispara `evaluate-pbl-submission` (Onda 3).

### Onda 2 · core UX do aluno
- `/app/trilha` constellation view (signature 1)
- `/app/modulo/:slug` página editorial
- `/app/modulo/:slug/parte/:label` player
- Dashboard com 3 modos
- Modo foco + anotações inline
- João-de-barro contextual + "pergunta o joão"

### Onda 3 · projeto + PBL inteligente
- `/app/projeto` dossiê vivo
- Edge function `evaluate-pbl-submission`
- Componentes de submission por tipo
- Comparação de prompts interativa
- Transição módulo concluído (signature 2)

### Onda 4 · selos + polish
- `/app/conquistas` brasão de builder
- Countdown editorial release party
- Streaks discretos
- Compartilhamento da constelação
- Página pública opcional `/projeto/:slug`
- QA mobile dos 20 módulos

## 9. Guardrails (não esquecer ao codar)

- Naming código = Chora Lovable, naming UI = Eletiva (quando contexto Sebrae)
- Paleta Perestroika apenas, mesmo no Sebrae
- Sem em-dash, sem hashtags, lowercase, "você"
- RLS sempre, admin via `has_role`
- Roles em `user_roles`, **nunca** em `profiles`
- Magic link primeiro, senha opcional
- Mobile-first de verdade (alunos do EM acessam celular)
- `min-h-dvh`, `overflow-x: clip` global
- Não editar `App.css` fora do reset
- Não editar `src/integrations/supabase/{client,types}.ts`
- Não criar tabela `archetypes` (decisão fixa)
- Não renomear chora-bot → joao-de-barro no código
- Não usar fonts genéricas (só League Gothic + Urbanist)
- `prefers-reduced-motion` respeitado em toda animação
````

---

## 2. Knowledge do projeto sugerido (pra colar em Project Knowledge)

````
# Hub Chŏra Lovable · Eletiva IA na Prática (Sebrae)

## Identidade do projeto

Esta base de código serve **dois produtos** sobre a mesma fundação:
1. **Chŏra Lovable** — imersão presencial Perestroika + frattz (já rodou abr/2026)
2. **Eletiva IA na Prática · Escola do Sebrae** — trilha online 20 módulos
   semanais de 50min, 1º ano EM, drip semanal, proponente frattz

**Convenção crítica**: o código mantém naming "chora", "chora-bot", "hub",
"missions" etc. por inércia. A camada Sebrae aparece só na UI/copy. Não
renomear código a menos que explicitamente pedido.

## Stack

- Lovable Cloud (Postgres + Auth + Edge Functions + Storage)
- React 18 + TypeScript strict + Vite + Tailwind v3
- shadcn/ui sobre Radix
- Framer Motion default; GSAP pra timeline; Three.js/R3F pra 3D quando preciso
- Lovable AI Gateway (gemini-2.5-flash default, gemini-3-pro-image pra arte)
- Magic link passwordless (signInWithOtp); senha opcional

## Identidade visual Perestroika (não-negociável)

### Paleta (única autorizada)
- bege #f2e4d8 (fundo)
- laranja #fe7b02
- vermelho #fd4644
- rosa #f756a6
- azul #6f77fc
- preto #090909

Mascotes da eletiva mantêm paleta Perestroika. **Não usar** azul Sebrae
institucional em nenhum lugar.

### Gradientes
- gradient-small (90deg laranja → vermelho → rosa → azul)
- gradient-screen (180deg vermelho → rosa → bege)

### Tipografia
- Display: League Gothic
- Body: Urbanist
- Zero Inter, Roboto, fontes genéricas

### Componentes assinatura (estáveis, não mexer)
`<ChoraLogo />`, `<LagrimaGradient />`, `<BalaoSerrado />`,
`<CaixaPrompt />`, `<EstrelaPerestroika />`, `<Countdown />`,
`<TarotCard />`, `<CartaCompleta />`

## Tom de voz (frattz / Naveia)

- Lowercase em copy (CSS pode forçar uppercase em display)
- "você", não "tu"
- Frases curtas, 1-3 linhas
- **Zero em-dash** (—), zero hashtags
- Emojis só: 🤙 🔥 🚀 🎉 💫 👀, máximo 1 por seção
- Microcopy embutido onde tem fricção, nunca FAQ
- Empty states convidam, nunca dizem "vazio"

## Mascote tutor: João-de-barro

Asset: `src/assets/joao-de-barro-tutor.png`. Plugado em `BotAvatar`,
`ChoraBotFab`, banner do hub. Ele é o tutor que conversa com o aluno.

Os 6 arquétipos de builder têm seus próprios mascotes Perestroika em
`src/assets/arquetipos/{slug}.png` (gavião, aranha, macaco-prego, abelha,
tatu, bem-te-vi).

## Arquétipos de builder

Enum `builder_archetype`:
`visionario | artesao | experimentador | conector | pragmatico | narrador`

Carta gerada via `generate-builder-card` (Lovable AI) ao submeter FBI.
Imagem da carta é **compartilhada por arquétipo** (lê de
`archetype_artworks`, não gera por aluno). Página do aluno: `/app/carta`.

## Estrutura da Eletiva (20 módulos)

```
4 trilhas × 5 módulos × 5 partes
```

Estrutura de módulo (50min total):
- Pílula A (6-9min) · Pílula B (6-9min) · Pílula C (5-8min)
- Exercício PBL (18-30min)
- Registro/evidência (3-10min)

Trilhas:
1. Fundamentos & IA (mod 1-5)
2. Problema & Decisão (mod 6-10)
3. Construção no Lovable (mod 11-15)
4. Validação & Evolução (mod 16-20)

Cada aluno desenvolve **um projeto autoral no Lovable** atravessando as 4
trilhas: do problema escolhido ao MVT publicado + pitch final.

## Princípios de UX (didática)

1. Sempre 1 próximo passo único em destaque no dashboard
2. Progressão visível **sem gamificar** (nada de XP/level genéricos)
3. Copy fala "você" como amigo
4. Microcopy tutorial onde tem fricção (não FAQ)
5. Empty states convidam
6. Estado persistente com reconhecimento
7. Tempo estimado explícito em toda ação
8. Mobile-first de verdade (40%+ dos alunos no celular)

## Signature moments (assinatura do projeto)

Todo build precisa pelo menos 1 momento "como ele fez isso?". Aprovados pra eletiva:
1. **Constellation View** da trilha (`/app/trilha`) · 20 estrelas Perestroika
   conectadas, animação de progresso
2. **Transição módulo concluído** · LagrimaGradient preenche estrela na
   constelação (GSAP 800ms)
3. **João-de-barro contextual** · provocação no canto de cada página de módulo

## Guardrails de banco

- Roles em `user_roles` com função SDF `has_role(uid, role)`. **Nunca** em `profiles`
- Toda tabela com RLS habilitada
- Não criar tabela `archetypes` (decisão fixa, reusar `archetype_artworks`)
- Não editar `src/integrations/supabase/{client,types}.ts` (auto-gerados)
- Não fazer ALTER em schemas reservados (auth, storage, realtime)
- Validação por trigger, não CHECK constraint imutável

## Guardrails de código

- Componentes < 250 linhas, quebrar acima
- Zero magic numbers (vira token)
- TypeScript strict, evitar `any` sem motivo declarado
- `prefers-reduced-motion` respeitado em toda animação
- Touch target mínimo 44×44px
- Loading = skeleton, não spinner genérico
- `min-h-dvh` + `overflow-x: clip` no global, nunca editar `App.css` fora do reset
- Asset visual novo só com aprovação do frattz

## Personas

- **Aluno (Eletiva)**: 14-15 anos, 1º ano EM Escola Sebrae, zero a iniciante
  em tech, muito mobile, ritmo semanal
- **Aluno (Chora)**: 28-45 anos, profissional criativo (legacy)
- **Admin**: frattz, Helena Kich, Fernanda Vaz · `user_roles` role `admin`

## Documentos de referência no repo

- `.lovable/plan.md` — plano vivo do projeto (estado + decisões + roadmap)
- `mem://design/mascote-estetica.md` — prompt-base e mapping dos 7 animais
- `mem://design/responsive-rules.md` — regras anti-regressão de layout
````

---

## o que muda na prática

- o `.lovable/plan.md` antigo (focado só em mascotes/cartas) é substituído pelo documento vivo acima, que vira referência permanente
- o knowledge cobre as decisões fixas: dois produtos sobre uma base, código mantém naming Chora, paleta Perestroika sempre, mascotes mapeados, estrutura 4×5×5 da eletiva, signature moments
- não escrevo nenhum código nem rodo nenhuma migration nessa rodada — só documentação

aprova esses dois textos como estão pra eu já gravar o `plan.md` e te entregar o knowledge formatado pra colar?