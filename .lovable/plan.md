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

## próximas opções (não comprometido ainda)

- conteúdo real nos 20 módulos + PBL prompts populados.
- analytics: ver no admin quantas trocas o aluno teve com o tutor por trilha.
- certificado co-branding Eletiva + Sebrae quando o asset oficial chegar.
- "modo evento ao vivo" pra rodar a eletiva presencial em sala.
