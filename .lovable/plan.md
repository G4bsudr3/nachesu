# Fase 1 · fechar o loop de feedback

Cinco entregas que transformam o feedback de "one-shot" em conversa real, com estados claros, garantia de notificação, markdown, recibo de leitura e thread de resposta.

## 1.1 · estado `ajuste_solicitado` + fluxo de re-envio

**hoje:** educador clica "pedir ajuste" e o deliverable vira `status='revisado'` igual ao aprovado — aluno vê o badge mas não tem caminho para corrigir e re-enviar.

**proposta:**
- adicionar `ajuste` ao enum `deliverable_status` (rascunho / enviado / **ajuste** / revisado)
- `FeedbackReviewDrawer`: quando verdict = "pedir ajuste" → grava `status='ajuste'`, mantém `reviewed_at`, `feedback`, `content.review_verdict`
- guardar histórico em `content.history[]` (array com `{submitted_at, reviewed_at, feedback, verdict, tags}`) a cada nova rodada
- `ModuloFeedbackCard` + `DeliverableStatusPill`: novo CTA "revisar e re-enviar" → reabre o deliverable (volta `status='rascunho'`, mantém respostas), aluno edita e re-submete (novo `submitted_at`)
- inbox do educador (`usePendingDeliverables` / `AdminFeedbackInbox`): filtro "ajuste pendente" e contador no badge

## 1.2 · garantir notificação `deliverable_reviewed`

**hoje:** o toast diz "aluno notificado", mas a notificação depende de trigger DB; se falhar, ninguém percebe.

**proposta:**
- criar trigger `AFTER UPDATE ON module_deliverables` que insere em `notifications` quando `reviewed_at` muda de null → not null OU quando `status` muda para `ajuste` (kinds: `deliverable_reviewed`, `deliverable_changes_requested`)
- fallback no `FeedbackReviewDrawer`: se após o save a notificação correspondente não existir em ~2s, fazer insert direto via cliente (idempotente por `target_id + kind`)
- log em `email_send_log` quando notificação dispara email (reusa infra existente)

## 1.3 · markdown leve no feedback

**hoje:** `ModuloFeedbackCard` renderiza com `whitespace-pre-wrap` — markdown do educador vira caractere literal.

**proposta:**
- adicionar `react-markdown` + `remark-gfm` (já comum no projeto)
- whitelist: parágrafo, ênfase, lista, link (target=_blank, rel=noopener), code inline, citação
- preview ao vivo no `FeedbackReviewDrawer` (split textarea / preview)
- mesma renderização no inbox para o educador conferir

## 1.4 · recibo de leitura

**proposta:**
- `module_deliverables.content.feedback_read_at` (timestamptz) — marcado quando aluno abre o módulo e o `ModuloFeedbackCard` entra no viewport (IntersectionObserver)
- no inbox e no perfil 360°: indicador "lido há 2h" / "não lido"
- realtime: educador vê o "lido" sem refresh

## 1.5 · thread de resposta ao feedback

**proposta (mínima, sem virar chat completo):**
- nova tabela `deliverable_messages` (id, deliverable_id, author_id, body_md, created_at, read_at)
- RLS: aluno dono do deliverable + admins podem ler/escrever; INSERT só do próprio author_id
- `ModuloFeedbackCard`: botão "responder ao educador" → textarea curta com markdown, envia mensagem (não muda status)
- `FeedbackReviewDrawer`: thread no rodapé, educador responde inline; notificação `deliverable_message` para a outra parte
- limite leve: 4000 chars/mensagem, sem anexos nesta fase

---

## detalhes técnicos

**migration (uma só):**
- `ALTER TYPE deliverable_status ADD VALUE 'ajuste';`
- `ALTER TYPE notification_kind ADD VALUE 'deliverable_changes_requested';`
- `ALTER TYPE notification_kind ADD VALUE 'deliverable_message';`
- `CREATE TABLE public.deliverable_messages (...)` + GRANTs + RLS + policies
- trigger `notify_on_deliverable_review()` em `module_deliverables`
- trigger `notify_on_deliverable_message()` em `deliverable_messages`
- ambos inserem em `notifications` com link para `/app/eletiva/:slug/modulo/:n#feedback-do-educador`

**frontend tocados:**
- `src/features/admin/FeedbackReviewDrawer.tsx` (verdict ajuste, markdown preview, thread)
- `src/features/admin/AdminFeedbackInbox.tsx` (filtro `ajuste`, badge `não lido`)
- `src/features/admin/usePendingDeliverables.ts` (incluir `status='ajuste'`)
- `src/components/eletiva/modulo/ModuloFeedbackCard.tsx` (markdown, CTA re-enviar, botão responder, thread)
- `src/components/eletiva/modulo/DeliverableStatusPill.tsx` (novo estado `ajuste`)
- `src/features/hub/useStudentFeedback.ts` (refletir novo enum)
- `src/pages/Modulo.tsx` (reabrir deliverable quando status = `ajuste` e aluno clica "re-enviar")
- novo hook `useDeliverableThread(deliverableId)` para a conversa

**realtime já existe** em `module_deliverables` (useStudentFeedback) — só adicionar canal para `deliverable_messages`.

**fora de escopo desta fase:** áudio do educador (4.4), AI-draft (4.3), rubrica configurável (4.1) — entram na fase 4.

---

## ordem de implementação

1. migration (enum + tabela + triggers) → aguardar aprovação
2. atualizar `usePendingDeliverables` + drawer (ajuste + markdown preview)
3. atualizar `ModuloFeedbackCard` + status pill (re-enviar + markdown render)
4. recibo de leitura (IntersectionObserver + update)
5. thread (`deliverable_messages` + hook + UI nos dois lados)
6. teste end-to-end: aluno envia → educador pede ajuste → aluno vê CTA → re-envia → educador aprova → aluno lê → responde "obrigado"

posso seguir?
