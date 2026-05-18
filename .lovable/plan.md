# Análise crítica + plano pedagógico

## diagnóstico

a base é sólida (módulo → trilha → eletiva, sequencial unlock, progresso por aluno, painel /admin/aula com métricas e entregas). a jornada está enxuta após o último refactor. **o que falta é o coração pedagógico**: a aula é passiva, o tutor é genérico, o professor não vê pessoa nenhuma, e o aluno não tem ciclo de prática-feedback-reflexão.

### 10 falhas pedagógicas encontradas (lado aluno)

1. **pílulas são passivas.** `Modulo.tsx` renderiza tudo como artigo com botão "marcar concluída". todos os 5 tipos de pílula (`pilula_a/b/c`, `exercicio_pbl`, `registro`) viram o mesmo card. **descoberta crítica: existe um sistema completo de componentes interativos em `src/components/eletiva/pills/` (PillAbertura, PillConteudoCurado, PillRadar, PillQuiz, PillBonus, RadarFinal, EvidenceUploader, useDeliverable com autosave) que nunca foi conectado.** banco confirma: 0 entregas em `module_deliverables`, 0 ratings.
2. **zero feedback formativo.** coluna `module_deliverables.feedback` existe, nunca foi escrita. sem rubrica, sem comentário, sem sinal de "fui visto".
3. **tutor IA descontextualizado.** `/app/tutor` é chat genérico. não puxa título/objetivo/corpo da pílula atual, não tem prompts pré-feitos ("explica de novo", "me questiona como professor", "me dá um exemplo").
4. **sem metacognição.** nenhuma pergunta de confiança, nenhuma reflexão de fechamento. tipo de pílula `registro` existe mas é renderizado como texto morto.
5. **sem spaced retrieval.** 40 módulos repetem o padrão a/b/c. base perfeita pra micro-cards de recall ao retomar (ebbinghaus). nada implementado.
6. **celebração rasa.** toast no fim do módulo. fim de trilha (5 módulos) e fim de eletiva: nada. faltam signature moments proporcionais.
7. **sem "skill map".** aluno vê `module_number` mas não a competência que está construindo. falta outcome trail.
8. **PBL adormecido.** `trails.pbl_prompt` e `exercicio_pbl` existem como dados, mas viram pílula passiva. a escola sebrae é PBL. é o coração e está dormindo.
9. **sem progresso intra-módulo.** pílula 3 de 5 só aparece após rolar. precisa indicador no topo.
10. **texto-corrido em celular.** EM 1º ano lê no mobile. faltam callouts, chunks, variação visual.

### 7 falhas no lado professor

1. **sem ficha do aluno.** admin vê números agregados, não vê pessoa. não sabe onde a maria parou.
2. **sem fila de "o que revisar hoje".** entregas chegam (quando chegam) e somem. nenhum inbox.
3. **`student_alerts` (tabela) existe mas não é populada.** ninguém vê aluno em risco.
4. **editor de pílula com 982 linhas.** sem templates ("inserir quiz", "inserir reflexão"). atrito alto pra professor não-dev.
5. **métricas pontuais, sem heatmap.** "qual pílula trava mais gente?" não tem resposta.
6. **sem broadcast.** professor não consegue mandar nudge contextual sem sair do admin.
7. **sem timeline.** stats só mostram totais. evolução semana a semana invisível.

---

## plano em 7 ondas

cada onda gera valor sozinha. ondas 1+2+3 já dobram a percepção de qualidade.

### onda 1 — ativar pílulas interativas (HIGHEST IMPACT, faz tudo o resto importar)

- reescrever `src/pages/Modulo.tsx` substituindo `ModuloPillList` por roteador por `kind`:
  - `pilula_a` → `PillAbertura`
  - `pilula_b` / `pilula_c` → `PillConteudoCurado` + micro-quiz inline opcional via `interaction_schema`
  - `exercicio_pbl` → `PillRadar` (já consome `EvidenceUploader`)
  - `registro` → `PillBonus` (reflexão escrita autosave)
- conectar `useDeliverable` (já pronto, já escreve em `module_deliverables`)
- conclusão automática da pílula quando o engagement mínimo é atingido (não só clique manual)
- indicador "pílula 3 de 5" sticky no topo do módulo

### onda 2 — loop de feedback formativo

- `/admin/feedback` (nova rota): inbox de `module_deliverables` com `submitted_at not null` e sem `reviewed_at`. filtros por curso, módulo, aluno
- tela de revisão única: ver entrega + textarea de feedback + 3-5 rubric-chips ("clareza ✓", "evidência forte ✓", "aprofundar X") + status aprovar/revisar
- lado aluno: pílula com entrega revisada ganha card "feedback de [professor]" no topo; badge na MobileNav quando há feedback novo

### onda 3 — tutor IA contextual (signature moment)

- transformar o botão "tutor IA" das pílulas em chat contextual: injetar título do módulo, objetivo da trilha, título e body da pílula no system prompt
- 4 chips pré-feitos no input: "explica de novo", "me dá um exemplo", "me questiona como professor", "resume em 3 bullets"
- conversa contextual salva em `chora_bot_conversations` com referência à pílula → vira "histórico de dúvidas" recuperável

### onda 4 — metacognição + spaced retrieval

- ao concluir módulo: modal de 5 segundos com "confiança 1-5" + "o que você levou? (1 frase)". salva em `module_ratings` (tabela já existe)
- ao retomar após 3+ dias: 1 micro-card de recall no dashboard ("lembra disto do módulo 02?")
- aba "minha trilha de skills" no dashboard: skills extraídas de `objective` dos módulos, com domínio = autoavaliação + entrega revisada

### onda 5 — visão professor (admin)

- **ficha do aluno** `/admin/aluno/:id`: timeline (módulos concluídos, entregas, feedbacks, alertas, última atividade)
- **dashboard professor reposicionado**: troca os cards atuais (totais) por "o que demanda sua atenção hoje": N entregas a revisar / N alunos parados 7+ dias / N pílulas com abandono > 30%
- **heatmap intra-aula** em `/admin/aula/:n`: % de aluno que termina cada pílula, tempo médio, distribuição de respostas de quiz
- **templates no editor de pílula**: botão "inserir bloco" abre menu (reflexão, quiz 3 alt, radar, link curado, vídeo)

### onda 6 — celebração proporcional

- conclusão de módulo: animação curta com mascote pose `celebrating` + frase do contexto
- conclusão de trilha (5 módulos): tela full-screen com badge + frase do professor + atalho pra próxima
- conclusão de eletiva: reconectar `hub_certificates` ao fluxo aluno (hoje tá atrás de ExtrasGate, esconde celebração real)

### onda 7 — alertas + broadcast

- edge function `compute-student-alerts` (cron diário): popula `student_alerts` com inatividade 7+ dias, abandono no meio, autoavaliação baixa
- admin vê alertas no dashboard; aluno vê nudge gentil contextual
- professor envia mensagem direta pro aluno via admin (email + in-app card no próximo login)

---

## o que NÃO entra agora

- peer review (segunda fase)
- gamificação de XP / níveis (foco é aprendizado, não score)
- mudanças no schema base (`modules`, `trails`, `module_pills`) — só usa o que já existe
- troca do player de vídeo

## escopo de arquivos previsto (ondas 1-3, prioridade)

```text
src/pages/Modulo.tsx                              roteador por kind, progresso intra-módulo
src/components/eletiva/modulo/ModuloPillList.tsx  refeito como dispatcher
src/components/eletiva/pills/*                    conectados (já existem)
src/components/eletiva/TutorChat.tsx              prompts contextuais + chips
src/pages/ChoraBot.tsx                            herda chips (consistência)
src/features/admin/AdminFeedbackInbox.tsx         (novo) fila de revisão
src/pages/AdminFbi.tsx                            adiciona aba "feedback" no grupo operação
src/components/dashboard/FeedbackBadge.tsx        (novo) sinal de feedback novo
supabase/migrations/                              índice em deliverables(submitted_at) onde reviewed_at IS NULL
```

ondas 4-7 detalhadas após validação das 1-3.

## resultado esperado

**aluno**: cada pílula vira interação (não leitura), ganha feedback humano com nome, tem tutor que conhece a aula, vê evolução de skill, é celebrado a cada marco. ciclo prática → feedback → reflexão fechado.

**professor**: abre admin e vê "12 entregas pra revisar, 3 alunos parados, pílula 03/módulo 04 com abandono alto". clica em qualquer card e age. ficha de aluno disponível. templates aceleram criação de aula.
