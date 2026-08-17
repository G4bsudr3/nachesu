# Diagnóstico: legado do Chŏra, canais de mensagem e feedback de entrega

Só investigação. Nenhum arquivo do projeto foi alterado, nenhuma migration rodada.

## Pergunta 1 — legado morto do Chŏra Hub

### a) admin "materiais hub"

- Rota: `/admin/materiais` (item na sidebar, `src/components/admin/layout/AdminSidebar.tsx:58`), resolvida pelo catch-all `/admin/:tab` → `src/pages/AdminFbi.tsx` → `src/features/admin/AdminMateriais.tsx`.
- Tabelas: lê e escreve `hub_materials` (insert/update/delete via `MaterialFormModal` e `useHubMaterials`); o bloco do álbum lê e escreve `hub_settings` (chave `official_photos_url`, via `useHubSetting` em `src/features/hub/useHubAlbum.ts`).
- Estado dos dados: `hub_materials` tem **0 linhas** (0 publicadas), `hub_album_photos` **0 linhas**, `hub_settings` 1 linha.
- Alcance do estudante: existe rota viva `/app/hub/materiais` (`src/pages/HubMateriais.tsx`) e link real em `src/pages/EletivaHome.tsx:438` ("materiais"). Ou seja, a tela do estudante é alcançável, só que sempre vazia.
- Bloco do álbum: `AdminMateriais.tsx:116` diz "cola aqui o link do drive/álbum do fotógrafo. aparece no topo de `/app/hub/album`". **A rota `/app/hub/album` não existe mais** (removida do `App.tsx`). É link do fotógrafo do evento presencial: legado Chŏra, 100% morto.
- Veredito: a *lista de materiais* é infraestrutura genérica que as eletivas podem usar (`hub_materials.course_id` existe e `useHubMaterials` filtra por curso), hoje sem conteúdo. O *bloco álbum/fotógrafo* é evento Chŏra e aponta pra rota inexistente.

### b) estudante "sua conta" → bloco "suas redes"

- Rota: `/app/conta` → `src/pages/AccountSettings.tsx`.
- Tabelas: `profiles.instagram` e `profiles.linkedin` (`AccountSettings.tsx:99`).
- Copy em `AccountSettings.tsx:167`: "se preencher, aparece em **redes da turma**", com `<Link to="/app/hub/turma">`. **`/app/hub/turma` não existe mais** — o clique cai no `NotFound`.
- Consumidor real: `src/features/hub/useTurmaRedes.ts` (RPC `get_turma_socials`), usado só pela página de turma que já foi removida.
- Dados: **0 perfis** com instagram ou linkedin preenchido.
- Veredito: feito pro networking presencial do Chŏra. Hoje é campo órfão com link quebrado.

### Grupo 1 — claramente morto (Chŏra, sem função nas eletivas)

| item | rota / arquivo | tabelas |
|---|---|---|
| bloco "álbum: link das fotos oficiais" | `features/admin/AdminMateriais.tsx:110-135` | `hub_settings` (`official_photos_url`), `hub_album_photos` (0) |
| bloco "suas redes" + link `/app/hub/turma` | `pages/AccountSettings.tsx:160-215` | `profiles.instagram/linkedin` (0), RPC `get_turma_socials` |
| `useHubAlbum.ts`, `useTurmaRedes.ts`, `useHubGallery.ts`, `useHubFeed.ts`, `useMyProjects.ts`, `useComments.ts`, `useReactions.ts`, `useGiphy.ts`, `ProjectFormModal.tsx` | `src/features/hub/*` | `hub_album_photos`, `hub_projects` (0), `hub_comments` (0), `hub_reactions` (0) |
| `useMascoteVoting.ts`, `useFbiLevels.ts`, `useFeedbackDia1.ts`, `useFeedbackFinal.ts`, `useBuilderProfile.ts`, `useBuilderLevel.ts`, `usePostEventStatus.ts` | `src/features/hub/*`, `src/hooks/*` | `mascote_votes`, `fbi_responses`, `hub_event_feedback`, `hub_event_feedback_final`, `builder_cards` |
| todo o conjunto builder card / carta | `features/admin/builderCards/*`, `features/admin/useBuilderCards.ts`, `features/carta/useMyCard.ts`, `components/hub/BuilderQuickView.tsx` (linka `/app/hub/builder/:slug`, rota inexistente) | `builder_cards`, `archetype_artworks`, `archetype_artwork_versions` |
| `src/pages/ChoraBot.tsx` | **não está em nenhuma rota** (o tutor vivo é `pages/TutorPage.tsx`) | `chora_bot_*` |
| alias `/app/chora-bot` | `App.tsx:255` (redirect) | — |

### Grupo 2 — ambíguo, precisa de decisão humana

| item | rota / arquivo | observação |
|---|---|---|
| materiais (lista) | `/admin/materiais`, `/app/hub/materiais` (`pages/HubMateriais.tsx`, `features/hub/useHubMaterials.ts`) | tabela `hub_materials` suporta `course_id`; 0 linhas hoje. serve às eletivas se você quiser publicar PDF/link por curso. o card em `EletivaHome.tsx:438` leva pra uma tela vazia |
| `/app/hub` | `pages/HubIndex.tsx` | já é só redirect pra eletiva ativa; manter ou remover é cosmético |
| `/dossie/:userId` | `App.tsx:293`, `pages/DossieAluno.tsx` | é da eletiva (mini-dossiê do módulo 20, gerado em `PillMiniDossie.tsx`), **mas a rota está dentro do bloco `AdminRoute`** — o estudante que copia o próprio link não consegue abrir. isso é bug, não legado |
| `/admin/pending`, `/admin/risco`, `/admin/nudges` | sidebar 66-68, 77 | nasceram no Chŏra mas operam sobre `profiles`/`evasion_nudges` das eletivas |
| `hub_certificates` | `components/certificate/useCertificateDownload.tsx` | certificado atual das eletivas é `pages/CertificadoEletiva.tsx`; conferir se ainda grava na tabela antiga |
| abas admin `/admin/copy-audit`, `/admin/autosave` | `AdminCopyAudit`, `AdminAutosaveAudit` | ferramenta interna, não é aluno |

### Grupo 3 — vivo e usado pelas eletivas

`/app`, `/app/eletivas`, `/app/eletiva/:slug`, `/app/eletiva/:slug/modulo/:number`, `/app/eletiva/:slug/marco/:trail`, `/app/eletiva/:slug/certificado`, `/app/trilhas`, `/app/notificacoes`, `/app/tutor`, `/app/conta` (só a parte de senha/perfil), `/acompanhamento`, e no admin: `/admin`, `/admin/eletivas`, `/admin/eletiva/:slug/modulos|modulo/:n|avaliacoes`, `/admin/entregas`, `/admin/respostas`, `/admin/pulso`, `/admin/usuarios`, `/admin/convites`, `/admin/notificacoes`, `/admin/publicacao`, `/admin/auditoria`, `/admin/rubricas`, `/admin/tutor`, `/admin/aluno/:userId`, `/admin/turma/:courseId`, e as 19 páginas hardcoded `economia-circular/modulo/2..20`.

## Pergunta 2 — mensagens dos estudantes

### `deliverable_messages` (0 linhas)

- **UI do estudante existe**: `src/components/eletiva/modulo/ModuloFeedbackCard.tsx` (linhas 42, 39) tem `useDeliverableThread(fb?.id)`, botão "responder" e textarea. **Mas só aparece depois que existe uma entrega revisada naquele módulo** (`const fb = feedbacks[0] ?? null` — sem feedback, o card inteiro não renderiza). Não é um canal aberto, é resposta a um feedback.
- **UI do admin existe**: `src/features/admin/FeedbackReviewDrawer.tsx:214`, dentro de `/admin/entregas`.
- Estado: as duas pontas existem, **nunca foram usadas** (0 linhas). Coerente com só 3 entregas revisadas no banco.

### `admin_messages` (0 linhas)

- **Só admin → estudante.** `src/features/admin/studentProfile/useAdminMessages.ts` + edge function `send-admin-message`, disparada de `/admin/aluno/:userId`.
- **Não existe UI de composição pro estudante.** O estudante só recebe: vira notificação `admin_direct_message` em `/app/notificacoes`. Não há campo de resposta.
- Nunca usada (0 linhas).

**Resposta direta:** não existe nenhum canal onde o estudante inicia uma mensagem pro educador. O único caminho estudante → educador é responder dentro de uma entrega já revisada, e como só 3 entregas foram revisadas no curso inteiro, esse canal é praticamente inexistente na prática.

## Pergunta 3 — feedback de entrega revisada

**a) onde aparece:** `src/components/eletiva/modulo/ModuloFeedbackCard.tsx`, renderizado em `src/pages/Modulo.tsx:540`, **no topo do módulo**, logo antes do `ModuloHeader`. Não precisa rolar nem abrir nada: se existe feedback, é a primeira coisa da página. Existe também `DeliverableStatusPill`, que vira atalho e rola até o card (`DeliverableStatusPill.tsx:127`).

**b) a âncora existe:** sim. `ModuloFeedbackCard.tsx:124` tem `id="feedback-do-educador"`, exatamente o hash usado pela notificação e pelo e-mail. **Porém não há nenhum tratamento de hash no `Modulo.tsx`** (nenhum `location.hash`, nenhum `scrollIntoView` no mount). Como o card é renderizado depois do carregamento assíncrono das queries, o navegador tenta resolver o hash antes do elemento existir. Na prática o link cai no topo da página. Nesse caso específico o dano é pequeno, porque o card já está no topo, mas o scroll dirigido não acontece.

**c) o sino:** `src/components/notifications/NotificationBell.tsx` **não é importado por nenhuma tela** (foi removido do header numa iteração anterior). O único acesso a notificações é o item "avisos" da `MobileNav`, que é `sm:hidden` — **só existe no mobile**. No desktop e no tablet largo não existe nenhum ponto de entrada pra notificações.

**d) badge de não lida:** `MobileNav.tsx:42/82` mostra a contagem no item "avisos", e `FeedbackBadge` (`components/dashboard/FeedbackBadge.tsx`) marca o item "início". Só na `MobileNav`, portanto **só no mobile**. E o pior: **a `MobileNav` não é renderizada na página do módulo desbloqueado**. Em `Modulo.tsx` ela só aparece no branch de módulo bloqueado (linha 459); o render principal (linha 500+) não a inclui. Ou seja, dentro do módulo o estudante não tem sino, não tem badge, não tem nada.

**e) e-mail:** existe. Template `supabase/functions/_shared/transactional-email-templates/deliverable-reviewed.tsx`, disparado por `supabase/functions/notify-deliverable-reviewed/index.ts`, chamado a partir de `FeedbackReviewDrawer.tsx`. No `email_send_log` há 4 registros do template (2 envios, cada um com linha `pending` e `sent`): `hey@frattz.com` (03/08) e `joao11522@edu.sebrae.com.br` (04/08). Nenhum erro. Foram 3 entregas revisadas e 3 notificações in-app, mas só 2 e-mails saíram.

Um defeito adicional no mesmo arquivo: `notify-deliverable-reviewed/index.ts:76` busca o perfil com `.eq('id', deliverable.user_id)`, e em `profiles` a chave do usuário é `user_id`, não `id`. O nome do estudante chega vazio no e-mail (cai no fallback `''`).

**Resumo:** o feedback aparece bem posicionado; o que falha é a rota de aviso. Sem sino no desktop, sem `MobileNav` dentro do módulo, sem scroll pela âncora, e com e-mail saindo em só 2 dos 3 casos, o estudante depende de voltar por conta própria ao módulo certo pra descobrir que foi corrigido.
