# próximas melhorias da nachesu

já fechamos os bloqueios críticos (segurança, rubrica, feedback editorial, escalation). a lista abaixo é o que ainda dá retorno alto pra experiência do estudante e do educador, agrupado por impacto.

## 1. fechar o que ficou do qa-report (sprints 2-3)

quick wins que ainda não foram implementados:

- **T2.1 — CTA disabled visual.** botão "concluir pílula" / "seguir pro radar" continua laranja chamativo mesmo desabilitado. estudante clica e nada acontece. fix: opacity 50 + cursor not-allowed + microcopy "responde antes de seguir" em `PillEditorial.tsx`.
- **T2.2 — banner "definir senha" pra quem já tem senha.** `profiles.has_password` não atualiza via `admin.updateUserById`. fix: trigger em `auth.users` ou checar `encrypted_password IS NOT NULL`.
- **T2.3 — nickname uppercase com ponto** ("MATEUS.FRATTZ."). sanitizar em `handle_new_user` com regex + capitalize.
- **T2.5 — copy "aluno" → "estudante"** no admin (sidebar, colunas, textareas, "limite diário por aluno"). grep+replace global.
- **T2.6 — em-dash em notificações** ("módulo 1 — IA na Prática"). trocar por `·` no trigger `notify_deliverable_reviewed`.
- **T2.7 — TutorConsentModal dismissable.** estudante pode fechar no X sem aceitar. customizar `DialogContent` sem close.
- **T3.1 — balão do tutor com gradiente roxo-rosa-laranja genérico.** usar `--primary` sólido em `BotMessage.tsx`.
- **T3.2 — textarea do tutor não limpa após envio.**
- **T3.3 — logo NachesU corta em desktop 1366px** na `/app`.
- **T3.4 — microcopy "0 de 1 módulos liberados já são seus"** confusa, reescrever.
- **T3.5 — markdown `**negrito**` cru renderizado** em algumas mensagens do tutor.

## 2. experiência do educador (admin)

hoje o admin é funcional mas frio pra rotina de avaliação em escala:

- **filtro por estudante no `/admin/feedback`** (T4.1). com 60+ estudantes vira inviável só cronológico.
- **filtro por módulo + por status** (pendente / respondida / rascunho) na mesma tela.
- **banner vermelho fixo de evento de risco no topo** do AdminHome (T4.3), não só card no meio.
- **drawer de feedback: navegar entre entregas com ← →** sem fechar e reabrir.
- **atalho "marcar como ok sem nota"** pra pílulas editoriais em massa.
- **export csv das notas** por módulo / por estudante pra fechar boletim.
- **visão "perfil do estudante"** consolidando: módulos concluídos, notas, tempo médio, último acesso, eventos de risco. já existe `AdminStudentProfile.tsx`, falta puxar nota e evolução.

## 3. experiência do estudante

- **auto-confirm de pílulas editoriais ao chegar no fim do scroll** (T4.4) — reduz "clique pra clicar".
- **empty state do tutor com 3-4 starter prompts contextuais** baseados no módulo atual (T4.2).
- **indicador "salvo automaticamente há Xs"** mais visível nas pílulas com input longo, reforça segurança.
- **recap do módulo ao concluir**: o que aprendeu + próximo módulo + quando libera, num só card.
- **estado "aguardando feedback do educador"** explícito na pílula, não silencioso.
- **acessibilidade**: revisar contraste do rosa primary sobre bege em textos pequenos, focus-ring visível em todos CTAs, aria-labels nas ações sem texto.

## 4. observabilidade e operação

- **dashboard real do admin** com métricas vivas: matrículas ativas, taxa de conclusão por módulo, tempo médio, módulos com mais dúvidas no tutor, gargalo de avaliação (entregas pendentes há +X dias).
- **alerta por email pro admin** quando entrega passa de N dias sem feedback.
- **log de auditoria** das ações sensíveis do admin (reset de senha, edição de nota, publicação de módulo).
- **healthcheck do AI Gateway** visível: créditos restantes, latência média, taxa de erro.

## 5. conteúdo e pedagogia

- **revisão de copy do módulo 1 Eco** (em-dash já mapeado, T1.5) e auditoria das outras 19 pílulas das duas eletivas com a mesma régua.
- **tempo estimado por pílula** consistente em todo módulo (princípio 7 do project-knowledge).
- **fallback amigável quando AI Gateway falha** no tutor — hoje quebra silencioso em alguns paths.

## 6. técnico / dívida

- **testes E2E mínimos** dos 3 fluxos críticos: login → primeiro módulo → entrega; admin → ver entrega → dar feedback; estudante → ver feedback → ver nota.
- **consolidar rotas legadas atrás de `ExtrasGate`** que ainda têm imports vivos no bundle do estudante (code-split por rota).
- **revisar `useDeliverable.ts`** — cria deliverable on-write mas não trata race condition de 2 abas abertas.
- **i18n-ready**: extrair strings hardcoded pra facilitar variações futuras (mesmo sem traduzir agora).

---

## ordem sugerida

**sprint A (3-4 dias):** seção 1 inteira + filtros do admin (seção 2 primeiros 3 itens). desbloqueia o dia a dia do educador antes do primeiro lote real de entregas.

**sprint B (3-4 dias):** seção 3 (estudante) + seção 4 (observabilidade básica). melhora retenção e dá visibilidade pro admin.

**sprint C (2-3 dias):** seção 2 restante (export, perfil consolidado) + seção 5 (auditoria de copy).

**sprint D (contínuo):** seção 6 (testes + dívida).

---

me diz qual sprint quer atacar primeiro, ou se prefere que eu pegue só os itens de impacto imediato da seção 1 + filtros do admin como próximo passo.
