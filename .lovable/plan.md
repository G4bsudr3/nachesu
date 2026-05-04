## Diagnóstico: o que faz sentido, o que não faz

### O que está bom (manter)
- **Schema multi-curso já correto:** `courses` → `trails` → `modules` → `module_pills`, com `enrollments(user_id, course_id)`. Os 2 cursos estão lá com as 4 trilhas cada (IA: 19 módulos vs 20 prometidos no PDF; Eco: 20). Hook `useEletivaProgress(courseId)` escopa por curso. Isso é a fundação certa pra hospedar duas eletivas.
- **Camada de identidade:** `EletivaSymbol` com 6 poses, `NachesULogo`, `EletivaFooter`, paleta Perestroika + azul Sebrae bem amarradas via tokens.
- **Flag `eletiva_extras_enabled`** isolando tudo que é resíduo Chŏra (galeria, álbum, projetos, builder, carta-futuro, votação, mascote, pesquisa final). Bem feito conceitualmente. `ExtrasGate` no router protege rotas.
- **`useActiveEletiva` + `EletivaSwitcher`** pra alternar quando há 2 matrículas. Mobile-first, persistente em localStorage.
- **Lazy loading** das rotas secundárias no `App.tsx`.
- **`MyCoursesList`, `EletivaCard`, `TrailsProgress`** são bem fatorados.

### O que está bagunçado (problema)

**1. Identidade do produto está confusa em código vs UI.**
A base segue chamando tudo de "chora", "perestroika", "imersão", "turma", "futuro" enquanto a UI já é NachesU/Sebrae. Vai ficar pior à medida que evoluir. Pelo menos 30+ arquivos misturando os dois mundos.

**2. Pasta `pages/` virou despensa (37 arquivos).** Conviveriam: páginas core da eletiva (AppDashboard, Trilhas, Modulo, MinhasEletivas, Eletivas, AccountSettings) + páginas legadas Chŏra (HubAlbum, HubBuilder, HubGallery, HubProjetos, HubProjetosRanking, HubTurma, FutureLetter, FeedbackFinal, Certificado, Missions, Tutorial, MinhaCarta, CartaPublica, Onboarding, OnboardingDialogPage, Prework, ChoraBot). **17 das 37 páginas são legadas.** Tudo gated por `ExtrasGate`, mas continuam no bundle (lazy mas presentes), continuam nos resultados de busca, continuam confundindo quem lê o código.

**3. Hub é Chŏra puro. Não tem hub-de-eletiva.**
`HubIndex` ainda fala "tudo que rola entre nós", mostra "galeria/turma/materiais/projetos" como 4 portas iguais, sendo que 3 dessas 4 são extras-gateadas. Aluno chega lá, clica "galeria" e é redirecionado pro `/app`. UX quebrada por padrão.

**4. `Eletivas.tsx` (catálogo público) duplica os dados de trilhas que estão hardcoded em `Index.tsx`.** Duas fontes de verdade pra mesma coisa. Quando o curso evoluir, vai dessincar.

**5. Tutor IA é genérico, não tem contexto de eletiva.**
- Rota `/app/tutor` aponta pra `ChoraBot` (pergunta sobre Chŏra Lovable).
- Já existe `tutor-trail-chat` edge function + componente `TutorChat` no `Modulo.tsx`, escopado por trilha. Ótimo no módulo, mas o ícone "tutor" do MobileNav abre o bot Chŏra. Aluno fica perdido.

**6. Mismatch IA na Prática: PDF tem 20 módulos, banco tem 19** (falta o módulo 1). Confirma faltando módulo de boas-vindas/abertura.

**7. Banner de votação global ainda no `App.tsx`** pra todo aluno logado, mesmo com extras desligado. Auto-esconde quando não tem sessão, mas é uma chamada de query desnecessária pra todo aluno.

**8. Caminho do aluno não tem onboarding contextual por eletiva.** Quando matricula em IA, não há "boas-vindas, aqui está sua semana 1". Só cai no dashboard. PDF da IA descreve um "módulo zero / pílula a" de orientação que não existe.

**9. `Modulo.tsx` (559 linhas) faz tudo:** fetch, mutations, render de pills, tutor, certificate. Precisa quebrar em pelo menos: header, lista-de-pills, painel-tutor, footer-de-progresso.

**10. `Index.tsx` (924 linhas) está obeso.** Hero + dois cards + sobre + facilitadores + faq numa única página. Funciona, mas qualquer ajuste pequeno custa caro.

**11. Naming das rotas inconsistente:**
- `/app/missoes` e `/app/entregas` apontam pra mesma página
- `/app/inicio` e `/app/onboarding` apontam pra páginas diferentes (uma é pré-curso, outra é dialog)
- `/app/carta` (Chŏra) ainda acessível mesmo com extras off

**12. Conteúdo dos módulos incompleto.** Banco tem títulos, mas faltam as pílulas (`module_pills`) populadas a partir dos PDFs anexados. Sem isso, o módulo abre vazio.

---

## Plano de reorganização

Quatro frentes em ordem de prioridade.

### Frente 1 — Limpar a casa (alto impacto, baixo risco)

**1.1 Renomear semanticamente sem quebrar imports:**
Mover páginas legadas Chŏra pra `src/pages/legacy/` e atualizar imports no `App.tsx`. Mantém funcional, mas sinaliza visualmente "esse código não é da eletiva".
```text
src/pages/legacy/
  HubAlbum, HubBuilder, HubGallery, HubProjetos, HubProjetosRanking,
  HubTurma, FutureLetter, FeedbackFinal, Missions, Tutorial,
  MinhaCarta, CartaPublica, Onboarding, OnboardingDialogPage, Prework, ChoraBot
```
Idem `src/components/` → mover `hub/`, `carta/`, `chora-bot/`, `prework/`, `tutorial/`, `onboarding/` pra `legacy/`. `eletiva/`, `dashboard/`, `brand/`, `layout/`, `auth/`, `ui/` ficam.

**1.2 Remover rota `/app/tutor` apontando pro ChoraBot.** Tutor virou a aba do módulo (TutorChat já existe). Deixar `/app/chora-bot` só atrás da flag extras.

**1.3 Tirar `<GlobalVotingBanner />` do `App.tsx`** ou trancar atrás da flag. Hoje toda sessão de aluno faz query inútil.

**1.4 Padronizar rotas:** remover alias `/app/missoes` (vira `/app/entregas`), tirar `/app/inicio` se não usado, padronizar a pasta `dinamica/` atrás da flag.

### Frente 2 — Tornar o hub um hub-de-eletiva, não um hub-Chŏra

**2.1 Reescrever `HubIndex.tsx`** com 3 portas reais:
- **materiais da eletiva ativa** (filtra `hub_materials` por `course_id`, hoje é global)
- **tutor IA da trilha atual** (link contextual pra última trilha aberta)
- **minhas entregas** (renomeia `mission_submissions` por aluno na eletiva ativa)

Quando flag extras ON, somam-se as 4 portas legadas.

**2.2 Adicionar `course_id` em `hub_materials`** (migration). Materiais hoje são globais. Precisamos filtrar por eletiva, senão aluno de IA vê material de Eco.

**2.3 Criar `<EletivaContextBanner />`** nas páginas de hub mostrando "você está em ia na prática · trocar". Reaproveita `EletivaSwitcher`.

### Frente 3 — Caminho do aluno por eletiva (UX core)

**3.1 Onboarding contextual por matrícula.** Primeira visita ao `/app/trilhas?eletiva=ia-na-pratica`, mostrar overlay de boas-vindas: "oi, isso aqui é seu mapa. liberamos 1 módulo por semana. clica no primeiro pra começar". Persistir flag por (user_id, course_id) em `profiles.onboarded_courses jsonb`.

**3.2 "Próximo passo único" honesto no dashboard:**
- Hoje o `EletivaCard` mostra "próximo módulo" mas com 2 matrículas e ambas no módulo 5, fica ambíguo. Adicionar selo "atual" claro + ação primária "continuar módulo X de IA na Prática".
- Mostrar nº da semana esperada vs nº onde o aluno está (lag/avanço). Ex: "estamos na semana 4. você completou 2".

**3.3 `Modulo.tsx` quebrado em 4 componentes:**
```text
src/components/eletiva/modulo/
  ModuloHeader.tsx       (título, trilha, voltar, número)
  ModuloPillList.tsx     (pílulas + check)
  ModuloTutorPanel.tsx   (TutorChat existente, só envolve)
  ModuloFooter.tsx       (próximo módulo, certificado, voltar pro mapa)
```
`Modulo.tsx` vira ~120 linhas só de orquestração.

**3.4 Página de aterrissagem por eletiva:** `/app/eletiva/:slug` (overview da eletiva: pitch, professor, calendário, próximos 3 módulos). Hoje só tem `/app/trilhas` (mapa cru) e `/app/eletivas` (gerenciar). Falta o "home da eletiva".

**3.5 MobileNav contextual:** trocar ícone "tutor" pra "minha eletiva" → link pra `/app/eletiva/:slug-ativa`. Tutor permanece dentro do módulo (que é onde faz sentido).

### Frente 4 — Conteúdo das eletivas (sem isso, nada vive)

**4.1 Migration pra criar módulo 1 da IA na Prática** (faltando no banco), espelhando o PDF: título, objetivo, posicionar como módulo de boas-vindas/abertura na trilha 1.

**4.2 Migration popular `module_pills`** dos 40 módulos (20 IA + 20 Eco) a partir dos PDFs anexados. Estrutura padrão por módulo:
- pílula A (aula curta), pílula B, pílula C
- exercicio_pbl
- registro/evidência

Volume grande mas mecânico — gerar SQL via script lendo os PDFs já parseados. Aprovação separada antes de executar.

**4.3 Padronizar `hub_materials` com `course_id`** (migration da frente 2.2) e popular materiais iniciais por eletiva (links curados que cada professor enviar).

**4.4 Calendário de release semanal:** `module_releases(course_id, module_id, release_at)` já existe. Popular pra ambas eletivas com início em março/2026, 1 por semana.

---

## Arquivos tocados (resumo, sem detalhar cada migration)

```text
move:    pages/{Hub*,Future*,Feedback*,Missions,Tutorial,MinhaCarta,
                CartaPublica,Onboarding,OnboardingDialogPage,Prework,ChoraBot}.tsx
         → pages/legacy/
move:    components/{hub,carta,chora-bot,prework,tutorial,onboarding}
         → components/legacy/
edit:    App.tsx (remove rotas duplicadas, ajusta imports, tira GlobalVotingBanner global)
edit:    pages/HubIndex.tsx (vira hub-de-eletiva)
edit:    components/dashboard/EletivaCard.tsx (próximo passo + lag de semana)
edit:    components/layout/MobileNav.tsx (tutor → minha eletiva)
edit:    pages/Modulo.tsx (quebra em 4 componentes)
create:  pages/EletivaHome.tsx (/app/eletiva/:slug)
create:  components/eletiva/modulo/{ModuloHeader,ModuloPillList,ModuloTutorPanel,ModuloFooter}.tsx
create:  components/eletiva/EletivaContextBanner.tsx
create:  components/eletiva/EletivaOnboardingOverlay.tsx
migrations:
  - add courses.id FK em hub_materials
  - add profiles.onboarded_courses jsonb default '[]'
  - insert módulo 1 IA na Prática
  - populate module_pills (todos os 40 módulos) — script lendo PDFs
  - populate module_releases (calendário semanal)
delete:  data hardcoded de trilhas em Index.tsx (pull do banco)
```

## Fora deste plano (intencional)

- Não excluir páginas legadas Chŏra. Mover pra `legacy/` mantém histórico e permite reativação via flag.
- Não mexer no design system (paleta, fontes, EletivaSymbol). Está sólido.
- Não tocar em auth, RLS, ou edge functions de Chŏra (carta, mascote, votação) — ficam dormindo.

## Como vou tocar isso

Ordem sugerida em 4 entregas separadas (cada uma aprovável):
1. **Frente 1** (limpar + reorganizar pastas) — 1 entrega, baixo risco.
2. **Frente 4** (conteúdo dos módulos) — 1 entrega, é o que destrava tudo.
3. **Frente 3** (caminho do aluno + Modulo refatorado) — 1 entrega.
4. **Frente 2** (hub-de-eletiva) — 1 entrega final.

Posso ir entregando uma por vez pra você validar entre cada, ou puxar tudo de uma vez. Diz como prefere.