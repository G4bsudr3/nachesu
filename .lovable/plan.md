# revisão pré-lançamento nachesu — entregue

## o que foi feito nessa rodada

### bloqueadores resolvidos
1. **cadência semanal seedada** (`UPDATE modules`): todos 40 módulos publicados, `available_from` começa amanhã (28/05/2026) 06h BRT e avança 7 dias por módulo. `WeekCadenceStrip` agora mostra countdown real.
2. **metadata corrigido** (`index.html`): `og:url` e `<link rel="canonical">` apontam pra `nachesu.lovable.app`.
3. **ErrorBoundary editorial** (`src/components/system/RootErrorBoundary.tsx`): mascote joão-de-barro pose `thinking`, copy "o joão tá pensando", dois CTAs (recarregar / voltar pro início). Envolve `<App />` em `main.tsx` e isola rotas críticas: `/app` (dashboard), `/app/eletiva/:slug` (home), `/app/modulo/:n` e `/app/eletiva/:slug/modulo/:n` (módulo).
4. **lazy-load completo**: `Auth`, `AppDashboard`, `Pending` saíram do bundle eager. Só `Index` e `NotFound` continuam eager.
5. **aria-busy padronizado** em todas as 9 pílulas (`Pill*.tsx`).

### auditado e já estava ok
- Microfeedback de desbloqueio (3.3): `ModuloPillList` já detecta transição locked→unlocked, anima `pill-unlock` + ring rosa + sublabel "agora é a sua vez" por 4s. Respeita `prefers-reduced-motion`.
- Touch targets: nenhum botão menor que 44px em pills/módulo.
- Mobile responsividade: `/auth` em 390×844 renderiza limpo (validado por screenshot).
- Empty state das pílulas em ModuloPillList tem voz ok.

## o que ficou de fora dessa rodada

### depende de credencial real
- **smoke test funcional ponta-a-ponta** das mod 1 (item 2 do plano). Precisa de conta de aluno real (não admin, pra a trava sequencial valer). Sugestão: frattz roda manual amanhã antes da turma começar, ou cria conta @sebrae temporária e me passa pra eu validar.

### baixa prioridade pré-dia-1
- Revisão de empty states em `MyCoursesList`, `Notificacoes`, `EletivaHome` (estudante sem matrícula raro no início).
- Contraste de azul Sebrae sobre bege em body text (uso institucional só, baixo risco AA).
- Rate limit do tutor IA — verificar edge function antes de pico de uso real.

### pós-launch (já registrado)
- Analytics próprio de cohort, dark mode, PWA install, review de copy das 100+ pílulas pelo educador conforme calendário semanal.

## ordem sugerida pra liberar

1. **agora**: testar local o ErrorBoundary (forçar erro pra ver fallback) — opcional, só pra confiar.
2. **antes de liberar pros estudantes**: smoke test manual da mod 1 (login estudante de teste → completar todas as pílulas → conferir que mod 2 fica scheduled até 04/06).
3. **publish** quando confortável.

## comando pra publicar

`<presentation-open-publish>publicar nachesu</presentation-open-publish>`
