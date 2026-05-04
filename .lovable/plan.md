## Limpar a experiência do aluno e dar caminho claro pras 2 eletivas

A captura mostra dois banners legados sobrando no dashboard: o sticky "responder pesquisa" (FeedbackFinalGlobalNudge) e o card grande "fotos do chora lovable" no `/app/hub`. Esses são resíduos da imersão Chŏra. Pra eletiva sebrae eles confundem.

Além disso, o usuário não consegue ter a "visão de aluno cadastrado nas duas eletivas" porque hoje o banco está vazio (0 enrollments, 0 profiles) — mateusfrattezi entrou mas nunca foi matriculado em curso nenhum.

Por fim, o fluxo "matriculado em duas eletivas" está incompleto: o dashboard mostra `MyCoursesList` (lista bonita), mas perde o **próximo passo** (`EletivaCard`) que só aparece quando tem 1 matrícula. Isso quebra a regra de UX de "1 próximo passo único em destaque" e deixa o aluno sem orientação clara.

### Escopo

**1. Remover banners legados que poluem a tela do aluno**

- Tirar `<FeedbackFinalGlobalNudge />` do `App.tsx` (vira lixo enquanto a eletiva tá rolando, e o caminho pra pesquisa final continua pelo `MobileNav` quando a flag de extras estiver ligada).
- Remover o card "fotos do chora lovable" e o `<FutureLetterBanner />` do `HubIndex.tsx`. Eles são da imersão antiga. Se algum dia voltar a fazer sentido, a flag `eletiva_extras_enabled` reativa via admin.
- Manter `<GlobalVotingBanner />` como está — ele já se auto-esconde quando não há sessão de votação aberta, então não polui em estado normal.

**2. Matricular mateusfrattezi nas duas eletivas (via migration)**

Migration que insere os dois `enrollments` pra esse `user_id` específico (busco no `auth.users` por email/metadata e faço `INSERT ... SELECT` pegando os dois course_ids `ia-na-pratica` e `economia-circular`). Idempotente via `ON CONFLICT (user_id, course_id) DO NOTHING`.

Com isso, ao entrar no `/app`, ele vê a "visão dual" real, não mock.

**3. Reformular o dashboard pra quem tem 2 eletivas**

Hoje quando `enrollments.length > 1`, o `AppDashboard` só mostra `MyCoursesList` e some com o `EletivaCard`. Isso quebra a hierarquia "1 próximo passo único".

Nova lógica em `AppDashboard.tsx`:

```text
greeting
↓
[ se 2+ matrículas ]
  hero contextual da eletiva ATIVA  (EletivaCard com snapshot da slug ativa)
  ↓
  "alternar eletiva" — chip horizontal, mobile-first, mostra a outra eletiva
  como toggle (1 toque pra trocar a ativa, atualiza localStorage)
  ↓
  TrailsProgress da ativa
↓
[ se 1 matrícula ]
  comportamento atual (EletivaCard + TrailsProgress)
↓
[ se 0 matrículas ]
  estado vazio do MyCoursesList
↓
HubGateway (sempre)
```

Componente novo enxuto: `EletivaSwitcher` (mobile-first horizontal scroll de pills, accent-bar por eletiva, marca "atual" com ring rosa). Ele aparece tanto no `/app` quanto no `/app/trilhas` no topo, pra trocar de mapa rápido. No desktop, ocupa o canto superior direito do hero como segmented control. Usa o hook `useActiveEletiva` que já existe.

A página `/app/eletivas` (`MinhasEletivas`) continua existindo como "gerenciar matrículas" detalhado, mas o switch rápido vira inline.

**4. Trilhas: indicar de qual eletiva é**

Em `Trilhas.tsx`, no header já mostra "eletiva ia na prática", mas a barra de cor topo do `EletivaSwitcher` ajuda a confirmar visualmente. Quando o aluno troca a eletiva ativa pelo switcher, a página de trilhas reflete na hora (já é a lógica atual via `useEletivaProgress`).

**5. Mobile-first é o default — só checar**

Tudo já é mobile-first. Confirmar que o novo `EletivaSwitcher` respeita touch target 44px, scroll horizontal sem corte, e se ajusta a desktop como segmented control via media query.

### Arquivos tocados

```text
edit:    src/App.tsx                              (remove FeedbackFinalGlobalNudge)
edit:    src/pages/HubIndex.tsx                   (remove banner fotos + carta futuro)
edit:    src/pages/AppDashboard.tsx               (novo fluxo p/ 2 matrículas: hero + switcher + trilhas)
edit:    src/pages/Trilhas.tsx                    (adiciona EletivaSwitcher no topo)
create:  src/components/dashboard/EletivaSwitcher.tsx
migration: insere enrollments pro user mateusfrattezi nas 2 eletivas
```

### Não faz parte deste plano

- Refazer copy ou layout do hero/EletivaCard (já está sólido).
- Mexer em `HubGateway`, `MobileNav`, `ChoraBotFab` — funcionam bem e respeitam a flag `eletiva_extras_enabled`.
- Apagar arquivos de extras (`FutureLetterBanner`, banner fotos do hub) — só desconectar do fluxo. Ficam disponíveis pro modo Chŏra legado.
- Tocar no `Index.tsx` (landing) — fora do escopo de "experiência do aluno logado".
