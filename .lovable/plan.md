## contexto

o projeto começou como hub do Chŏra Lovable (Perestroika + frattz, abril 2026) e foi adaptado pra servir a eletiva da Escola Sebrae. hoje convivem nele:

- **design system já 80% migrado pra Sebrae** (azul `#005EB8` como primary, fontes Barlow Condensed + Inter, gradientes azuis). aliases `perestroika.*` mantidos só pra compat.
- **120 arquivos** ainda usam classes `perestroika-laranja/vermelho/rosa` hardcoded em decorações, mascotes e cards.
- **18+ páginas** importam `<ChoraLogo />` e/ou têm copy hardcoded "chora lovable 2026 · co-produzido por perestroika + frattz".
- já existe `AdminEletivaSettings` + flag `eletiva_extras_enabled` que esconde features herdadas do Chŏra (mural, álbum, carta pública, etc.) dos alunos da eletiva.

suas decisões fixam o rumo: **rebrand pra Eletiva Sebrae em tudo**, paleta **Perestroika continua primária** (laranja/vermelho/rosa fortes), azul Sebrae vira **assinatura institucional** (rodapé, selo, autenticação, certificado), e a marca nova entra quando você me passar nome+logo.

## o que muda (e o que não muda)

**não muda**:
- schema do banco, RLS, edge functions, rotas, naming do código (continua `chora`/`hub` internamente).
- estrutura da eletiva (4 trilhas × 5 módulos, 4×5×5 fractal, hooks que acabei de criar).
- componentes Perestroika de identidade (`LagrimaGradient`, `BalaoSerrado`, `EstrelaPerestroika`, `CaixaPrompt`) — continuam vivos como linguagem visual.

**muda**:
- design system: azul Sebrae sai do trono e vira accent institucional; Perestroika volta a ser primary.
- todas as menções "Chŏra Lovable / Perestroika + frattz" na UI viram "Eletiva Sebrae" (ou o nome que você me passar).
- `<ChoraLogo />` é substituído por novo wordmark da eletiva (vou criar componente novo, deixar `ChoraLogo` viva como legado pro hub Chŏra).
- rodapé padronizado vira "eletiva sebrae · escola sebrae · powered by frattz" (ajustamos quando você confirmar).
- 120 arquivos com `perestroika-*` continuam funcionando porque é alias, mas refatoro os mais visíveis pra tokens semânticos (`primary`, `accent`).
- memórias core e plano atualizados pra refletir a verdade nova.

## ondas de execução

### onda A — fundação visual (não depende de você)

1. **paleta híbrida no `index.css`**
   - reverter `--primary` pra **rosa Perestroika** (`#f756a6`).
   - `--accent` vira **azul Sebrae** (`#005EB8`) pra tags institucionais.
   - manter laranja/vermelho/rosa como tokens semânticos (`--brand-laranja`, `--brand-vermelho`, `--brand-rosa`).
   - novo gradient hero: `gradient-perestroika` (laranja → vermelho → rosa → azul-sebrae) pegando o gradient original Perestroika com final azul.
   - novo gradient assinatura: `gradient-sebrae` (azul claro → azul escuro) só pra rodapé/auth.
   - voltar fontes: **League Gothic display + Urbanist body** (memória core sobre isso é regra sua, foi perdida na migração anterior).
   - dark mode revisado pra nova primary.

2. **componente de marca novo: `<EletivaLogo />`**
   - criado em `src/components/brand/EletivaLogo.tsx` com placeholder textual usando League Gothic (até você passar o asset).
   - aceita `variant="dark" | "light"` igual o ChoraLogo pra drop-in replace.
   - quando você me passar SVG/PNG, troco o conteúdo do componente sem mexer em ninguém que importa.

3. **footer compartilhado: `<EletivaFooter />`**
   - centraliza a copy "eletiva sebrae · escola sebrae · 1º ano EM" que hoje tá hardcoded em 6 páginas.
   - elimina duplicação e qualquer ajuste futuro vira 1 lugar só.

### onda B — substituição em massa (depende só de A)

4. **trocar `<ChoraLogo />` por `<EletivaLogo />`** nas páginas que o aluno acessa:
   - `Index.tsx` (landing — já reescrita semana passada)
   - `Auth.tsx`, `ResetPassword.tsx`, `Pending.tsx`, `Onboarding.tsx`, `Tutorial.tsx`
   - `AppDashboard.tsx`, `PageHeader.tsx` (header global das páginas internas do app)
   - `Prework.tsx`, `Missions.tsx`, `HubBuilder.tsx`, `MinhaCarta.tsx`, `FutureLetter.tsx`, `Certificado.tsx`
   - `PublicForm.tsx` (formulário FBI), `Unsubscribe.tsx`
   - `ChoraBot.tsx` é da turma Chŏra legada → mantém ChoraLogo (atrás da flag de extras).

5. **trocar copy hardcoded de rodapé**: substituir as 6 strings "chora lovable 2026 · co-produzido por perestroika + frattz" pelo `<EletivaFooter />`.

6. **revisar páginas legadas do Chŏra** (`HubIndex`, `HubAlbum`, `HubGallery`, `MinhaCarta`, `CartaPublica`, `Certificado`, `ChoraBot`):
   - confirmar que estão **todas atrás da flag `eletiva_extras_enabled`** (já estão via `ExtrasGate`, vou auditar).
   - copy interna "chŏra lovable" preservada nelas (são da turma Chŏra real, não da eletiva).

### onda C — limpeza de tokens (qualidade de código)

7. **refator dos top-15 arquivos** com mais ocorrências `perestroika-*` (AdminArtworks 77, Tutorial 66, AdminCards 60, PublicForm 59, MascoteSelector 56, AdminConvidados 49, FeedbackFinalAnalysis 48, TurmaPanorama 45, HubBuilder 39, Missions 35, HubGallery 35, AdminEmails 33, FeedbackDia1Analysis 33, ChoraBot 30, cartaTokens 30) → trocar pra tokens semânticos onde fizer sentido (`primary`, `accent`, `destructive`, `--brand-laranja`).
   - alias `perestroika.*` continua no tailwind, então código que eu não tocar segue funcionando.

### onda D — memórias e plano (consistência futura)

8. **atualizar `mem://index.md`** core:
   - "Paleta Perestroika apenas" → "Paleta Perestroika primária + azul Sebrae assinatura institucional".
   - "Fonts: League Gothic + Urbanist" mantém (volta a ser verdade).
   - "Mascotes mantêm paleta Perestroika mesmo no contexto Sebrae" mantém (sua decisão original).
   - "Naming do código mantém 'chora'; troca só na UI" mantém — fica MAIS importante agora.

9. **atualizar `mem://project/identidade-dois-produtos.md`** com:
   - estado atual do design system (paleta híbrida exata).
   - mapeamento ChoraLogo → EletivaLogo, EletivaFooter, gates de flag.
   - lista das 6 páginas legítimamente Chŏra (atrás da flag).

10. **atualizar `.lovable/plan.md`**:
    - registrar essa rebrand como Onda 0.5 (entre fundação e Onda 1 das trilhas).
    - documentar paleta nova, marca nova, decisões de você.
    - lista de arquivos tocados.

## o que precisa de você (em paralelo, não bloqueia)

- **nome oficial da eletiva** (ex: "Eletiva IA na Prática", "Construtores Sebrae", etc.)
- **logo** em SVG (preto + branco/bege) ou PNG alta resolução.
- enquanto não chega, `EletivaLogo` mostra wordmark texto em League Gothic — a UI já fica coerente, é só substituir o componente quando o asset chegar.

## entregáveis dessa rodada

- design system híbrido aplicado (Perestroika primary + Sebrae accent).
- `<EletivaLogo />` e `<EletivaFooter />` criados e plugados em ~15 páginas-aluno.
- 6 strings hardcoded de rodapé eliminadas.
- top-15 arquivos com cores hardcoded refatorados pra tokens.
- memórias core + plano + memória de identidade atualizados pra refletir a verdade nova.
- Hub Chŏra legado intacto atrás da flag, sem rastro visível pro aluno da eletiva.

## fora do escopo dessa rodada

- página `/app/modulo/:number` (próximo passo natural depois desse rebrand).
- `AdminTrilha` pra publicar módulos.
- refator dos 105 arquivos restantes com `perestroika-*` (vai sendo feito conforme tocamos cada feature).
- rebrand visual dos mascotes/arquétipos (sua decisão original era manter Perestroika).

## risco e mitigação

- **risco**: alias `perestroika.*` no tailwind aponta pra tokens Sebrae hoje. quando eu reverter `--primary` pra rosa Perestroika, os componentes que usam classes Sebrae diretas (`bg-sebrae-azul` etc.) continuam funcionando, mas qualquer coisa pintada com `perestroika.azul` vai virar… azul Sebrae (porque o alias mapeia pra lá). vou auditar e reescrever os aliases pra fazer sentido na nova realidade.
- **risco**: trocar fonte de Barlow Condensed pra League Gothic pode mudar pesos visuais em headings já existentes. testo na main route do dashboard e na landing antes de propagar.
- **mitigação geral**: rodo onda A primeiro, te chamo pra um checkpoint visual antes de aplicar onda B em 15 páginas.

posso seguir?