# plan.md — eletiva sebrae (base ex-Chŏra Lovable)

> fonte de verdade viva do projeto. atualiza aqui sempre que tomar decisão estrutural.

## o que esse projeto é

eletiva da escola Sebrae pra alunos de 1º ano EM, sobre **IA na prática**.
estrutura **4 trilhas × 5 módulos × 5 pílulas** (fractal 4×5×5), tutor IA "joão-de-barro", PBL com IA por trilha, projeto autoral final.

a base de código foi **reaproveitada do hub Chŏra Lovable** (imersão Perestroika + frattz, abril 2026). naming interno mantém `chora`, `hub`, `fbi` etc. — **só a UI vira Eletiva Sebrae**.

## marca e identidade visual (estado atual)

### paleta (definitiva nessa rodada)

**primária = Perestroika** (cara da marca, decisão sua):
- bege `#f2e4d8` (background)
- laranja `#fe7b02`
- vermelho `#fd4644`
- rosa `#f756a6` ← **`--primary`**
- azul Perestroika `#6f77fc`
- preto `#090909`

**assinatura institucional = Sebrae** (selo, accent, footer, certificado):
- azul Sebrae `#005EB8` ← **`--accent`**
- azul escuro `#003E7E` (gradient-sebrae)
- amarelo `#FFC107`, verde `#22C55E` (success), vermelho `#EF4444` (destructive)

**gradientes**:
- `bg-gradient-primary` = laranja → vermelho → rosa → azul Perestroika (assinatura visual)
- `bg-gradient-hero` = vermelho → rosa → bege (vertical, fundo de hero)
- `bg-gradient-sebrae` = azul Sebrae → azul escuro (rodapé, auth, certificado)
- `bg-gradient-accent` = azul claro → azul Sebrae

### tipografia

- display: **League Gothic** (uppercase, condensada, protagonista)
- body: **Urbanist** (300-700)

### marca

- `<EletivaLogo />` em `src/components/brand/EletivaLogo.tsx` — wordmark "eletiva / escola sebrae" em League Gothic, drop-in replace do `<ChoraLogo />`.
- placeholder textual até receber asset oficial. quando chegar nome+logo definitivo, troca só o conteúdo do componente.
- `<ChoraLogo />` continua vivo em `src/components/brand/ChoraLogo.tsx` — usado SÓ nas páginas legadas do Chŏra (atrás da flag).
- `<EletivaFooter />` em `src/components/layout/EletivaFooter.tsx` — assinatura padrão "eletiva sebrae · escola sebrae · 1º ano EM".

### componentes Perestroika preservados

continuam vivos como linguagem visual da marca:
- `<LagrimaGradient />`, `<BalaoSerrado />`, `<EstrelaPerestroika />`, `<CaixaPrompt />`
- mascotes mantêm paleta Perestroika (decisão sua, registrada na memória).

## arquitetura: dois produtos, uma base

| item | Eletiva Sebrae (atual) | Chŏra Lovable (legado) |
|---|---|---|
| público | aluno 1º ano EM, ~12-15 anos | profissional 28-45 anos |
| duração | semestre escolar | imersão de 2 dias |
| acesso | rotas `/`, `/auth`, `/app/*`, `/app/modulo/*` | `/hub/*`, `/carta/*`, `/album`, `/galeria`, `/chora-bot`, `/certificado` |
| flag | sempre on | atrás de `eletiva_extras_enabled` (admin liga/desliga) |
| marca | `<EletivaLogo />` + `<EletivaFooter />` | `<ChoraLogo />` |
| copy | "eletiva sebrae" | "chŏra lovable" |

**features herdadas** que o aluno da eletiva NÃO vê (escondidas pela flag): mural de projetos, votação, álbum coletivo, perfil de builder público, galeria, carta pro futuro, ChoraBot (suporte pós-imersão), CartaPublica.

**painel admin** (`AdminEletivaSettings`) controla a flag + dá pra navegar tanto eletiva quanto hub.

## schema do banco (sem mexer sem pedir)

### eletiva (atual)
- `trails` (4 trilhas)
- `modules` (20 módulos, 5 por trilha, drip-release com `available_from`)
- `module_pills` (5 pílulas por módulo: aula, prática, IA, reflexão, entrega)
- `module_progress` (aluno × módulo)
- `pill_progress` (aluno × pílula)
- `archetype_artworks`, `builder_cards`, enum `builder_archetype` (reaproveitados)

### legado Chŏra (preservado)
- `profiles`, `fbi_responses`, `missions`, `mission_submissions`, `prework_items`, `prework_progress`, `user_roles`
- `hub_settings` (chave `eletiva_extras_enabled` controla visibilidade)

## tom de voz e copy

- tudo lowercase em copy
- **você**, não tu (decisão sua, override do default frattz pra adequar à escola)
- frases curtas, 1-3 linhas
- sem em-dash, sem hashtags, sem corporativês
- emojis: só 🤙 🔥 🚀 🎉 💫 👀, máx 1 por seção

## ondas de execução (histórico)

### Onda 0 (concluída) — fundação ex-Chŏra
- Lovable Cloud + auth + magic link
- design system inicial Perestroika
- páginas legadas Chŏra todas funcionando

### Onda 0.3 (concluída) — schema da eletiva
- migration: `trails`, `modules`, `module_pills`, `module_progress`, `pill_progress`
- seed: 4 trilhas + 20 módulos placeholder + 100 pílulas placeholder
- `useEletivaProgress` hook
- `EletivaCard` no dashboard (card "sua trilha")
- `Index.tsx` reescrita como landing pública da eletiva (aluno EM)
- `AdminEletivaSettings` + flag `eletiva_extras_enabled`

### Onda 0.5 (concluída agora) — rebrand visual completo
- `index.css`: paleta Perestroika primária + Sebrae assinatura, fontes League Gothic + Urbanist
- `tailwind.config.ts`: tokens `brand.*` e `perestroika.*` reapontados pras cores Perestroika reais; tokens `sebrae.*` mantidos
- `<EletivaLogo />` criado (placeholder textual, drop-in pro `<ChoraLogo />`)
- `<EletivaFooter />` criado
- 16 páginas-aluno migradas: `Index`, `Auth`, `ResetPassword`, `Pending`, `Onboarding`, `Tutorial`, `AppDashboard`, `PageHeader`, `Prework`, `Missions`, `HubBuilder`, `MinhaCarta`, `FutureLetter`, `Certificado`, `PublicForm`, `Unsubscribe` — todas usando `<EletivaLogo />` (importado como alias `ChoraLogo` pra zero quebra)
- 6 strings hardcoded "chora lovable 2026 · co-produzido por perestroika + frattz" substituídas
- `Certificado.tsx`: copy de share trocada
- páginas legadas Chŏra (`HubGallery`, `ChoraBot`, `AdminFbi`, `CartaPublica`, `CertificateEditorial`) preservadas com `<ChoraLogo />` real (estão atrás da flag)

### Onda 1 — próximos passos (não iniciada)
- página `/app/modulo/:number` (hoje botão do `EletivaCard` aponta pra rota inexistente)
- `AdminTrilha` pra publicar módulos (toggle `published`, editar pílulas, preview)
- refator dos 15+ arquivos com classes `perestroika-*` hardcoded pra tokens semânticos (Tutorial, AdminArtworks, AdminCards, MascoteSelector, etc.)

### Onda 2 — projeto autoral
- mecânica de submissão final
- arquétipo de builder gerado por IA ao concluir trilha 4

## o que precisa de você

- nome oficial da eletiva (ex: "Eletiva IA na Prática", "Construtores Sebrae")
- logo SVG (preto + bege/branco) ou PNG alta resolução
- enquanto não chega, `EletivaLogo` mostra wordmark texto em League Gothic — UI já fica coerente

## guardrails (não fazer)

- **não mexer** no naming interno (`chora`, `hub`, `fbi` continuam no código)
- **não remover** `<ChoraLogo />` nem páginas legadas — escondidas pela flag, não deletadas
- **não trocar** a paleta Perestroika por azul Sebrae em massa — ela É a cara
- **não usar** Inter, Roboto, Barlow Condensed (fontes antigas migraram pra League Gothic + Urbanist)
- **não criar** `config.toml` extras
- **não editar** `src/integrations/supabase/client.ts` ou `types.ts`
- responsivo mobile-first (alunos no celular)
- RLS sempre habilitada
