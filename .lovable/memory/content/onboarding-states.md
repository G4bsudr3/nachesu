---
name: Onboarding modal states
description: 3 estados do OnboardingDialog no AppDashboard, baseados em fbiSubmitted + cardState
type: feature
---

OnboardingDialog tem 3 estados, decididos por `fbiSubmitted` + `cardState`:

1. **!fbiSubmitted** → variante "responda o fbi". Title "boas-vindas". CTA primário "responder o fbi agora" → `/forms`. Cenário: pessoa entrou via link público de outra pessoa, não respondeu o forms.
2. **fbiSubmitted && cardState !== "publicada"** → "o frattz tá finalizando". CTA "ir pro hub".
3. **fbiSubmitted && cardState === "publicada"** → "ver minha carta" → `/app/carta`.

Não regredir: o modal NÃO pede pra responder forms quando a pessoa já respondeu (excluindo o caso 1).
