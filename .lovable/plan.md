
# Plano de correção e ajustes — NachesU

Diagnóstico completo do estado atual. Ordenado por impacto no estudante, do que quebra agora até dívida técnica.

---

## P0 — bugs que afetam o estudante hoje

**1. Progresso "01/40" no header do módulo**
- `src/pages/Modulo.tsx:37` chama `useEletivaProgress()` sem `courseId` → agrega módulos das 2 eletivas.
- Fix: descobrir `courseId` da matrícula ativa antes (igual `EletivaHome.tsx:149` faz) e passar pro hook. `totalModules` passa a refletir só a eletiva ativa.

**2. FAB "tire sua dúvida" aparecendo dentro do próprio tutor**
- `HubLayout.tsx:25` renderiza `<ChoraBotFab />` incondicional.
- Fix: usar `useLocation` no `ChoraBotFab` e esconder quando `pathname` está em `/app/tutor` ou `/app/chora-bot`.

**3. Módulo errado quando aluno tem 2 eletivas**
- `useEletivaProgress()` sem `courseId` também em `OnboardingDialogPage.tsx:13` e `TutorChat.tsx:69`.
- `Modulo.tsx` resolve `moduleRow` por `number` sem filtrar por curso → pode pegar módulo da eletiva errada.
- Fix: escopar todos os callers por `courseId` da matrícula ativa.

---

## P1 — legado Chŏra vazando no fluxo NachesU

**4. Vocabulário "chora" em copy do formulário público de inscrição**
- `src/features/fbi/schema.ts:27` campo `expectativa_chora`.
- `src/features/fbi/usePublicFbiForm.ts:9` `LS_PREFIX = "chora.publicFbi."`.
- `src/pages/AdminFbi.tsx:578` label "expectativa do chŏra".
- Fix: renomear pra `expectativa_eletiva` no schema/UI, migrar LS key com fallback de leitura da chave antiga por 30 dias.

**5. Nome "Chŏra Lovable" hardcoded em config viva**
- `feedbackFinalFlag.ts:14`: `nome: "Chŏra Lovable"` → trocar pra "NachesU".

**6. Logo Chŏra original em páginas acessíveis**
- `CartaPublica.tsx:7` e `CertificateEditorial.tsx:144` importam `ChoraLogo` original (não o alias).
- Fix: mover essas duas pra atrás do `ExtrasGate` ou trocar pra `NachesULogo` conforme a página.

**7. Alias `ChoraLogo` poluindo imports**
- 10+ arquivos fazem `import { EletivaLogo as ChoraLogo }`.
- Fix: substituir todos por `NachesULogo` direto. Pure rename, zero efeito visual.

**8. Componente `TrailBreadcrumb` com STAGES legadas**
- `src/components/hub/TrailBreadcrumb.tsx:6-15` lista "fbi/carta/prework/tutorial/missoes".
- Usado só em páginas atrás de `ExtrasGate`. Fix: marcar arquivo como legado (mover pra `src/components/legacy/`) pra não confundir leitura futura.

**9. localStorage keys com prefixo `chora.*`**
- 6 ocorrências. Fix: criar helper `nsKey(name)` que prefixa `nachesu.` e lê fallback `chora.` por compat. Migrar de forma transparente.

---

## P2 — identidade visual e voz

**10. Emoji 🤙 em toasts de votação**
- `VoteButton.tsx:50`, `GlobalVotingBanner.tsx:64`. Trocar por ícone Phosphor + microcopy lowercase.

**11. Em-dash em telas admin**
- `AdminFbi`, `AdminAula`, `AdminRisco`, `AdminTurma`. Trocar `—` por `·` ou `–` (en-dash) ou simplesmente "sem dado".

**12. `pb-[env(safe-area-inset-bottom)]` solto em `Marco.tsx:91`**
- Padronizar via var `--mobile-nav-h` igual o resto.

---

## P3 — schema, segurança e infra

**13. `lookup_user_by_email` revogado também de `anon`/`authenticated`**
- Risco: tela de login pré-auth quebra. Verificar callers; se necessário, regrantar `EXECUTE` pra `anon`.

**14. `.lovable/_pills_pending.sql` fora do pipeline**
- Conteúdo de pílulas que nunca roda. Fix: ou virar migration formal em `supabase/migrations/`, ou deletar e mover pra seed via edge function admin.

**15. Renomear tabelas `chora_bot_*`?**
- Custo alto (RLS, edge functions, types regen). Recomendação: manter nome no DB, mas renomear pasta `src/components/chora-bot/` → `src/components/tutor/` e exports correspondentes. Zero migration, só rename de arquivo TS.

---

## P4 — dívida técnica (não bloqueia, fazer em segundo momento)

**16. 13 arquivos >250 linhas** — top 3 pra refatorar primeiro: `AdminArtworks` (1.161), `AdminPillsEditor` (982), `Tutorial.tsx` (842).

**17. Dead code confirmado**
- `src/components/hub/FeedbackFinalGlobalNudge.tsx` (186 linhas, zero imports). Deletar.

**18. `@deprecated` antigos** em `cartaTokens.ts`, `useHubInsights.ts`, `access.ts` — limpar quando tocar nos respectivos fluxos.

**19. `GlobalVotingBanner` fora do Suspense principal** faz fetch em rotas públicas. Envolver com guard de `isAuthenticated`.

**20. Atualizar `.lovable/plan.md`** pra refletir esses 20 itens (o plan.md hoje só descreve a migration de segurança já aplicada).

---

## Ordem de execução sugerida (3 ondas)

```text
Onda 1 (sessão única, ~30 min):
  P0 itens 1, 2, 3      → estudante para de ver bugs
  P1 item 5             → nome correto na pesquisa final
  P3 item 13            → verificar e regrantar lookup_user_by_email se preciso

Onda 2 (sessão única, ~45 min):
  P1 itens 4, 6, 7, 9   → expurgo de "chora" do fluxo ativo
  P2 itens 10, 11, 12   → polish de voz e mobile

Onda 3 (quando houver folga):
  P3 itens 14, 15
  P4 itens 16-20
```

## Detalhes técnicos

- **Item 1** depende de adicionar `useActiveCourseId()` (hook novo de 10 linhas que lê a matrícula ativa do `useEletivaProgress` global e devolve o id). Tudo o mais reusa o hook existente.
- **Item 2** é 5 linhas: `const { pathname } = useLocation(); if (pathname.startsWith("/app/tutor") || pathname.startsWith("/app/chora-bot")) return null;`
- **Item 4** requer migration leve renomeando coluna `expectativa_chora` → `expectativa_eletiva` em `fbi_responses` + update do schema TS + update do form. Backup de dados antes.
- **Item 9** é refactor mecânico, posso fazer com find/replace controlado.
- **Item 13** vou rodar primeiro `rg "lookup_user_by_email" src/` antes de decidir.

Confirma que faz sentido começar pela **Onda 1**? Se sim, executo direto sem nova confirmação.
