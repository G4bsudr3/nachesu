---
name: Onboarding modal states
description: 3 estados do OnboardingDialog no contexto Eletiva Sebrae, baseados em primeiro acesso + disponibilidade do módulo 01
type: feature
---

OnboardingDialog (componente, não a rota /app/onboarding que é legado Chŏra) tem 3 estados pra Eletiva Sebrae:

1. **`primeiro-acesso-aberto`** → primeiro login + módulo 01 publicado/disponível. CTA "abrir o primeiro módulo". Pose `talking`.
2. **`primeiro-acesso-fechado`** → primeiro login + nenhum módulo publicado ainda (eletiva aquecendo). CTA "ver as trilhas". Pose `resting`.
3. **`retorno`** → não é primeiro acesso. CTA "continuar". Pose `building`.

Não regredir: vocabulário Chŏra (FBI, carta de builder, arquétipo, pré-work, tutorial, missões) não aparece mais aqui. Esses conceitos só vivem dentro do fluxo legado atrás da flag `eletiva_extras_enabled`.

A rota `/app/onboarding` (página antiga "trilha em 5 marcos") continua acessível por URL, mas não é mais linkada do dashboard novo.
