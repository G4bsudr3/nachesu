## contexto

a home (`src/pages/Index.tsx`) hoje vende só "ia na prática". mas a base serve **duas eletivas** da escola sebrae:

- **ia na prática** (frattz) — construir um app com ia em 20 semanas
- **economia circular & negócios regenerativos** (dudu) — pensar e prototipar negócios que regeneram

o hero, a tese, as trilhas e o cta final precisam refletir isso sem virar landing genérica. a ideia continua sendo "ia na prática" como produto-âncora, mas a home agora apresenta **as duas eletivas como portas** da escola sebrae 1º ano em.

## o que muda na home

### 1. hero (topo)
- eyebrow: `eletivas · escola sebrae · 1º ano em`
- headline em duas linhas, mantendo league gothic gigante:
  - `duas eletivas.`
  - `um ano pra criar.`
- subcopy: `escolha a sua: construir um app com ia ou desenhar um negócio que regenera. as duas em 20 semanas, com tutor ia do lado.`
- ctas:
  - primário preto `começar agora →` (mantém, vai pra `/auth`)
  - secundário `ver as eletivas ↓` (âncora pra nova section)
- joão-de-barro continua flutuando no canto, pose `celebrating` (mantém)

### 2. nova section "as duas eletivas" (substitui a tese atual)
dois cards lado a lado (stack no mobile), cada um com a identidade da eletiva. usa as cores perestroika já no código.

```text
┌──────────────────────────┐  ┌──────────────────────────┐
│ 01 · IA NA PRÁTICA       │  │ 02 · ECONOMIA CIRCULAR   │
│ frattz                   │  │ dudu                     │
│                          │  │                          │
│ construa seu primeiro    │  │ desenhe um negócio que   │
│ app com ia, do problema  │  │ regenera, do sistema ao  │
│ ao mvp no ar.            │  │ protótipo validado.      │
│                          │  │                          │
│ 4 trilhas · 20 módulos   │  │ 4 trilhas · 20 módulos   │
└──────────────────────────┘  └──────────────────────────┘
```

- ia na prática: accent rosa `#f756a6`
- economia circular: accent azul `#6f77fc` (combina com o azul sebrae da identidade)
- cada card tem hover sutil (lift -4px) e link âncora pra section de trilhas correspondente

### 3. trilhas (section atual `#trilhas`)
vira **tabbed** entre as duas eletivas:
- toggle no topo: `[ ia na prática ] [ economia circular ]`
- ao trocar, o grid de 4 trilhas re-renderiza com os títulos da eletiva escolhida
- dados das trilhas da economia circular vêm do `.lovable/plan.md`: `enxergar / entender / criar / validar` (5 módulos cada)
- mantém o mesmo card design + cores perestroika

### 4. tutor joão-de-barro (section preta)
ajuste de copy pra deixar claro que **cada eletiva tem seu tutor ia escopado** (mesmo joão visualmente, prompt diferente):
- headline: `cada eletiva tem seu tutor.`
- subcopy: `o joão te acompanha nas duas. com ia da naches por trás, ele muda de tom: provocador-builder na ia na prática, investigativo-sistêmico na economia circular.`

### 5. manifesto + cta final
- manifesto: mantém `penso, logo crio. itero, logo fica foda.` (vale pras duas)
- cta final: `bora construir?` → `entrar na eletiva` continua. copy embaixo: `o login te leva direto pra eletiva em que você está matriculado.`

### 6. footer
`eletivas escola sebrae · 1º ano em · construído com lovable`

## arquivos afetados

- `src/pages/Index.tsx` — refactor hero + nova section "duas eletivas" + tabs nas trilhas + ajustes de copy
- `src/lib/seoRoutes.ts` — atualiza title/description da rota `/` pra refletir as duas eletivas (hoje fala só de ia na prática). novo title sugerido: `eletivas escola sebrae · ia na prática + economia circular`
- `index.html` — atualiza `<title>`, `meta description`, `og:title`, `og:description`, `twitter:title`, `twitter:description` no mesmo espírito

## o que **não** muda

- paleta, fontes, mascote, componentes de marca (`EletivaLogo`, `EletivaSymbol`, `EletivaStar`)
- rotas internas, schema, hooks (`useActiveEletiva`, etc.)
- og-images por eletiva (já feitos numa iteração anterior)
- `/app/*` e fluxo de matrícula

## signature moment

a tab das trilhas tem transição com framer-motion `AnimatePresence` + `layoutId` na barra de fundo do tab ativo, criando um morph fluido entre as duas eletivas. cor do accent muda também, dando leitura imediata de "trocou de mundo".
