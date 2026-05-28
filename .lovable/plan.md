
## escopo

fechar o que ficou em aberto do plano admin antes de tocar no tutor IA:

1. plugar a rota `/admin` → `AdminHome` (command center) e mover o `AdminFbi` legado pra `/admin/legado`.
2. envelopar todas as rotas admin num `AdminLayout` com **shadcn sidebar** (colapsável, com gatilho sempre visível).
3. adicionar **command palette** global (`cmdk`) com atalho `cmd/ctrl+k` pra pular entre seções.
4. configurar **redirects** das URLs antigas (`/admin/fbi`, `/admin/prework`, `/admin/chora-bot`, etc.) pra `/admin/legado/:tab` mantendo deep-link.
5. atualizar `.lovable/plan.md` e validar build.

## diagnóstico do que falta

- `src/pages/AdminHome.tsx` já existe (command center pronto), mas `App.tsx` linha 381 ainda renderiza `AdminFbi` em `/admin` — o command center não tá no ar.
- todas as outras rotas admin (`/admin/risco`, `/admin/turma/:courseId`, `/admin/aluno/:userId`, `/admin/certificate-sandbox`, `/admin/aula/:n`) vivem soltas, cada página com header próprio. zero shell comum, zero nav lateral.
- `AdminFbi.tsx` (645 linhas) é o "menu de 22 abas" com `Tabs` que opera tudo via `/admin/:tab`. já tem split visual entre "operação NachesU" (sempre visível) e "ferramentas Chŏra (legado)" colapsadas, mas tudo no mesmo arquivo. mover pra `/admin/legado` resolve o ruído sem perder funcionalidade.
- nenhum command palette existe ainda. `cmdk` não está nas deps.

## o que muda

### 1. `AdminLayout.tsx` com sidebar

novo arquivo `src/components/admin/layout/AdminLayout.tsx`:

- `<SidebarProvider>` em volta de tudo, `div` raiz `w-full min-h-dvh bg-perestroika-bege`.
- `<AdminSidebar />` com `collapsible="icon"` (mantém faixa estreita com ícones quando colapsada).
- header sticky (`h-12`, `border-b border-perestroika-preto/10`) com `<SidebarTrigger />` à esquerda + breadcrumb + atalho `cmd+k` indicado.
- `<Outlet />` no main.
- componente compartilha mascote `<EletivaSymbol pose="thinking" />` mini no rodapé da sidebar (signature moment leve).

`src/components/admin/layout/AdminSidebar.tsx`:

- 2 grupos de navegação, mapeando rotas que **já existem** (não invento destino novo):
  - **operação** (sempre aberto): início (`/admin`), eletivas (`/admin/eletivas`), revisão (`/admin/review`), trilha (`/admin/trilha`), tutor IA (`/admin/tutor`), feedback (`/admin/feedback`), pendentes (`/admin/pending`), materiais (`/admin/materiais`), risco (`/admin/risco`), usuários (`/admin/usuarios`), nudges (`/admin/nudges`), rubricas (`/admin/rubricas`), settings (`/admin/eletiva`).
  - **legado Chŏra** (collapsible, `defaultOpen` se `pathname` começa com `/admin/legado`): fbi, pré-work, missões, cartas, artworks, convidados, emails, feedback dia 1, pesquisa final, carta futuro, votação projetos, chora bot.
- ícones via `lucide-react` (Home, BookOpen, Compass, Brain, Inbox, Hourglass, Package, AlertTriangle, Users, Bell, ClipboardList, Settings, Archive, etc.).
- `NavLink` + `isActive`, classes Perestroika (`bg-perestroika-preto/5` ativo, hover suave). botão "sair" no `SidebarFooter`.

### 2. rotas em `App.tsx`

- envolver todo o bloco admin num `<Route element={<AdminRoute><AdminLayout/></AdminRoute>}>`.
- dentro:
  - `path="/admin"` → `<AdminHome />` (novo command center, já pronto).
  - `path="/admin/risco"` → `AdminRisco`.
  - `path="/admin/turma/:courseId"` → `AdminTurma`.
  - `path="/admin/aluno/:userId"` → `AdminStudentProfile`.
  - `path="/admin/certificate-sandbox"` → `AdminCertificateSandbox`.
  - `path="/admin/aula/:n"` → `AdminAula`.
  - `path="/admin/legado"` e `path="/admin/legado/:tab"` → `<AdminFbi />` (renderiza dentro do layout, sem o header próprio dele — vou condicionar a `inLayout` prop ou remover o header local quando estiver dentro do layout).
  - `path="/admin/:tab"` → mantém `<AdminFbi />` por enquanto pra não quebrar bookmarks; só que `AdminFbi` agora aceita slugs novos e legados.

**redirects** (`<Route element={<Navigate />}>`):

- `/admin/aula/X` mantém intacto (não muda).
- legado por aba: `/admin/fbi`, `/admin/prework`, `/admin/missoes`, `/admin/cartas`, `/admin/artworks`, `/admin/convidados`, `/admin/emails`, `/admin/feedback-d1`, `/admin/feedback-final`, `/admin/carta-futuro`, `/admin/votacao-projetos`, `/admin/chora-bot` → `<Navigate to="/admin/legado/:tab" replace />` (preserva `tab` no path).

### 3. `AdminFbi` adaptado

- aceita renderização "dentro do layout": detecta via `useMatch('/admin/legado/*')` ou prop. quando true, **omite** o header `<NachesULogo />` + breadcrumb local + botões sair (já no layout) e **só renderiza** as abas + conteúdos.
- ajusta `VALID_TABS` e `handleTabChange` pra navegar pra `/admin/legado/:tab` quando montado nessa rota; pra `/admin/:tab` quando vier do path antigo (compatibilidade).
- nas abas "operação" (eletivas, review, trilha, tutor, feedback, etc.) o componente continua válido em `/admin/:tab` mas o **destino preferencial** no menu vira a página dedicada quando existir (ex.: `/admin/tutor` continua dentro de `AdminFbi`, sem mexer agora — só vou criar página dedicada quando tocar no tutor IA).

### 4. command palette (`cmdk`)

- `bun add cmdk` (já é dependência do shadcn em geral; confirmo presença antes de instalar).
- `src/components/admin/CommandPalette.tsx`:
  - escuta `cmd/ctrl+k` global via `useEffect` em `AdminLayout`.
  - `<CommandDialog>` shadcn com grupos: "ir para" (todos os destinos do sidebar), "ações rápidas" (regenerar insight do digest — chama `useAdminInsight().regenerate`, copiar link da aba atual, sair).
  - busca fuzzy embutida do `cmdk`.
  - registra atalho no `<SidebarFooter>`: `⌘K` chip mostrando atalho.

### 5. `.lovable/plan.md`

- atualizo o bloco "admin · command center" pra refletir: shell `AdminLayout`, sidebar, command palette, `/admin/legado/:tab` ativo, AdminTutor próxima etapa.

### 6. validar build

- depois das edições, a harness roda `tsc`/build automático; checo `code--read_console_logs` em busca de erros do dev server e, se preciso, faço uma navegação rápida a `/admin` e `/admin/legado/fbi` pra confirmar render sem regressão.

## arquivos

**criados**
- `src/components/admin/layout/AdminLayout.tsx`
- `src/components/admin/layout/AdminSidebar.tsx`
- `src/components/admin/CommandPalette.tsx`

**editados**
- `src/App.tsx` (envelopa rotas admin no layout; adiciona redirects legado; `/admin` → `AdminHome`)
- `src/pages/AdminFbi.tsx` (modo "dentro do layout" + suporte a `/admin/legado/:tab` no `handleTabChange`)
- `src/pages/AdminHome.tsx` (remove header próprio do command center, fica só o conteúdo; o shell vem do layout)
- `.lovable/plan.md`

**não toco agora**
- `AdminTutor.tsx` (próximo plano, do tutor IA).
- nenhuma rota fora de `/admin/*`.
- nenhuma tabela ou edge function.

## risco

- `AdminFbi` é pesado (645 linhas) e ainda concentra abas "operação"; transformar ele em "dentro do layout sem header próprio" + suporte a `/admin/legado/:tab` exige cuidado pra não quebrar `useUrlState`. mitigação: condicional simples por `useMatch`, tabs continuam navegando dentro do prefixo correto.
- redirects podem entrar em loop se um path antigo apontar pra si mesmo. mitigação: lista explícita de slugs legado e `Navigate replace`.
- command palette + sidebar em paralelo: foco do trigger e do shortcut precisam não competir; testo `cmd+k` com sidebar aberta e colapsada.

quando aprovar, sigo nessa ordem: 1) AdminLayout + AdminSidebar, 2) App.tsx (rotas + redirects), 3) AdminFbi (modo embutido), 4) AdminHome (limpar header duplicado), 5) CommandPalette, 6) plan.md, 7) validar build/preview.
