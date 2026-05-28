## Plano D — Proteção máxima de dados e safety do Tutor IA

Premissa do usuário: proteger ao máximo dados e conversas, alertar em assuntos perigosos/proibidos, **sem** exigir consentimento de responsável. Se não der pra fazer com segurança, limita ou desliga.

Resposta direta: dá pra fazer com segurança, **desde que** aceitemos 3 trade-offs duros:
1. menos retenção de dados (perde análise longitudinal),
2. menos liberdade de tema (tutor recusa o que não é da eletiva),
3. escalação humana ativa (educador precisa receber alerta, não só ver painel).

Se algum desses 3 for inaceitável, a recomendação muda pra **desligar o tutor IA** e oferecer só FAQ + canal direto com educador.

---

### 1. Minimização e retenção agressiva (proteção de dados)

**Banco:**
- `tutor_message_events.retention_until` baixa de 90d → **30d** (suficiente pra revisão pedagógica e ajuste de prompt).
- `tutor_safety_events.retention_until` mantém 365d (auditoria legal exige).
- **Não armazenar texto cru** da mensagem em `tutor_message_events`. Substituir `message_excerpt` por:
  - `message_hash` (sha256 da mensagem original, pra deduplicação),
  - `message_redacted` (texto já anonimizado via LLM antes do insert),
  - `message_length`, `language`, `topic_tag` (classificação curta).
- Texto original só existe **em memória durante a request**, nunca persistido.
- `tutor_safety_events.message_excerpt` continua salvando texto cru (necessário pra educador entender risco real), mas com acesso restrito (ver item 4).

**Edge function `tutor-trail-chat`:**
- Pipeline obrigatório antes de qualquer insert: classificar → redact via LLM → hash → grava redacted.
- Se redact falhar, **não grava nada** (fail-closed) e loga só métricas anônimas (latência, modelo, status).

**Cron:**
- `cleanup_tutor_events()` já existe. Adicionar varredura diária extra que apaga qualquer linha com texto cru em `tutor_message_events` se algum bug fizer vazar.

---

### 2. Classificador de risco com fail-closed (assuntos perigosos)

**5 níveis** já no plano: `safe`, `emotional_distress`, `bullying`, `self_harm`, `abuse`.

**Endurecer:**
- Classificador roda **antes** de qualquer chamada ao tutor (Gemini Flash Lite, JSON estruturado).
- Se classificador falhar (timeout, 5xx, JSON inválido): **não chama tutor**. Devolve mensagem neutra "tô com problema técnico agora, tenta de novo em instantes" + grava `tutor_safety_events` com `risk_level='classifier_failure'`.
- Resposta de risco é **template fixo por nível** (não gerada por IA), com:
  - validação emocional curta,
  - CVV 188, Disque 100, orientador escolar Sebrae (telefone real precisa ser confirmado com Sebrao),
  - botão "voltar" e botão "falar com educador agora" (abre canal interno, não email externo).
- Teste adversarial obrigatório antes de liberar: **30 mensagens curadas** (gírias 14-15a, abreviações, code-switch, ironia, falsos positivos como "personagem do livro se cortou"). Aceitar só com ≥90% de acerto.

---

### 3. Escopo travado (assuntos proibidos)

Hoje `scope_forbidden_terms` existe mas só bloqueia publicação de pílula. Estender pro tutor:
- **Pergunta do estudante** passa por checagem de escopo (já parcialmente na Fase B). Se cair fora do escopo da eletiva matriculada: tutor recusa educadamente ("isso é tema da outra eletiva / não é o que a gente estuda aqui, mas posso te ajudar com X").
- **Categorias sempre proibidas** (independente da eletiva): conteúdo sexual, violência gráfica, drogas, política partidária, religião, dados pessoais de terceiros. Lista hardcoded + revisável pelo admin.
- Recusa também é template fixo, não improvisada.

---

### 4. Escalação humana ativa (sem responsável, educador é a rede)

Já que não vamos pedir consentimento do responsável, **a escola assume papel de cuidado**. Sem isso, alertar risco é teatro.

**Nova tabela `tutor_safety_escalations`:**
- `safety_event_id`, `notified_educator_id`, `notified_at`, `acknowledged_at`, `offline_followup_at`, `followup_notes`, `closed_at`.

**Edge function nova `tutor-safety-notify`** (chamada por trigger em `tutor_safety_events`):
- Para `self_harm` e `abuse`: notificação imediata via **email transacional** (App Emails nativo) pro educador da eletiva + admin (frattz). SLA 2h.
- Para `bullying` e `emotional_distress`: email agregado a cada 4h.
- Notificação inclui link pro painel admin, **não inclui texto cru no email** (privacidade); educador precisa logar pra ver.

**Painel admin:**
- Fila "precisa de atenção" no topo do `AdminTutorCommand`, ordenada por nível + tempo aberto.
- Cada item exige: marcar como visto → registrar follow-up offline → fechar com nota.
- Métrica visível: tempo médio até acknowledgement (se passar de SLA, banner vermelho).

**Documento operacional** (não é código, é prerrequisito):
- Protocolo escrito "o que fazer quando recebo alerta de risco" assinado por Dudu, frattz e contato Sebrao. Sem esse doc, não liga o tutor.

---

### 5. Caps justos por estudante (proteção contra abuso e custo)

- Substituir cap global por **cap por estudante/dia**: 40 perguntas/dia/aluno (configurável em `tutor_settings.per_user_daily_cap`).
- Cap global vira circuit breaker em valor bem alto (10k), só pra abuso sistêmico.
- Burst escalonado: 5/min aviso suave, 8/min pausa 30s, 10/min pausa 2min + grava `burst_pattern`.
- Quando estudante bate cap: mensagem "voltei amanhã" + **textarea local** (localStorage, não persistido no banco) pra ele anotar a dúvida sem perder.

---

### 6. Aviso ao estudante (substitui o consentimento de responsável)

Como não pedimos autorização de responsável, **aumentamos a transparência ativa pro estudante**:
- Modal único na primeira vez (`profiles.tutor_acknowledgment_at`), linguagem direta 14-15a:
  > "suas perguntas ficam guardadas anonimizadas por 30 dias pra ajudar a melhorar o tutor.
  > teu educador pode ver perguntas comuns da turma, sem teu nome.
  > se você escrever sobre se machucar, sofrer bullying ou estar em perigo, teu educador é avisado na hora. isso existe pra te proteger.
  > o tutor não é terapeuta nem amigo. pra desabafo de verdade, fala com gente. tô aqui pra te ajudar a aprender."
- Botão "entendi, bora" + link permanente pra ler de novo no perfil.
- Banner persistente discreto no header do chat: "anonimizado · 30d · alertas vão pro educador".

---

### 7. Critério "go / no-go" do tutor IA

**Liga o tutor só se TODOS forem verdade:**
1. Pipeline classificador → redact → insert testado com 30 casos adversariais (≥90% acerto, 0 falso negativo em `self_harm`/`abuse`).
2. Email de escalação chega em ≤5min nos dois educadores reais (teste E2E).
3. Protocolo offline assinado por Dudu + frattz + contato Sebrao.
4. Redação LLM validada em 20 mensagens com PII variada (0 vazamentos).
5. Cap por estudante e burst escalonado funcionando.
6. Modal de aviso aprovado por leitura de 3 estudantes-teste (entendimento real, não jurídico).

**Se qualquer um falhar:** desliga `tutor-trail-chat` (feature flag `tutor_enabled=false` em `tutor_settings`), substitui UI do tutor por:
- FAQ estático curado por Dudu + frattz por eletiva,
- botão "mandar dúvida pro educador" (abre `module_deliverable_messages` ou cria fluxo equivalente),
- mascote joão-de-barro em pose `resting` com microcopy "o tutor IA tá em ajuste. enquanto isso, manda direto pro educador, tá rápido também."

---

### Resumo de mudanças vs plano anterior

**Remove:**
- Consentimento de responsável (Fase A.5 que eu havia sugerido na análise anterior). Substituído por aviso direto ao estudante + escalação ativa.
- Armazenamento de texto cru em `tutor_message_events`.
- Cap global como mecanismo primário.

**Adiciona:**
- Pipeline redact obrigatório antes de qualquer insert.
- `tutor_safety_escalations` + edge function `tutor-safety-notify` + emails transacionais.
- Cap por estudante + burst escalonado.
- Feature flag `tutor_enabled` com fallback UI completo.
- Critério "go / no-go" com 6 testes objetivos.

**Mantém da Fase A/B/C já feita:**
- Estrutura de `tutor_safety_events`, `tutor_settings`, classificador, TTFB, fallback de modelo, retenção via cron, anonimização do digest, painel admin (que ganha fila de escalação).

---

### Arquivos afetados

**Migrações:**
- alterar `tutor_message_events`: remover `message_excerpt`, adicionar `message_hash`, `message_redacted`, `message_length`, `language`, `topic_tag`. Baixar default de `retention_until` pra 30d.
- nova tabela `tutor_safety_escalations` + RLS + GRANTs.
- nova coluna `tutor_settings.per_user_daily_cap`, `tutor_settings.tutor_enabled`.
- nova coluna `profiles.tutor_acknowledgment_at` (renomeia/cria — `tutor_consent_at` existente vira esse).
- trigger em `tutor_safety_events` chamando `tutor-safety-notify`.

**Edge functions:**
- `tutor-trail-chat`: pipeline classificador → redact LLM → hash → insert; cap por estudante; burst escalonado; fail-closed em todo lugar; respeita `tutor_enabled`.
- `tutor-safety-notify` (nova): envia email transacional + cria linha em `tutor_safety_escalations`.
- `tutor-admin-digest`: já anonimiza; passar a usar `message_redacted` direto (sem precisar reanonimizar).

**Frontend:**
- `TutorChat.tsx`: banner de transparência permanente, novo modal de aviso, fallback completo quando `tutor_enabled=false`, textarea local quando bate cap, tratamento de "falar com educador agora" no safety notice.
- `TutorConsentModal.tsx` → renomeia pra `TutorAcknowledgmentModal.tsx`, copy nova.
- `TutorSafetyNotice.tsx`: adiciona botão "falar com educador agora".
- `AdminTutorCommand.tsx`: fila de escalação no topo, SLA visual, fluxo acknowledge → followup → close, toggle `tutor_enabled` global.
- novo `TutorFallbackPanel.tsx`: FAQ + canal pro educador, usado quando tutor desligado ou em "go/no-go" pendente.

**Documento (não-código, prerrequisito):**
- protocolo de resposta a risco assinado por Dudu + frattz + Sebrao, versionado em `.lovable/protocolo-tutor-safety.md`.

---

### Ordem sugerida de execução

1. Migração de schema (retenção, redact fields, escalations, flag).
2. Pipeline redact + classificador fail-closed em `tutor-trail-chat`.
3. `tutor-safety-notify` + emails + fila no admin.
4. Cap por estudante + burst escalonado.
5. Modal de aviso + banner + fallback UI.
6. Bateria dos 6 testes do "go / no-go".
7. Só então: ativar `tutor_enabled=true` em produção.

Pronto pra implementar quando aprovar. Se quiser, posso também já desenhar o template do email de escalação e o esqueleto do protocolo offline pra Dudu/frattz revisarem.