## plano

### 1. liberar só os 3 primeiros módulos de cada eletiva
Data change (não migration):
- `DELETE FROM module_releases WHERE module_id IN (módulos com number >= 4 das duas eletivas)`.
- Resultado: estudante vê só módulos 1, 2 e 3 de **ia-na-pratica** e 1, 2 e 3 de **economia-circular**. Os outros 34 continuam `published=true` no banco, mas escondidos do estudante pelo gate de `module_releases`.
- Quando quiser liberar mais, é só inserir linha em `module_releases` (ou usar o botão que já existe em `/admin/aula/:n`).

### 2. respostas (renomear "feedback")
- Sidebar: `feedback` → `respostas` (rota `/admin/respostas`).
- `/admin/feedback` vira redirect pra `/admin/respostas` (não quebra notificações e bookmarks).
- `AdminFbi`: `VALID_TABS` e `TAB_TITLES` ganham `respostas` (title: "respostas dos estudantes"); `feedback` continua como alias redirecionando.
- Componente `AdminFeedbackInbox`: H1 vira "respostas dos estudantes", subcopy mostra breakdown total.

### 3. inbox mostrar todas as respostas
- Default do filtro de status passa de `pendentes` pra `todos`.
- Ordenação: pendente → ajuste → rascunho → revisado (dentro de cada grupo, mais recente primeiro).
- Subcopy do header passa a mostrar contagem completa: `N respostas · X pendentes · Y em ajuste · Z em rascunho · W revisadas`.

### 4. ocultar contas de teste por padrão
- `usePendingDeliverables` passa a buscar `is_test` no select de `profiles` e expõe no `DeliverableInbox`.
- Toggle "incluir contas de teste" no rodapé da página (off por padrão), igual `AdminRisco` e `AdminUsers`.
- Contagens do header respeitam o toggle.

---

### arquivos
- supabase data op: `DELETE FROM module_releases ...`
- `src/features/admin/usePendingDeliverables.ts` (incluir `is_test`, ordenar)
- `src/features/admin/AdminFeedbackInbox.tsx` (default `todos`, toggle teste, copy "respostas")
- `src/components/admin/layout/AdminSidebar.tsx` (label + rota)
- `src/pages/AdminFbi.tsx` (nova tab `respostas` + alias `feedback`)
- `src/App.tsx` se necessário (redirect explícito)
- `.lovable/plan.md` (atualizar fonte de verdade)

### fora do escopo (confirmado)
- Cadência semanal automática.
- Renomear "feedback do educador" dentro do módulo (esse conceito segue como está).
- Pesquisas legadas Chŏra (`feedback-d1`, `feedback-final`).
