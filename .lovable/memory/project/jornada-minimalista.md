---
name: Jornada minimalista
description: Hierarquia única aluno (dashboard → eletiva → módulo) e admin enxuto (operação + legado collapsible)
type: feature
---

# Jornada minimalista (pós-revisão UX)

## Aluno
Hierarquia única, "uma ação por tela":
- `/app` mostra saudação + (switcher se 2+ matrículas) + EletivaCard. CTA único leva direto pra `/app/modulo/:n`.
- `/app/eletiva/:slug` é fallback (entra via switcher/trilhas). Hero + próximo passo + 3 atalhos: mapa, tutor IA, materiais.
- `/app/hub` agora é redirect pra eletiva ativa (ou /app). NÃO recriar HubIndex como página.
- Mobile nav fixa em 3 itens: início, trilhas, tutor. Não adicionar hub/pesquisa sem flag.

Nunca duplicar progresso/CTA entre dashboard e EletivaHome. Quem precisa de map detalhado vai pra `/app/trilhas`.

## Rotas legadas atrás de ExtrasGate
prework, missoes/entregas, carta, tutorial, inicio, onboarding, feedback-final, certificado, carta-futuro + as do hub social (galeria, projetos, album, turma, builder). Só aparecem com flag `eletiva_extras_enabled` ou pra admin.

## Admin
`/admin` default = `eletivas` (não fbi). Logo é `NachesULogo`. Duas TabsList:
- **operação** (sempre visível): eletivas, trilha, tutor IA, materiais, pendentes, usuários, settings
- **legado Chŏra** (collapsible, persistido em `localStorage.admin_show_legacy`): fbi, prework, missoes, cartas, artworks, convidados, emails, feedback-d1, pesquisa final, carta-futuro, votacao-projetos, chora-bot

AdminStats mostra dados reais NachesU (alunos ativos, pendentes, módulos publicados/rascunho, matrículas por eletiva) — NÃO contadores FBI.
