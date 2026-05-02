# próximos passos da eletiva ia na prática

## status
- ✅ etapa 1 — progresso por pílula
- ✅ etapa 2 — mapa de trilhas (`/app/trilhas`)
- ✅ etapa 3 — desbloqueio sequencial entre módulos
- ✅ etapa 4 — tutor IA por trilha (joão-de-barro)
- ✅ etapa 5 — rebrand profundo Eletiva (mai/2026)

---

## etapa 5 — rebrand Eletiva (entregue)

**o que ficou pronto:**
- `<EletivaSymbol />` (mascote joão-de-barro) substituiu `<LagrimaGradient />` em todas as páginas-aluno (~25 arquivos).
- `<EletivaStar />` substituiu `<EstrelaPerestroika />` em todas as páginas-aluno e no `PageShell`.
- `index.html`: title, description, og e twitter atualizados pra "eletiva ia na prática · vai lá e cria · escola sebrae".
- copy limpa: removido "frattz" como pessoa nas páginas-aluno (vira "equipe da escola" / "suporte da escola"); removido "chŏra lovable" do `OnboardingDialog`, `NextActionHero`, `tutorialSteps`, `useEletivaExtras`, `ExtrasGate`, `AdminEletivaSettings`, testes.
- tom: "tu/teu/tua" trocado por "você/seu/sua" no `Index` e `Auth`.
- componentes legados (`LagrimaGradient`, `EstrelaPerestroika`, `ChoraLogo`, `PeresLogo`) intactos, ainda usados pelas páginas Chŏra atrás da flag.

**o que ficou fora deste ciclo:**
- certificado co-branding Eletiva + Sebrae no `CertificateEditorial` — depende do asset oficial Sebrae.
- `feedbackFinalFlag.ts` ainda hardcoda nome/local Chŏra — só relevante se a flag for reativada.
- "tu/teu" residual em outras páginas legadas Chŏra — preservado intencionalmente.

**critérios de aceite atingidos:**
- páginas-aluno Eletiva = 0 ocorrências de `LagrimaGradient` e `EstrelaPerestroika`.
- `<title>` do `index.html` não contém "chora".
- páginas Chŏra atrás de `ExtrasGate` continuam visualmente intactas.
- tutor da trilha mostra mascote, não gota.

---

## checklist de rebrand (validação contínua)

usar a cada mudança que toque marca, copy ou meta da Eletiva. cada item tem critério de aceitação objetivo + comando rápido pra confirmar.

### a. strings proibidas em páginas-aluno

| # | regra | aceite | comando |
|---|---|---|---|
| a1 | nenhuma menção textual a "chŏra/chora lovable" fora de páginas legadas | apenas matches dentro de `src/pages/Hub*.tsx` (gated) ou comentários | `rg -ni "chŏra\|chora lovable" src -g '!src/pages/Hub*' -g '*.{ts,tsx}'` |
| a2 | sem "frattz" como pessoa em copy de aluno | só aparece em config/admin/legacy | `rg -ni "frattz" src -g '*.{ts,tsx}' \| grep -v "Hub\|Admin\|legacy\|config"` |
| a3 | tom "você/seu/sua" nas páginas-aluno Eletiva | `rg` abaixo retorna 0 hits fora de Hub*/Admin*/Mascote/Voting/Feedback*Dia1 | `rg -nP "\b(tu\|teu\|tua\|teus\|tuas\|contigo)\b" src -g '*.{ts,tsx}' \| grep -vE "tutor\|tutorial\|atual\|status\|virtual\|situa\|footer\|estrutura\|Hub(Album\|Projetos\|Gallery\|Turma\|Ranking)\|Admin\|Mascote\|Voting\|VoteButton\|GlobalVoting\|TurmaRedes\|AlbumUploader\|FeedbackDia1"` |
| a4 | sem em-dash (`—`) e sem hashtags (`#palavra`) em copy | 0 hits fora de markdown/comentários | `rg -n "—" src -g '*.{ts,tsx}'` e `rg -nP "(^\|\s)#[a-z]" src -g '*.{ts,tsx}'` |
| a5 | sem datas/local do Chŏra ("25-26 abril", "instituto caldeira", "porto alegre") | 0 hits em páginas-aluno | `rg -ni "25.?26 abril\|instituto caldeira\|porto alegre" src -g '*.{ts,tsx}'` |

### b. componentes de marca

| # | regra | aceite | comando |
|---|---|---|---|
| b1 | `LagrimaGradient` só em páginas Chŏra legadas (Hub*, FutureLetter, Mascote, etc.) | matches só nesses arquivos | `rg -n "LagrimaGradient" src -g '*.{ts,tsx}'` |
| b2 | `EstrelaPerestroika` idem | só em legacy + definição | `rg -n "EstrelaPerestroika" src -g '*.{ts,tsx}'` |
| b3 | `ChoraLogo` só atrás de `ExtrasGate` ou em definição | conferir manualmente lista | `rg -n "ChoraLogo" src -g '*.{ts,tsx}'` |
| b4 | páginas-aluno usam `<EletivaLogo />` + `<EletivaFooter />` | Index, Auth, Dashboard, Trilhas, Modulo, Tutorial, Onboarding, Pending, Certificado, FeedbackFinal contêm os imports | `rg -l "EletivaLogo\|EletivaFooter" src/pages` |
| b5 | tutor IA exibe `<EletivaSymbol />` (joão-de-barro), nunca gota | grep no TutorChat e ChoraBot retorna `EletivaSymbol`, não `LagrimaGradient` | `rg -n "EletivaSymbol\|LagrimaGradient" src/components/eletiva/TutorChat.tsx src/pages/ChoraBot.tsx` |

### c. metadados (`index.html`)

| # | regra | aceite | comando |
|---|---|---|---|
| c1 | `<title>` contém "Eletiva" e não "Chŏra/Chora" | grep abaixo só retorna a tag esperada | `rg -n "<title>" index.html` |
| c2 | `meta description` curto (<160) e fala da Eletiva | 1 hit, sem "chora" | `rg -n 'name="description"' index.html` |
| c3 | OG/Twitter tags coerentes (title, description, image) | todas mencionam Eletiva | `rg -nP 'property="og:\|name="twitter:' index.html` |
| c4 | sem em-dash em metas | 0 hits | `rg -n "—" index.html` |

### d. teste rápido pós-mudança (rodar sempre)

um único comando que combina os checks críticos. se imprimir vazio, passou:

```bash
echo "== a1 chŏra ==" && rg -ni "chŏra|chora lovable" src -g '!src/pages/Hub*' -g '*.{ts,tsx}'
echo "== a4 em-dash ==" && rg -n "—" src -g '*.{ts,tsx}' index.html
echo "== a5 datas/local antigos ==" && rg -ni "25.?26 abril|instituto caldeira|porto alegre" src -g '*.{ts,tsx}'
echo "== b5 tutor com mascote ==" && rg -L "EletivaSymbol" src/components/eletiva/TutorChat.tsx
echo "== c1 title ==" && rg -nq "<title>.*[Ee]letiva.*</title>" index.html || echo "FALHA: title sem Eletiva"
echo "== c1 title sem chora ==" && rg -nqi "<title>.*chora" index.html && echo "FALHA: title contém chora" || true
```

salvar como `scripts/check-rebrand.sh` quando rolar a próxima passada e rodar com `bash scripts/check-rebrand.sh`.

---

## próximas opções (não comprometido ainda)

- conteúdo real nos 20 módulos + PBL prompts populados.
- analytics: ver no admin quantas trocas o aluno teve com o tutor por trilha.
- certificado co-branding Eletiva + Sebrae quando o asset oficial chegar.
- "modo evento ao vivo" pra rodar a eletiva presencial em sala.

