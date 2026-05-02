
# Rebrand profundo Eletiva IA na Prática

## Princípio guia

Página-aluno da Eletiva = zero gota, zero estrela Perestroika, zero "chŏra/frattz/25-26 abril/Instituto Caldeira", tom em "você", marca = `<EletivaLogo />` + mascote tutor + paleta Perestroika (cores) + accent Sebrae.

Página Chŏra legada (atrás de `ExtrasGate` ou rota legada) = continua com `<ChoraLogo />`, `<LagrimaGradient />`, copy original. Não toca.

Naming do código (`chora-bot`, `useEletivaExtras`, tabelas) = não muda. É só camada UI.

---

## Inventário do que precisa virar

### Páginas-aluno Eletiva (37 arquivos com sintoma)
- Heros com `<LagrimaGradient />`: Index, Auth, Pending, Onboarding, Tutorial, AppDashboard, Trilhas, Modulo, ResetPassword, PublicForm, MinhaCarta, Certificado, FutureLetter, FeedbackFinal, OnboardingDialog, NextActionHero, EletivaCard.
- Heros com `<EstrelaPerestroika />`: Index, Trilhas, Modulo, Prework, Missions, AppDashboard, AdminModulePreview, WhatIsLovable.
- Copy "frattz" (helper, error, share): Tutorial, MinhaCarta, Pending, Onboarding, OnboardingDialog, NextActionHero, lib/journey, HubMateriais.
- Copy "tu" no lugar de "você": Tutorial, Pending, Onboarding, Index, MinhaCarta, AppDashboard, Trilhas, Modulo, Auth, FbiSchema (perguntas em "tu"), ResetPassword.
- Mensagens com "chora": Tutorial ("expectativa do chora"), HubIndex ("fotos do chora lovable"), Missions ("tutorial chŏra").

### `index.html` (SEO/meta)
- Title, description, og e twitter ainda dizem "chora lovable hub — vai lá e cria … co-produzido por perestroika + frattz".

### Componentes de marca
- `<LagrimaGradient />`: 30 usages. Mantém o componente (legado precisa), cria `<EletivaSymbol />` baseado no mascote `joao-de-barro-tutor.png`.
- `<EstrelaPerestroika />`: 8 usages. Mantém o componente, cria `<EletivaStar />` (variação do glifo sem nome Perestroika) ou usa o mascote como ornamento.

### Certificado (caso especial)
- `CertificateEditorial.tsx` usa `<ChoraLogo />` + `<PeresLogo />` no rodapé. Eletiva = co-branding `<EletivaLogo />` + logo Sebrae institucional.
- `useCertificateDownload.tsx` tem títulos "meu certificado chŏra lovable" e "alta resolução".
- `certificatePresets.ts` descreve "o clássico Perestroika".

### Tom/conteúdo
- `feedbackFinalFlag.ts`: nome "Chŏra Lovable", local "Instituto Caldeira", cidade "Porto Alegre" — fixar pra Eletiva.
- `tutorialSteps.ts`: linha "o que quero sair com no chora lovable: {expectativa_chora}".
- `botAvatar.ts` comentário sobre "vai lá e cria".

### Páginas Chŏra legadas (NÃO TOCAR)
- HubIndex, HubGallery, HubAlbum, HubBuilder, HubProjetos, HubProjetosRanking, HubTurma, HubMateriais (rotas atrás de `<ExtrasGate>`).
- ChoraBot, AdminFbi, AdminConvidados, AdminEmails, AdminFeedbackDia1, AdminFeedbackFinal, AdminFutureLetters, AdminVotacaoProjetos, AdminMissions, AdminMateriais, AdminPending, AdminPrework, AdminStats, AdminCards, AdminArtworks, AdminChoraBot.
- CartaPublica, MinhaCarta versão Chŏra, CertificadoBanner, FeedbackDia1*, FutureLetter*.
- Pasta `src/components/chora-bot/*` e `src/components/hub/*`.
- `<ChoraLogo />`, `<PeresLogo />`, `<BalaoSerrado />`, `<CaixaPrompt />` continuam existindo.

---

## Plano de ação em 7 fases

### Fase 1. Novos componentes de marca Eletiva
1. `EletivaSymbol.tsx` em `src/components/brand/`. Wrapper do mascote `joao-de-barro-tutor.png` com props (`size`, `className`, `rotate`) idênticas a `<LagrimaGradient />` pra drop-in replace.
2. `EletivaStar.tsx` baseado no glifo geométrico atual sem o nome Perestroika. Mesma API de `<EstrelaPerestroika />` (`color`, `size`, `className`).
3. `EletivaLogo` ganha variante `withSebraeAuthority` (composição com asset institucional Sebrae) usada só no certificado.

### Fase 2. SEO + metadata global (`index.html`)
- Title: "eletiva ia na prática — vai lá e cria"
- Description, og, twitter: "eletiva ia na prática da naches u, em parceria com a escola sebrae. 4 trilhas, 20 módulos, tutor IA por trilha."
- author: "naches"
- og-image: pode trocar depois; manter por ora.

### Fase 3. Substituição em páginas-aluno
Aplicar em cada arquivo da lista acima:
- `<LagrimaGradient ... />` → `<EletivaSymbol ... />` (mesma API).
- `<EstrelaPerestroika ... />` → `<EletivaStar ... />`.
- Remover import de `LagrimaGradient`/`EstrelaPerestroika` quando ficar órfão.
- `<EletivaFooter />` confirmado em todas (já tá padrão).

Páginas alvo (somente camada Eletiva):
Index, Auth, Pending, Onboarding, Tutorial, AppDashboard, Trilhas, Modulo, Prework, Missions, ResetPassword, PublicForm, MinhaCarta (a versão eletiva), Certificado, OnboardingDialog, NextActionHero, EletivaCard, AdminEletivaSettings, AdminTrilha, AdminPillsEditor, AdminModulePreview, AdminUsers, AccountSettings, FirstTimeChecklist, DefinirSenhaCard, PasswordStrength, ProtectedRoute, AdminRoute, App.tsx (loader), Modulo loader, TutorChat (lágrima do tutor pode virar mascote miniatura).

### Fase 4. Limpeza de copy
Substituições globais nas páginas-aluno (case-by-case, não regex cega):
- "chora lovable", "chŏra lovable", "chŏra hub", "chŏra" → "eletiva ia na prática" ou simplesmente "eletiva", contexto-dependente.
- "frattz" em mensagens helper/error/share → "equipe naches u" ou "a escola" (instituições, não pessoa).
- "frattz no whatsapp" → "suporte da escola" ou remoção da promessa.
- "instituto caldeira" / "porto alegre" / "25-26 abril" / "vai lá e cria" (só onde for tagline Chora) → remover ou substituir por contexto Eletiva.
- "tu" → "você" (com flexão verbal correta) nas páginas-aluno listadas.
- "fotos do chora lovable" (HubIndex) → fica, é página legada Chŏra.
- "expectativa do chŏra" (Tutorial linha 452 + AdminFbi) → fica, é label do form FBI legado, mas "{expectativa_chora}" no `tutorialSteps.ts` vira "{expectativa}".

Arquivos com copy a revisar:
Tutorial, Onboarding, OnboardingDialog, Pending, MinhaCarta, NextActionHero, Index, Auth, AppDashboard, Trilhas, Modulo, Prework, Missions, AccountSettings, HubMateriais (só helper Eletiva), lib/journey, lib/access (comments), Certificado, useCertificateDownload, certificatePresets, feedbackFinalFlag, botAvatar, tutorialSteps, ProtectedRoute, AdminEletivaSettings (descrição "herdadas do chora lovable"), useEletivaExtras (comment).

### Fase 5. Certificado (co-branding)
- `CertificateEditorial.tsx`: nova variante `eletiva` que renderiza `<EletivaLogo withSebraeAuthority />` no rodapé no lugar de `<ChoraLogo />` + `<PeresLogo />`. Variante `chora` (atual) preservada pros que já baixaram a versão Chŏra.
- `useCertificateDownload.tsx`: title navegador.share = "meu certificado · eletiva ia na prática".
- `certificatePresets.ts`: novo preset "eletiva" como default; preset Perestroika atual marcado `{ legacy: true }` e só listado se `eletiva_extras_enabled`.

### Fase 6. Tutor da trilha
- `TutorChat.tsx`: substitui `<LagrimaGradient />` (avatar e "pensando…") por `<EletivaSymbol />` ou versão pequena do mascote. Coerência com o mascote já mostrado em outros lugares.

### Fase 7. Guard rails e doc
- Atualizar memory `mem://project/identidade-dois-produtos.md` com:
  - símbolo da Eletiva = mascote (`<EletivaSymbol />`), não gota.
  - estrela = `<EletivaStar />`, não Perestroika.
  - lista atual de páginas-aluno migradas vs páginas Chŏra legadas (sem mudança de inventário).
  - regra: nada de "frattz" nem "vai lá e cria" em copy nova das páginas-aluno.
- Atualizar `.lovable/plan.md` com etapa 5 = rebrand executado.
- Adicionar 1 teste leve garantindo que `index.html` não contém "chora lovable" no `<title>`.

---

## Detalhes técnicos (pra dev)

### Drop-in replace sem refactor
Mantém `LagrimaGradient` e `EstrelaPerestroika` no repositório. Páginas Chŏra continuam importando como hoje. Páginas Eletiva trocam a tag JSX e o import — diff pequeno por arquivo, baixo risco.

### Ordem dos commits sugerida
```text
1. brand: cria EletivaSymbol + EletivaStar + EletivaLogo (variant sebrae)
2. seo: atualiza index.html metadata
3. ui: troca LagrimaGradient/EstrelaPerestroika nas páginas-aluno (PR por bloco: auth, dashboard, trilhas, módulos, missões, prework, carta/certificado, tutor, admin-eletiva)
4. copy: normaliza "tu→você" e remove referências a chora/frattz/perestroika nas páginas-aluno
5. certificado: variante eletiva com co-branding sebrae
6. memory + plan.md atualizados
```

### Critério de aceite
- Buscar `LagrimaGradient` em `src/pages/{Index,Auth,Pending,Onboarding,Tutorial,AppDashboard,Trilhas,Modulo,Prework,Missions,MinhaCarta,Certificado,ResetPassword,PublicForm,FeedbackFinal}.tsx` retorna 0.
- Buscar `EstrelaPerestroika` nas mesmas páginas retorna 0.
- Buscar `chora|chŏra|perestroika|frattz|vai lá e cria|instituto caldeira|25.{0,3}26 abril` em strings JSX dessas páginas retorna 0.
- `<title>` do `index.html` não contém "chora".
- Páginas Chŏra atrás do `ExtrasGate` continuam visualmente intactas.
- Tutor da trilha mostra mascote, não gota.

### Fora de escopo (consciente)
- Não renomeia tabelas (`chora_bot_*`, `fbi_responses`, `hub_*`).
- Não renomeia rotas (`/app/chora-bot`, `/app/hub/*`).
- Não muda paleta de cor (Perestroika continua sendo a cara visual).
- Não toca asset Sebrae oficial — placeholder textual no `<EletivaLogo withSebraeAuthority />` até receber arquivo.
- Não mexe em `src/integrations/supabase/types.ts` (auto-gen) nem em migrations.
- Não muda nome de arquivo `LagrimaGradient.tsx` / `EstrelaPerestroika.tsx` — só cria os novos do lado.

### Riscos e mitigação
- **Texto sutil quebra tom**: cada substituição "tu→você" precisa ler natural, não trocar mecanicamente. Vai página por página.
- **Mascote como loading**: `joao-de-barro-tutor.png` é raster, ideal teria SVG. Pra hero/loading uso `motion-safe:animate-pulse` ou rotação leve. Aceitável até receber SVG oficial.
- **Memory/instrução existente**: a regra "Mascotes mantêm paleta Perestroika mesmo no contexto Sebrae" continua válida — `<EletivaSymbol />` herda paleta.
- **Conteúdo dinâmico do banco**: `pbl_prompt`, títulos de trilha/módulo, materials, pills bodies. Não é mexido aqui — admin edita pela UI.

