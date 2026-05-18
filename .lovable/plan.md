## onda 2 — loop de feedback formativo

ativar o ciclo entrega → revisão professor → feedback visível pro aluno. usa `module_deliverables` que já existe (com `submitted_at`, `reviewed_at`, `reviewer_id`, `feedback`).

### 1. trigger de submissão no lado aluno

hoje as pílulas autosalvam em `module_deliverables.content` mas nunca marcam `submitted_at`. sem isso, nada aparece pro professor.

- em `Modulo.tsx` (ou `ModuloFooter`): quando o aluno conclui o último pill do módulo, marcar `submitted_at = now()` e `status = 'enviado'` no deliverable.
- se já tem feedback (`reviewed_at not null`) e o aluno edita de novo → volta pra `rascunho` e limpa `submitted_at` (re-submissão após "ajustar").

### 2. inbox do professor — `/admin/feedback`

nova rota dentro de `AdminFbi.tsx` (que agrupa abas operacionais) **ou** página standalone `AdminFeedbackInbox.tsx`. proposta: aba nova em AdminFbi pra manter o agrupamento.

filtros no topo:
- curso (select de `courses` matriculados pelo professor / todos pra admin)
- módulo (cascata)
- status: pendentes (default) / revisados / todos

tabela:
- aluno (nickname + display_name)
- módulo (n° + título)
- enviado há (tempo relativo)
- status badge
- ação: "revisar"

ordenação: mais antigos primeiro (FIFO pedagógico).

### 3. tela de revisão única

modal ou drawer ao clicar "revisar":
- header: aluno + módulo + link "ver pílula"
- conteúdo da entrega: render do `content` jsonb (reflexões, respostas PBL, items do radar) em formato leitura
- textarea de feedback (markdown leve, max 2000 chars)
- 5 rubric-chips toggláveis que viram tags no feedback: "clareza", "evidência forte", "aprofundar", "criatividade", "consistência"
- 2 botões: "aprovar" (status=`aprovado`, reviewed_at=now) / "pedir ajuste" (status=`ajustar`)
- ambos gravam `feedback`, `reviewer_id`, `reviewed_at`

### 4. lado aluno — feedback visível

- card "feedback do professor" no topo do `Modulo.tsx` quando `reviewed_at not null` para aquele módulo. mostra nome do revisor + texto + status (aprovado/ajustar).
- `FeedbackBadge` novo componente: bolinha vermelha em ícone na `MobileNav` (e dashboard) quando existe feedback novo (não visualizado).
- tracking de "visualizado": novo campo `feedback_seen_at` na tabela (migration mínima) ou usa localStorage por simplicidade. **proposta: usar localStorage** (`feedback-seen:{deliverable_id}:{reviewed_at}`) pra evitar migration.

### 5. realtime opcional

- `supabase.channel` no admin pra inbox atualizar ao receber nova entrega
- no aluno, atualiza badge quando `reviewed_at` muda

### arquivos

```text
src/pages/Modulo.tsx                           submitted_at on completion, card feedback no topo
src/components/eletiva/modulo/ModuloFooter.tsx trigger de submit no botão "concluir módulo"
src/features/admin/AdminFeedbackInbox.tsx      (novo) lista + filtros
src/features/admin/FeedbackReviewDrawer.tsx    (novo) revisão única
src/pages/AdminFbi.tsx                         adiciona aba "feedback"
src/components/dashboard/FeedbackBadge.tsx     (novo) bolinha vermelha
src/components/layout/MobileNav.tsx            consome FeedbackBadge
src/features/hub/useStudentFeedback.ts         (novo) hook agregador pro aluno
src/features/admin/usePendingDeliverables.ts   (novo) hook pro inbox
```

### sem migration

a tabela `module_deliverables` já tem `submitted_at`, `reviewed_at`, `reviewer_id`, `feedback`, `status`. **opcional**: índice parcial em `(submitted_at) where reviewed_at is null` se a inbox ficar lenta — adiar até precisar.

### entrega

ao final desta onda: professor abre `/admin/feedback`, vê fila, revisa em <2min por aluno, aluno recebe sinal e lê feedback no contexto da aula.
