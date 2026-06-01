## auditoria do admin · funciona, falha, otimiza

revisão fim-a-fim das rotas `/admin/*`, sidebar, command palette, AdminFbi, AdminHome, AdminUsers e features. abaixo o que vi com olhar crítico e o que proponho mudar, em ordem de impacto. nada é implementado neste passo: você decide o escopo antes.

---

### bugs concretos (apertar antes de qualquer refactor)

1. **sidebar com 2 links quebrados.** `AdminSidebar.tsx:41-42` aponta pra `/admin/nudges` e `/admin/rubricas`. essas duas abas existem como `TabsTrigger` dentro de `AdminFbi.tsx:313-314` mas **não estão em `VALID_TABS`** (`AdminFbi.tsx:88`). resultado: clicar "nudges" ou "rubricas" leva à URL `/admin/nudges` mas renderiza o conteúdo de `eletivas` (default fallback). bug silencioso, parece que a tela travou.
   - fix: incluir `"nudges"` e `"rubricas"` em `VALID_TABS` + `TAB_LABELS`.

2. **AdminFbi é um god-component que renderiza tudo em toda navegação.** `src/pages/AdminFbi.tsx` tem 638 linhas e roteia 22 abas via `<Tabs>` + montagem condicional. ele monta `<AdminStats />` no topo (linha ~257) **antes** do switch de aba, então cada navegação dispara queries de stats. e o nome do arquivo ("AdminFbi") induz a achar que é só FBI quando na real é o shell de quase todo admin.
   - dor real: bundle inflado (importa 22 features eager), navegação trava por um instante toda vez que troca de aba, e o nome confunde quem chega no código.

3. **Duas "homes" competindo.** `/admin` → `AdminHome.tsx` (cards de ação, insight IA, funil). `/admin/eletivas` (AdminFbi default) → renderiza `<AdminStats />` no topo + grid de eletivas. **as duas mostram métricas diferentes**: AdminHome usa `useAdminMetrics` (pendentes_revisao, em_risco, modulo_proximo) e AdminStats faz queries diretas à `courses` + `enrollments`. um admin que abrir o sidebar não sabe qual é a fonte de verdade.
   - fix proposto: AdminHome continua sendo a home; AdminStats some do topo de `/admin/eletivas`. ou ambos consomem o mesmo hook.

4. **Vocabulário fora do tom em 30+ pontos**:
   - **em-dash `—`** em pelo menos 20 lugares (`AdminFbi.tsx`, `AdminAula.tsx`, `AdminEletivas.tsx:199`, `AdminEletivaReview.tsx:261`, `AdminArtworks.tsx:450`, etc). regra core: zero em-dash.
   - **"professor"** em copy: `AdminEletivas.tsx:56` ("seu professor"), `AdminNudgeTemplates.tsx:11` (placeholder `{professor}`), comentários em `usePendingDeliverables.ts:21` e `deliverableRendering/*`. regra: "educador".
   - **"aluno"** em placeholder: `AdminEletivas.tsx:251` (`aluno1@escola.br`). URL `/admin/aluno/:userId` (rota inteira). regra: "estudante".

5. **`as unknown as` e `as any` espalhados (25 ocorrências)** em pages/admin e features/admin — sintoma de RPCs não tipadas (`admin_list_users`, `admin_list_pending_profiles`, etc) e de cast pra forçar shape. funciona, mas todo refactor de RPC vai quebrar silenciosamente.

6. **busy-state inconsistente.** padrão `setActing(id)` em `AdminPending`, `setBusyUserId` em `AdminUsers`, `setBusy(true)` em `CommandPalette` — cada feature reinventa. nenhum tem um wrapper único que garanta cancelamento em desmontagem nem feedback acessível (`aria-busy`).

7. **prepara-pra-falhar incompleto.** `AdminPending.handleApprove` (`AdminPending.tsx:60`) faz UPDATE direto na `profiles` do client; depende inteiramente da RLS bater. se a policy mudar amanhã, o toast diz "aprovado" só pra usuário ver "ainda pendente" no próximo refresh. melhor virar RPC `admin_approve_profile(_user_id)` com `RAISE` em caso de erro.

---

### débitos arquiteturais (médio prazo)

8. **3 sistemas de roteamento convivendo dentro do admin**:
   - rotas top-level reais: `/admin`, `/admin/risco`, `/admin/turma`, `/admin/aluno`, `/admin/aula`, `/admin/certificate-sandbox` (`App.tsx:376-381`).
   - rota wildcard `/admin/:tab` → `AdminFbi` que mapeia em interno (`App.tsx:385`).
   - rota legado `/admin/legado/:tab` → mesmo `AdminFbi` (`App.tsx:383`).
   resultado: pra adicionar uma aba nova, você precisa lembrar de **3 lugares**: sidebar, `VALID_TABS`, e o switch interno do AdminFbi (mostrado pelo bug 1).
   - fix: cada aba vira rota real (`/admin/eletivas`, `/admin/convites`, `/admin/feedback`, etc), AdminLayout cuida do shell, AdminFbi vira só o `AdminLegacyHub` legado. menos código, zero risco de fork sidebar↔rotas.

9. **AdminTrilha (729 linhas), AdminTutorCommand (749), AdminAula (782), AdminCards (810), AdminPillsEditor (982), AdminArtworks (1161)** — arquivos gigantes que misturam fetching + UI + business logic. impossível abrir num celular pra ajustar. quebrar em sub-componentes pelo menos pra Artworks/PillsEditor.

10. **N+1 silenciosos**. AdminHome faz uma RPC composta (bom). mas AdminStats roda 4 queries sequenciais em `useEffect` (courses, profiles count, pendentes, módulos publicados) e `AdminEletivas.tsx` busca courses → trails → modules → enrollments por curso em loop. ok pra 2 cursos hoje, fica lento se passar de 5.

11. **`refetchOnWindowFocus: false` global** (`App.tsx:171`) faz sentido pra app-aluno, mas no admin você quer dados frescos. considerar override no QueryClientProvider só pra rotas `/admin`.

12. **realtime ausente em pontos sensíveis**. `AdminPending`, `AdminConvites`, `AdminFeedbackInbox` poderiam usar `supabase.channel(...)` em vez de polling/reload manual — você habilitou realtime no `email_send_log` recente, mas as outras tabelas ficam estáticas até F5.

---

### UX & mobile

13. **mobile sofre.** AdminLayout tem sheet, mas as tabelas (`AdminUsers`, `AdminPending`, `AdminFbi`, `AdminConvites`) saem do viewport. estão dentro de `overflow-x-auto`, então funciona, mas a coluna "ação" precisa de scroll horizontal pra alcançar. proposta: em mobile, virar lista de cards (1 estudante por card com ações inline) em vez de tabela.

14. **command palette sem hits úteis**. `CommandPalette.tsx` lista as 13 abas de operação + 12 legado + 3 ações. faltam ações de impacto: "aprovar próximo pendente", "ir pro último convite falhado", "abrir aluno por email", "regenerar artwork de arquétipo X". hoje é só um menu lateral em forma de modal.

15. **AdminHome.queueItems mostra "0 estudantes em risco crítico" como card.** se zero, deveria sumir ou virar celebração ("ninguém em risco crítico essa semana"). hoje polui.

16. **breadcrumb no header diz só o último nível** (`AdminLayout.tsx:13-19`). em `/admin/aluno/:userId` mostra "admin / admin" (porque o `findLabel` não acha match longo). pequeno, mas cai em todo perfil de aluno.

17. **sem busca global por estudante.** pra encontrar alguém por email/nome você precisa abrir `/admin/usuarios` e filtrar. command palette poderia ter atalho "buscar estudante…" que abre input e leva direto pro `/admin/aluno/:id`.

18. **AdminUsers ainda mostra "chora2026" como reset de senha** (`AdminUsers.tsx:155`). texto legado, copy "redefinir a senha de X para chora2026?" — admin precisa pensar antes de clicar.

---

### o que está bom (pra não regredir)

- `AdminRoute` + `AdminLayout` separação limpa do shell.
- `useAdminMetrics` / `useAdminInsight` viraram fonte única de métrica + insight IA — boa direção.
- `AdminConvites` (recém-feito) tem o padrão certo: stats deduplicadas por `message_id`, filtros, polling explícito.
- `enforce_single_active_enrollment` e RPCs `has_role`-gated cobrem RLS bem.
- novo coluna "eletiva matriculada" em `AdminUsers` fecha um gap real.

---

### plano de ação proposto (em ondas)

**onda 1 · bugs concretos (1 sessão, escopo fechado)**
- corrigir sidebar `/admin/nudges` e `/admin/rubricas` (`VALID_TABS` + `TAB_LABELS`).
- remover `<AdminStats />` do topo de `AdminFbi` (deduplica com AdminHome).
- limpar todos os em-dash do admin (script `sd '—' ' '` em `src/pages/Admin*.tsx` e `src/features/admin/`).
- trocar "professor" → "educador" e "aluno" → "estudante" em copy visível (não nos comments).
- esconder cards de queue com count=0 em AdminHome.
- AdminUsers: trocar "chora2026" por uma senha aleatória mostrada uma vez no toast.

**onda 2 · arquitetura de rotas (1-2 sessões)**
- migrar `AdminFbi` god-component → uma rota por aba, cada feature renderiza direto sob `AdminLayout`. `AdminFbi` vira `AdminLegacy` só pras 12 abas legado. zero `VALID_TABS` fork.
- todas as RPCs admin tipadas no `types.ts` (já gerado pelo supabase, é só remover os `as unknown as`).

**onda 3 · refactor de features grandes**
- quebrar `AdminPillsEditor` (982) e `AdminArtworks` (1161) em sub-componentes (lista, editor, preview, history) — abrir num mobile vira viável.
- mover `AdminPending.handleApprove/handleArchive` pra RPC `admin_set_profile_status`.

**onda 4 · UX e mobile**
- tabela → lista-de-cards em mobile pra `AdminUsers`, `AdminPending`, `AdminConvites`.
- command palette: adicionar "buscar estudante por email/nome" + ações ("aprovar próximo", "ir pro convite falhado").
- realtime nas inboxes (`pending`, `feedback`, `convites`).
- breadcrumb que reconhece rotas dinâmicas (`/admin/aluno/:userId` → "admin / estudantes / {nome}").

---

### como você quer seguir?

posso entrar direto na **onda 1** (bugs concretos, sem mexer em arquitetura) numa sessão só. as ondas 2-4 são maiores e merecem cada uma seu próprio brief — me confirma se quer que eu já dispare a onda 1 e te traga depois um plano detalhado pra onda 2, ou se prefere outra ordem.