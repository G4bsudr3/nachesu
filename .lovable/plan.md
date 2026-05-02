## diagnóstico: o dashboard hoje está invertido

O `/app` atual (`src/pages/AppDashboard.tsx`) foi desenhado para o **pós-evento Chŏra Lovable** (imersão de 2 dias que já aconteceu). Mas o produto vivo agora é a **Eletiva Sebrae IA na Prática** que está começando — 20 módulos, 4 trilhas, alunos do 1º ano EM. A hierarquia, copy e estados estão totalmente fora do contexto.

### o que está errado, em ordem de gravidade

1. **`<NextActionHero>` ocupa o hero gritando "FECHE O CICLO DA ELETIVA" e "RESPONDER PESQUISA FINAL"**. Para um aluno que acabou de receber acesso, isso é absurdo: ele nunca abriu um módulo. O hero hoje é um seletor entre 3 ações pós-evento (carta pro futuro, pesquisa final, certificado) que não existem no contexto Eletiva Sebrae.
2. **`<EletivaCard>` (a coisa que importa) vem em segundo plano**, com visual mais discreto que o hero gradient.
3. **`<JourneyChips>` mostra carta pro futuro / pesquisa final / certificado** — três ações do produto antigo, irrelevantes pro aluno Sebrae.
4. **`<HubGateway>` mistura tutor + materiais com "galeria" e "projetos da turma"** (extras do Chŏra).
5. **`<ArchiveSection>` "memórias da preparação"** lista carta de builder, pré-work, tutorial, entregas — vocabulário 100% Chŏra, nenhum aluno Eletiva sabe o que é.
6. **Footer diz "eletiva sebrae · escola sebrae · 1º ano EM"** mas o resto da página fala de carta pro futuro. Esquizofrenia.
7. **Onboarding modal** ainda decide estados via `fbiSubmitted` + `cardState` (carta de arquétipo), conceitos do Chŏra que não existem no fluxo Sebrae.
8. **MobileNav e rotas** apontam pra `/app/feedback-final`, `/app/certificado`, `/app/dinamica/carta-futuro` — links zumbis pro aluno novo.

A causa raiz é simples: o produto pivotou de Chŏra (curso passado) pra Eletiva Sebrae (curso vivo), mas o dashboard nunca foi reescrito. Ficou herdando a infra do antigo.

---

## princípio do redesign

> O dashboard do aluno Eletiva responde uma pergunta só: **"o que eu faço agora?"**

Tudo que não serve a essa pergunta sai do hero, vai pra rodapé secundário ou some atrás de flag.

A jornada do aluno Sebrae é linear e clara:
```text
primeiro acesso → conhecer eletiva → módulo 01 → ... → módulo 20 → projeto autoral
```

Não tem 3 ações paralelas no fim. Tem um próximo módulo. Sempre.

---

## nova hierarquia do `/app` (de cima pra baixo)

```text
┌─ HEADER (logo + nick + admin/conta/sair) ─────────────┐
│                                                        │
│  1. SALUDA + CONTEXTO                                  │
│     "oi, {nick}." + 1 frase sobre onde você está       │
│     (varia por estado: primeiro acesso / em curso /    │
│     trilha completa)                                   │
│                                                        │
│  2. HERO ÚNICO: PRÓXIMO MÓDULO  ← protagonista        │
│     - estado A: nada publicado → "trilha aquecendo"    │
│     - estado B: primeiro módulo disponível →           │
│       "começar módulo 01" (CTA gigante)                │
│     - estado C: em andamento → "continuar módulo NN"   │
│     - estado D: tudo concluído → "projeto autoral"     │
│                                                        │
│  3. PROGRESSO DAS 4 TRILHAS (visual, 1 linha)          │
│     barrinhas finas com cor de cada trilha             │
│                                                        │
│  4. APOIO: TUTOR IA + MATERIAIS (2 cards lado a lado)  │
│                                                        │
│  5. (admin only / flag) extras: galeria, projetos      │
│                                                        │
│  6. FOOTER: identidade Sebrae                          │
└────────────────────────────────────────────────────────┘
```

Tudo do pós-evento Chŏra (NextActionHero, JourneyChips, ArchiveSection, links de carta-futuro / pesquisa-final / certificado) **só renderiza atrás da flag `eletiva_extras_enabled`** (que já existe via `useEletivaExtras`). Default: oculto. Quando o admin precisar reabrir pra alguma turma, liga a flag.

---

## o que muda, arquivo por arquivo

### `src/pages/AppDashboard.tsx` — reescrita parcial
- Remove `usePostEventStatus`, `<NextActionHero>`, `<JourneyChips>`, `<ArchiveSection>` do render padrão.
- Adiciona componente novo `<DashboardGreeting nickname={...} state={...} />` no topo.
- Promove `<EletivaCard>` a hero único (estilo + tamanho maiores).
- Adiciona `<TrailsProgress />` (componente novo, abaixo do hero).
- Move `<HubGateway>` pra baixo, simplificado pra 2 cards base (tutor IA + materiais).
- Pós-evento atrás de `useEletivaExtras().enabled === true` apenas.

### `src/components/dashboard/EletivaCard.tsx` — promovido a hero
- Aumenta escala tipográfica (5xl/7xl no título), padding (p-8 sm:p-12).
- Adiciona accent bar gradiente com cor da trilha do módulo atual.
- Mascote `building` (não `peeking`) no canto, em escala maior — ele está construindo COM o aluno.
- Estados:
  - **antes do início (totalPublished === 0)**: copy "sua eletiva começa em breve. enquanto isso, conhece o terreno." + lista as 4 trilhas com pílulas.
  - **primeiro módulo disponível e nada começado**: pré-eyebrow "começa por aqui" + CTA "abrir módulo 01".
  - **em andamento**: eyebrow "continue de onde parou" + CTA "voltar pro módulo NN".
  - **tudo concluído**: copy convidando pro projeto autoral (mantém o que já existe, só ajusta tom).

### `src/components/dashboard/DashboardGreeting.tsx` — novo
Pequeno bloco acima do hero. Lowercase, urbanist, não compete com o hero.
```text
oi, {nick}.
{contextLine}
```
- primeiro acesso: "bom te ver por aqui. abaixo, o seu próximo passo."
- em curso (1+ módulo feito): "boa, você está construindo. {n}/20 fechados."
- pausa longa (>7 dias sem progresso): "faz um tempo. retoma quando der."
- tudo feito: "você fechou os 20 módulos. respeita."

### `src/components/dashboard/TrailsProgress.tsx` — novo
Substitui `<JourneyChips>` no slot "status visual rápido". Mostra 4 trilhas como mini-progress bars horizontais com nome + n/n.
```text
[fundamentos    ████████░░  4/5]
[prompts        ██░░░░░░░░  1/5]
[construção     ░░░░░░░░░░  0/5]
[publicar       ░░░░░░░░░░  0/5]
```
Usa cores `#fe7b02 / #fd4644 / #f756a6 / #6f77fc`. Cada barra é Link pra `/app/trilhas?focus={id}`.

### `src/components/dashboard/HubGateway.tsx` — simplifica
Mantém apenas `tutor IA` e `materiais` como base. Os extras (galeria, projetos) já vêm escondidos atrás da flag — está correto, só revisar copy.

Copy do header muda de "volta sempre que precisar" pra "apoio quando travar".

### `src/components/dashboard/ArchiveSection.tsx` — esconde no fluxo Eletiva
Só renderiza dentro de `<ExtrasGate>` (já existe). Sai do dashboard padrão.

### `src/components/layout/MobileNav.tsx` — revisar itens
Auditar e remover/esconder itens pós-evento (carta pro futuro, pesquisa final, certificado) atrás da flag. Substituir por: hub, trilhas, tutor, conta.

### `src/components/OnboardingDialog.tsx` — readequar 3 estados
Hoje os estados falam de FBI + carta de arquétipo (Chŏra). Reescrever pra Eletiva:
- **estado A — primeiro acesso, módulo 01 disponível**: "boas-vindas à eletiva ia na prática. são 20 módulos divididos em 4 trilhas. o primeiro tá aberto." CTA: "abrir módulo 01".
- **estado B — primeiro acesso, módulos ainda fechados**: "boas-vindas. a eletiva começa em breve, te aviso por aqui." CTA: "ver as trilhas".
- **estado C — retorno, sem progresso recente**: "bom te ver de volta." CTA: "continuar".

Disparado uma vez por sessão (já existe controle).

### `src/pages/Onboarding.tsx` (rota `/app/onboarding`)
Está cheio de FBI / carta de builder / pré-work / tutorial / missões — tudo Chŏra. **Decisão**: esconder essa rota do fluxo Eletiva (continua acessível via URL pra admins). A "trilha em 5 marcos" não cabe mais. Documentar como legado Chŏra.

### footer e copy global
Footer já diz "eletiva sebrae · escola sebrae · 1º ano EM" — mantém.

---

## tom e copy (frattz adaptado pra escola)

Lowercase, "você", frases curtas, sem em-dash, sem hashtags. Mantém a memória core.

Sample do hero estado B (primeiro acesso):
```text
COMEÇA POR AQUI            módulo 01/20
─────────────────────────
o que é IA, no susto
─────────────────────────
desmistificar a IA com a mão na massa.
você vai sair entendendo o que é
modelo, prompt, e por que isso muda
o jogo agora.

[abrir módulo 01 →]    [ver mapa completo]

sua jornada                          0/20
░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

---

## entregáveis

Em ordem de execução, atomizados pra commits separados:

1. Criar `<DashboardGreeting>` e `<TrailsProgress>`.
2. Reescrever `<EletivaCard>` como hero (escala + estados).
3. Reescrever `<AppDashboard>` com a nova ordem; pós-evento sob flag.
4. Simplificar `<HubGateway>` (revisar copy do header) e `<ArchiveSection>` (mover pra dentro do gate).
5. Reescrever 3 estados do `<OnboardingDialog>` com vocabulário Eletiva.
6. Auditar `<MobileNav>` e mover itens pós-evento pra atrás da flag.
7. Atualizar `.lovable/plan.md` documentando o novo dashboard como fonte de verdade do `/app`.
8. Atualizar memória `mem://content/onboarding-states.md` com os novos 3 estados (Eletiva, não Chŏra).

## critérios de aceitação

1. Aluno em primeiro acesso vê: saudação curta → hero "começar módulo 01" → progresso das 4 trilhas → tutor IA + materiais → footer. **Zero menção a "fechar ciclo", "pesquisa final", "certificado", "carta pro futuro"**.
2. Hero ocupa o protagonismo visual (maior tipo, mais padding) que `NextActionHero` ocupa hoje.
3. Mascote no hero usa pose `building`, não `celebrating`.
4. Todos os componentes pós-evento (NextActionHero, JourneyChips, ArchiveSection, links de carta/pesquisa/certificado no MobileNav) só renderizam quando `useEletivaExtras().enabled === true`.
5. OnboardingDialog não menciona FBI nem carta de arquétipo no fluxo Eletiva default.
6. Rota `/app/onboarding` (legado Chŏra) continua acessível mas não é linkada do dashboard novo.
7. Build passa, sem TypeScript errors.

## o que NÃO faço neste plano (pra não escopar demais)

- Não mexo em `/app/trilhas`, `/app/modulo/:n`, nem na lógica de `useEletivaProgress`.
- Não removo arquivos do pós-evento (FutureLetter, FeedbackFinal, Certificado) — ficam vivos atrás da flag pra reuso.
- Não mexo no admin.
- Não gero novos assets do mascote.
- Não mexo em auth nem schema do banco.
