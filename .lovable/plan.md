# Dashboard `/app` — fonte de verdade (Eletiva Sebrae)

Atualizado quando o dashboard do aluno mudar de hierarquia ou copy. Esse arquivo descreve o estado atual implementado.

## princípio

> O dashboard do aluno Eletiva responde uma pergunta só: **"o que eu faço agora?"**

A jornada é linear: primeiro acesso → módulo 01 → ... → módulo 20 → projeto autoral. Não há "fechar ciclo", "pesquisa final" ou "carta pro futuro" no fluxo padrão (esses conceitos vêm do produto legado Chŏra Lovable e só renderizam atrás de `eletiva_extras_enabled`).

## hierarquia de cima pra baixo

```text
HEADER (logo + nick + admin/conta/sair)
  1. DashboardGreeting   → "oi, {nick}." + 1 frase contextual
  2. EletivaCard (HERO)  → próximo módulo (estado A/B/C/D)
  3. TrailsProgress      → 4 trilhas, mini-progress
  4. HubGateway          → tutor IA + materiais (apoio)
  5. (flag) NextActionHero + JourneyChips + ArchiveSection — pós-evento Chŏra
FOOTER (eletiva sebrae · escola sebrae · 1º ano EM)
```

## estados do hero (`EletivaCard`)

- **A — aquecendo**: `totalPublished === 0`. Copy "sua eletiva tá aquecendo", lista as 4 trilhas, mascote `building` decorativo. Sem CTA primário.
- **B — primeiro passo**: tem módulo aberto, `totalCompleted === 0`. Eyebrow "começa por aqui", CTA "abrir módulo 01".
- **C — em andamento**: tem módulo atual, já fechou pelo menos 1. Eyebrow "continue de onde parou", CTA "voltar pro módulo".
- **D — completo**: `currentModule === null` e `nextModule === null`. Fundo preto, mascote `celebrating`, CTA pro projeto autoral.

## estados da saudação (`DashboardGreeting`)

- aquecendo: "a eletiva está aquecendo. enquanto isso, dá uma olhada no mapa."
- primeiro passo: "bom te ver por aqui. abaixo, o seu próximo passo."
- em curso: "boa, você tá construindo. {n}/{total} fechados."
- pausa longa (≥7d): "faz {n} dias. retoma quando der."
- tudo feito: "você fechou tudo o que tá aberto. respeita."

## componentes do pós-evento Chŏra (atrás de flag)

`NextActionHero`, `JourneyChips`, `ArchiveSection`, `OnboardingDialog` legado, rota `/app/onboarding` (5 marcos), `MobileNav` item "pesquisa", rotas `/app/feedback-final`, `/app/certificado`, `/app/dinamica/carta-futuro`, `/app/carta`, `/app/prework`, `/app/tutorial`, `/app/entregas` — todos vivem, mas só aparecem com `useEletivaExtras().enabled === true` (admin liga em `/admin`).

## copy do hero — exemplo estado B

```text
COMEÇA POR AQUI            módulo 01/20
─────────────────────────
{título do módulo}
─────────────────────────
{objetivo do módulo, lowercase, 1-2 frases}

[abrir módulo 01 →]    ver mapa completo

⏱ {min} min   ● {trilha}
```

## OnboardingDialog (componente)

Reescrito pra 3 estados Eletiva: `primeiro-acesso-aberto` / `primeiro-acesso-fechado` / `retorno`. Sem vocabulário Chŏra. Detalhes em `mem://content/onboarding-states.md`.

## checklist de rebrand pós-Chŏra (ainda válido)

Critérios pra qualquer mudança de UI no dashboard:

1. Nenhuma string menciona "FBI", "carta de builder", "carta pro futuro", "pesquisa final", "fechar ciclo", "certificado", "pré-work", "missões", "tutorial" fora de `<ExtrasGate>` ou da flag `extrasEnabled`.
2. Mascote nunca aparece com pose `celebrating` no estado de primeiro acesso.
3. `<title>` do documento começa com "Eletiva Sebrae" no fluxo padrão.
4. Footer mantém "eletiva sebrae · escola sebrae · 1º ano EM".

### teste rápido por amostragem

```bash
# nenhuma string proibida fora de ExtrasGate / arquivos legados
rg -n "fechar o ciclo|pesquisa final|carta pro futuro|carta de builder" \
  src/pages/AppDashboard.tsx \
  src/components/dashboard/EletivaCard.tsx \
  src/components/dashboard/DashboardGreeting.tsx \
  src/components/dashboard/TrailsProgress.tsx \
  src/components/dashboard/HubGateway.tsx \
  src/components/OnboardingDialog.tsx
# esperado: 0 matches
```

## o que NÃO foi tocado

- Lógica de `useEletivaProgress`, `usePostEventStatus`.
- Schema do banco, RLS, edge functions.
- Páginas `/app/trilhas`, `/app/modulo/:n`, `/app/tutor`, `/app/hub/*`.
- Admin.
- Assets do mascote.
