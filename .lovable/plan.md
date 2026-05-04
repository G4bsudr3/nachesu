## Rebrand pra NachesU + facilitadores na home

Hoje a marca da plataforma é "eletiva escola sebrae". Vamos virar **NachesU** (extensão da Naches pra ensino médio), mantendo a paleta Perestroika, mas adotando o azul Naches `#1E2BB8` como cor institucional do wordmark. A landing também ganha uma seção de **facilitadores**, deixando claro quem conduz cada eletiva.

### 1. Novo wordmark NachesU

Criar `src/components/brand/NachesULogo.tsx` (drop-in replace do `EletivaLogo`, mesmas props: `variant`, `className`, `height`, `showSelo`).

- Usa os 3 PNGs anexados como assets:
  - `src/assets/brand/naches-n.png` (logo_naches_N.png) — o "N" com ponto
  - `src/assets/brand/naches-u.png` (logo_U_nachesU.png) — o "U" com pingo  
  - `src/assets/brand/naches-wordmark.png` (logo_naches.png) — wordmark "naches" pronto
- Composição do wordmark: imagem `naches` + "U" (imagem) coladinho ao lado, na mesma altura, baseline alinhada. Nada de SVG inline custom — usa direto os PNGs anexados pra fidelidade total à logo da Naches.
- `variant="dark"` mantém o azul Naches (`#1E2BB8`). `variant="light"` (sobre fundo escuro) usa filtro CSS pra inverter pro bege Perestroika.
- Selo embaixo opcional: "para o ensino médio" em Urbanist uppercase tracking largo, no azul Naches.

Substituir todos os usos de `EletivaLogo` / `ChoraLogo` na home, header, eletivas, footer, etc. por `NachesULogo`. Manter o arquivo `EletivaLogo.tsx` como re-export pra não quebrar imports legados.

### 2. Token de cor institucional

Adicionar no Tailwind config:
- `naches-azul: #1E2BB8`

Manter paleta Perestroika (rosa/azul/laranja/vermelho) como linguagem visual das eletivas e mascotes. Azul Naches só aparece no wordmark, no selo e em microdetalhes institucionais (footer, "uma plataforma da naches u").

### 3. Atualizar copy/SEO pra NachesU

- `index.html` title: `nachesu · eletivas de ia + economia circular pro ensino médio`
- `index.html` description: tira "escola sebrae" do destaque, coloca "nachesu, a plataforma de eletivas da naches pro ensino médio. ia na prática (com frattz) e economia circular (com dudu)."
- `src/lib/seoRoutes.ts`: substitui menções a "eletivas escola sebrae" por "nachesu" no `ROUTE_SEO` e no `baseDesc`.
- `public/og-image.png`: regerar com wordmark NachesU + 2 eletivas + 2 facilitadores.

Footer da home (`src/pages/Index.tsx`): muda pra `nachesu · uma plataforma naches · eletivas de ensino médio em parceria com escola sebrae`.

### 4. Nova seção "facilitadores" na home

Substitui a atual seção tutor-joão (mantém o joão, mas reposiciona) por uma seção **`#facilitadores`** entre "as duas eletivas" e "tutor joão-de-barro". Layout: 2 cards lado a lado (mobile empilha), cada um com a vibe da eletiva correspondente.

**Card 1 — frattz (ia na prática)**
- Foto/avatar (placeholder vazio com iniciais até receber imagem; já usa o estilo de quote do projeto Lovable para Escolas).
- Nome: "frattz" / nome completo "Mateus Frattezi" como sublinha.
- Tagline: "embaixador global lovable · ceo naches".
- Bio curta (frattz vibe, lowercase, copiando de "Lovable para Escolas"):  
  "construo na frente da turma, com a turma decidindo o caminho. saio deixando algo rodando."  
  + 1 parágrafo: "lidera a naches, b2b saas de gamificação com ia pra educação. trouxe o jeito 'mão na massa' do lovable pra dentro da sala de aula."
- Pills/tags: "embaixador global lovable", "ceo naches", "construindo ao vivo".
- Accent rosa (`#f756a6`) na borda/tag.
- CTA secundário: "ver trilhas de ia na prática →" que ativa `setActiveTab("ia-na-pratica")` e scrolla pra `#trilhas`.

**Card 2 — dudu (economia circular)**
- Avatar placeholder.
- Nome: "dudu obregon" / "Eduardo Obregon".
- Tagline: "empreendedorismo & aprendizagem".
- Bio curta (adaptada do print do linkedin, em lowercase frattz vibe):  
  "ajudo gente e empresa a voar mais alto. carreira em três frentes: empreender, facilitar aprendizagem e mentorar."  
  + 1 parágrafo: "ex-perestroika, ex-500 global, hoje sócio as a service. mistura bagagem de empreendedor com olhar clínico pra metodologia de aprendizagem."
- Pills: "ex-perestroika", "ex-500 global", "sócio as a service", "stanford university".
- Accent azul-perestroika (`#6f77fc`) na borda/tag.
- CTA: "ver trilhas de economia circular →".

A copy é toda lowercase/sem em-dash/sem hashtags conforme guideline. Cada card respeita o accent da sua eletiva (Perestroika), reforçando o sistema visual já existente.

### 5. Pequenos ajustes de copy na home

- Hero kicker (linha "sua escolha · …") mantém, mas o subtítulo do hero passa a mencionar "nachesu" sutilmente: "escolha sua eletiva nachesu".
- Seção "trilhas" e CTAs continuam intactas.
- Adicionar item de menu `#facilitadores` na nav sticky com mesmo highlight de scroll dos demais.

### 6. Arquivos tocados

```text
novo:    src/components/brand/NachesULogo.tsx
novo:    src/assets/brand/naches-n.png
novo:    src/assets/brand/naches-u.png
novo:    src/assets/brand/naches-wordmark.png
edit:    src/components/brand/EletivaLogo.tsx        (vira re-export do NachesULogo)
edit:    src/pages/Index.tsx                         (logo, nova seção facilitadores, item de nav, footer)
edit:    src/pages/Eletivas.tsx                      (logo + footer)
edit:    src/components/layout/EletivaFooter.tsx     (assinatura nachesu)
edit:    src/lib/seoRoutes.ts                        (titles + descriptions)
edit:    index.html                                  (title + meta description + og)
edit:    tailwind.config.ts                          (cor naches-azul)
edit:    public/og-image.png                         (regerar)
edit:    mem://index.md + nova memory mem://project/nachesu-marca.md  (registrar identidade nachesu)
```

### Notas

- Não toco em `App.tsx`, rotas ou banco. É só rebrand visual + copy + nova seção.
- Mantenho `EletivaLogo` como alias por compat (vários arquivos importam).
- Mantenho a paleta Perestroika nas eletivas e mascotes (regra do core memory). Azul Naches é só no wordmark/selo institucional.
- Os PNGs anexados pelo usuário cobrem o wordmark; se depois rolar SVG vetorial oficial da nachesu, troco só o componente.
