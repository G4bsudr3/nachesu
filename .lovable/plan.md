## diagnóstico

### jornada do aluno hoje
quatro páginas competem pelo mesmo papel:
- `/app` (dashboard) mostra saudação + switcher de eletivas + EletivaCard + TrailsProgress + HubGateway. é o ponto de entrada.
- `/app/eletiva/:slug` mostra hero + "próximo passo" + atalhos pra trilhas/tutor. também é entrada.
- `/app/trilhas` mostra o mapa completo.
- `/app/modulo/:n` é onde o aluno realmente aprende.

resultado: o aluno cai no dashboard, vê duas seções de progresso, dois CTAs ("continuar de onde parou" no card e no hero da eletiva), três caminhos pra mesma coisa e ainda um bloco "quando travar, vem aqui" com tutor + materiais que repete o que aparece dentro da eletiva. nav mobile tem 4 ícones (início, trilhas, tutor, hub), e "hub" leva pra uma página que basicamente repete materiais + tutor.

verificação no banco: 0 respostas FBI, 0 prework_progress, 0 mission_submissions, 4 matrículas em 2 cursos com 40 módulos / 200 pílulas. **a base toda é módulo+pílula. tudo de FBI, missões, prework, cartas, carta-futuro, votação, feedback-d1/final, chora-bot é legado da imersão Chŏra e nunca foi usado pela NachesU.**

### admin hoje
`/admin` tem 19 abas numa única `TabsList` que quebra linha. menos da metade serve à NachesU:

**ativas pra NachesU:** eletivas, eletiva (settings), trilha, tutor IA, materiais, pendentes, usuários
**legado Chŏra (zero uso):** fbi, pré-work (legado), missões (legado), cartas, artworks, convidados, emails (log), feedback-d1, pesquisa final, carta-futuro, votação projetos, chora-bot

19 abas dão impressão de que tudo é igualmente importante. nada sinaliza o que faz sentido tocar hoje.

### best practices que ancoram a reforma
síntese dos guias 2025 de LMS/self-paced (Lazarev, Selleo/SIIT, TPLEX, OpenFieldX):
1. **uma ação por tela.** drop-off acontece nos primeiros 10 min se o aluno precisa decidir entre múltiplos caminhos.
2. **progressive disclosure.** mostra só o módulo atual em destaque; o mapa completo é zoom-out opcional, não tela principal.
3. **progresso visível e significativo.** um único indicador por contexto (não dois).
4. **continuidade > navegação.** "continuar de onde parou" tem que ser o CTA dominante; tudo o mais é secundário.
5. **navegação enxuta.** 3-5 destinos no máximo. cada um precisa de razão clara.
6. **admin minimalista.** tarefas por frequência, não por feature. abas que ninguém abre viram menu secundário ou somem.

## plano

### parte 1 — jornada do aluno

**1.1 dashboard `/app` vira realmente um "hub de entrada", sem competir com a eletiva.**
- mantém: saudação curta + switcher (só quando 2+ matrículas).
- remove do dashboard: `EletivaCard` duplicado, `TrailsProgress` duplicado, `HubGateway` (vira atalho na nav).
- adiciona: 1 ou 2 cards "minhas eletivas" (1 matrícula vira direct-link) com **um único CTA grande "continuar"** que leva direto pra `/app/modulo/:n` do módulo atual, pulando a tela intermediária quando o aluno só tem uma trilha em andamento.
- aluno com 0 matrículas vê `MyCoursesList` (mantém).
- toda a sessão de `extrasEnabled` (NextActionHero, JourneyChips, ArchiveSection) sai do dashboard. fica só atrás de admin/flag.

**1.2 `/app/eletiva/:slug` vira a "home da eletiva", única fonte de verdade dentro do curso.**
- mantém hero + próximo passo + barra de progresso (um lugar só).
- atalhos viram 3: **mapa de trilhas**, **tutor IA**, **materiais** (hoje materiais não aparece aqui, deveria).
- onboarding overlay continua na primeira visita.

**1.3 mobile nav enxuga de 4 (+1) pra 3 itens fixos.**
proposta: `início` → `trilhas` → `tutor`. "hub" sai (era agregador de materiais+tutor; vira atalho dentro de cada eletiva). "pesquisa" continua atrás de extras-flag.

**1.4 página `/app/hub` vira redirect.**
hoje é `HubIndex` repetindo cards. vira `Navigate` pra `/app` ou pra eletiva ativa. `/app/hub/materiais` continua porque é destino real, mas só linkado de dentro da eletiva.

**1.5 rotas legadas escondidas atrás de `ExtrasGate`.**
hoje só `galeria/projetos/album/turma/builder/carta-futuro` estão atrás da gate. mover pra dentro da gate também: `/app/prework`, `/app/missoes`, `/app/entregas`, `/app/carta`, `/app/tutorial`, `/app/inicio`, `/app/onboarding`, `/app/feedback-final`, `/app/certificado`. ficam acessíveis só com a flag `eletiva_extras_enabled` ligada (ou admin) — a infra pra reativar Chŏra fica de pé, mas o aluno NachesU não tropeça nelas.

**1.6 microcopy de continuidade.**
no card da eletiva no dashboard: "**módulo 03 · {título}** · continuar" em vez de "{course.title}" abstrato. cumpre o princípio 4 (continuidade > navegação).

### parte 2 — admin

**2.1 reorganizar `/admin` em 2 grupos visuais, não 19 abas em fila.**

grupo **operação NachesU** (sempre visível, ordem por frequência de uso):
1. eletivas (cursos)
2. trilha (editar módulos/pílulas)
3. tutor IA
4. materiais
5. pendentes (aprovar alunos)
6. usuários
7. settings (renomeada de "eletiva")

grupo **legado / experimental** (collapsed atrás de um toggle "ver ferramentas Chŏra"):
fbi, prework, missões, cartas, artworks, convidados, emails, feedback-d1, pesquisa final, carta-futuro, votação projetos, chora-bot.

implementação: dois `TabsList` separados ou um único com um divider "— legado —" e as últimas abas escondidas por default, lembradas em localStorage.

**2.2 conectar dashboard admin ao real.**
`AdminStats` hoje provavelmente mostra contadores FBI (todos 0). substituir o card de FBI por:
- alunos ativos (com `enrollments`)
- pendentes a aprovar (link direto)
- módulos publicados / em rascunho por eletiva
- pílulas com problemas (sem body, vídeo quebrado) — opcional, segunda iteração

**2.3 breadcrumb e header do admin.**
o título "fbi · respostas" como default da rota `/admin` é resíduo Chŏra. tab default vira `eletivas`. o `ChoraLogo` no header do admin troca pra `NachesULogo` (já existe).

### parte 3 — o que NÃO entra agora

- não apaga rotas legadas, só esconde atrás de gate. Chŏra ainda pode ser reativada.
- não mexe em `Modulo.tsx` ou no player de pílula — funcionam bem, é onde o aluno passa o tempo.
- não troca o `EletivaOnboardingOverlay`.
- não muda schema do banco.
- nada de novo componente visual além de reagrupamentos e remoções.

### escopo de arquivos previstos

```text
src/pages/AppDashboard.tsx       remove EletivaCard duplicado, TrailsProgress, HubGateway, extras-only sections
src/components/layout/MobileNav.tsx   3 itens base (início, trilhas, tutor)
src/pages/HubIndex.tsx           vira redirect
src/pages/EletivaHome.tsx        adiciona atalho "materiais"; copy de continuidade
src/App.tsx                      envolve rotas legadas em <ExtrasGate>
src/pages/AdminFbi.tsx           reagrupa tabs em "operação" + "legado", troca default tab, troca logo
src/features/admin/AdminStats.tsx   stats relevantes pra NachesU (alunos, pendentes, módulos)
```

nenhuma migration. nenhuma edge function nova.

### resultado esperado

aluno: abre `/app`, vê 1 card por eletiva com 1 CTA "continuar", 1 clique pra dentro do módulo. nav inferior com 3 ícones. zero rotas mortas no caminho.

admin: abre `/admin`, cai em "eletivas", vê 7 abas operacionais em uma linha + um toggle pro legado. stats refletem a realidade (matrículas, pendentes, módulos), não FBI zerada.
