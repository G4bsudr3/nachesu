## o que muda

a `pesquisa final` hoje só aparece como chip discreto no dashboard (`JourneyChips`) e tem um banner pronto (`FeedbackFinalBanner`) que **nunca foi montado em lugar nenhum**. quem ainda não respondeu praticamente não vê convite enquanto navega pelo hub, galeria, projetos, etc.

vou criar uma to-do persistente, leve e divertida que segue a pessoa por todas as páginas autenticadas, com nome próprio (puxado do profile) e tom frattz. mesmo padrão do `GlobalVotingBanner`, mas com mais alma.

## componentes

### 1. `FeedbackFinalGlobalNudge` (novo, montado no `App.tsx`)
sticky no topo, em todas as rotas `/app/*`, escondido nas páginas onde já tem CTA dedicado (`/app/feedback-final`, `/app/pending`, `/app/conta`, `/app/inicio`).

regras de visibilidade:
- só logado, profile ativo
- `feedbackFinalDone === false` (via `usePostEventStatus`, já cacheado 60s, custo zero)
- não respeita `FINAL_FEEDBACK_ENABLED === false`
- dismiss só por **sessão** (`sessionStorage`), não permanente: a pessoa não consegue "matar pra sempre" um lembrete que importa pra fechar o ciclo. abrir nova aba volta.
- conta as visitas dismissadas e, ao 3º dismiss da sessão, encolhe pra um chip flutuante mínimo no canto inferior direito (acima da `MobileNav`, ao lado do `ChoraBotFab`) em vez de sumir totalmente. assim continua presente sem ser chato.

copy personalizada (rotaciona por dia + nome):
- "{nome}, falta tu fechar o ciclo 👀"
- "ô {nome}, 4 minutinhos pra contar como foi?"
- "a gente quer saber tua, {nome}"
- "{nome}, a pesquisa tá esperando tu"

cta: `responder agora →` (link `/app/feedback-final`)

visual: faixa sticky `top-0 z-40`, borda rosa/40, fundo `perestroika-bege` com micro-gradient lateral (mesma família do `FeedbackFinalBanner` existente). uma `LagrimaGradient` 28px à esquerda, copy no centro, CTA preto + X dismiss. respeita `prefers-reduced-motion`.

### 2. `FeedbackFinalChip` (sub-componente, mesmo arquivo)
modo encolhido: chip pílula flutuante posicionado `fixed bottom-[calc(var(--mobile-nav-h)+5rem)] right-4 z-30`, gradiente Perestroika, lágrima 16px + "responder pesquisa". clicar leva direto. clicar no X do chip fecha de vez na sessão.

### 3. integração no `AppDashboard`
manter o `JourneyChips` como está (não regredir), mas o nudge global cobre o gap quando a pessoa navega fora do dashboard.

## arquivos

- **novo** `src/components/hub/FeedbackFinalGlobalNudge.tsx`
- **edit** `src/App.tsx`: importar lazy igual ao `GlobalVotingBanner`, montar dentro do `<AuthProvider>` antes das `<Routes>`
- **delete** `src/components/hub/FeedbackFinalBanner.tsx` (órfão, substituído pelo nudge global; CertificadoBanner também é órfão mas fica fora deste escopo)

## detalhes técnicos

- usa `usePostEventStatus()` que já existe e já é cacheado por 60s, sem nova query.
- usa `useAuth()` pra puxar `user` e o nickname/display_name do profile via novo micro-fetch react-query (cache infinito, key `["profile-nickname", user.id]`) — só pega `nickname, display_name` uma vez e fica.
- variação de copy determinística por `dayOfYear % 4` pra não parecer aleatório a cada render.
- contador de dismisses em `sessionStorage` (`chora:feedback-final-nudge-dismiss-count`).
- esconde se `pathname` começa com `/app/feedback-final`, `/app/pending`, `/app/conta`, `/app/inicio`, `/auth`, `/forms`, `/carta/`, `/c/`, `/admin`.
- não conflita visualmente com o `GlobalVotingBanner` (votação): o de votação tem prioridade e empurra o nudge pra baixo dele (stack natural via 2 stickies).

## fora do escopo

- não mexe no copy/fluxo da página `/app/feedback-final` em si
- não mexe no `CertificadoBanner` órfão (assunto separado)
- não cria modal blocker — convite é leve, não interrompe