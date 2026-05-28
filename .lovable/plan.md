# Fase A — Tutor IA pronto pra menor de idade

Foco único: travar os 4 riscos que impedem a turma real (14-15 anos) de entrar em contato com o tutor. Nada de UX nova, nada de dashboard novo. Só os guardrails.

**Importante:** depois que a Fase A estiver finalizada com excelência (testada com casos reais de risco, custo simulado, burst simulado, LGPD revisada), seguimos direto pra **Fase B** (drill-down de mensagens, off-scope real, comparação temporal, alinhamento de janela do digest) e depois **Fase C** (polimento: contexto de pílula, latência TTFB, retenção de insights, feedback estruturado, alinhamento policy/função, render do TutorContextChip, a11y, fallback de modelo). Os 3 planos já estão mapeados nos 16 gaps; A é só o que não pode esperar.

---

## 1. Camada de segurança emocional (gap 1)

Adicionar **classificador de risco** rodando antes da resposta do tutor.

**Backend (`tutor-trail-chat`):**
- Antes de chamar o modelo principal, classificar a mensagem do estudante em 5 níveis: `safe`, `emotional_distress`, `bullying`, `self_harm`, `abuse`. Classificação via Gemini Flash Lite com prompt curto e estruturado (output JSON), barata e rápida.
- Se nível `safe`: fluxo normal.
- Se qualquer outro nível: **não chamar o tutor**. Devolver resposta empática pré-aprovada por nível, sem improvisar, com encaminhamento (CVV 188, Disque 100, orientador escolar) e abrir registro em `tutor_safety_events`.
- Logar nível detectado, score, prompt e resposta entregue.

**Banco (`tutor_safety_events`):**
- Campos: `id`, `user_id`, `trail_id`, `module_id`, `message_excerpt` (primeiros 240 chars), `risk_level`, `risk_score`, `model_used`, `intervention_shown`, `acknowledged_at`, `reviewed_by_admin_id`, `admin_notes`, `created_at`.
- RLS: só admin lê/atualiza; estudante nunca lê.
- GRANT padrão pra `authenticated` + `service_role`.

**Frontend (`TutorChat`):**
- Quando backend devolver intervenção de risco, renderizar bolha especial (variante `SafetyNotice`) com tom acolhedor, contatos de apoio e botão "estou bem, voltar". Sem mascote celebrando, sem starter prompts.
- Componente novo `TutorSafetyNotice.tsx`.

**Admin:**
- Mini-seção no `AdminTutorCommand` listando últimos 20 eventos de segurança, com filtro por nível, ação "marcar como revisado" e campo de nota. Não é dashboard completo (isso é Fase B), só um painel de alerta.

---

## 2. LGPD e retenção (gap 2)

**Banco:**
- Adicionar coluna `retention_until` em `tutor_message_events` (default `now() + interval '90 days'`).
- Criar função `cleanup_tutor_events()` que apaga eventos com `retention_until < now()`.
- Agendar via `pg_cron` diariamente às 03h BRT (usar `supabase--insert`, não migração, conforme regra de cron).
- Mesma lógica pra `tutor_safety_events` mas com retenção 365 dias (eventos sensíveis precisam mais tempo de auditoria).

**Edge function `tutor-admin-digest`:**
- Antes de mandar amostra pro modelo, passar por função `anonymizeMessage(text)`: remover nomes próprios (heurística simples: tokens capitalizados após "eu sou/me chamo/sou o/sou a"), emails, telefones, @handles, links. Substituir por `[nome]`, `[email]` etc.
- Adicionar campo `anonymized: true` no insert em `admin_insights`.

**Onboarding / consentimento:**
- Adicionar microcopy no primeiro acesso ao tutor (modal único, 1 vez por estudante, persistido em `profiles.tutor_consent_at`): "suas perguntas ficam guardadas por até 90 dias pra melhorar o tutor. educadores podem ver agregados anônimos. mensagens em situação de risco ficam por 365 dias pra acompanhamento."
- Botão "entendi" obrigatório pra usar o tutor.
- Coluna nova em `profiles`: `tutor_consent_at timestamptz`.

---

## 3. Cap de custo global (gap 3)

**Banco (`tutor_settings`):**
- Adicionar colunas: `daily_total_cap int default 2000` (perguntas/dia total), `daily_total_alert_threshold numeric default 0.8`.
- Adicionar tabela `tutor_daily_counters` (`date date primary key, total_count int default 0, last_alert_sent_at timestamptz`) — contador rápido sem precisar agregar `tutor_message_events` toda chamada.

**Edge function `tutor-trail-chat`:**
- Antes do fetch ao modelo, ler/incrementar contador do dia (BRT) com `UPDATE ... RETURNING` atômico.
- Se total ≥ `daily_total_cap`: devolver erro 429 com mensagem "tutor pausado por hoje, volta amanhã" e logar evento.
- Se passou do threshold (80% por padrão) e `last_alert_sent_at` é null ou de outro dia: gravar `admin_insights` com `scope='cost_alert'` e marcar `last_alert_sent_at`.

**Admin (`AdminTutorCommand`):**
- Card extra "uso do dia": X de Y perguntas, barra de progresso, cor de alerta acima de 80%.

---

## 4. Burst rate-limit (gap 16)

**Edge function `tutor-trail-chat`:**
- Adicionar verificação de janela curta: contar mensagens do `user_id` nos últimos 60 segundos via `tutor_message_events`.
- Se ≥ 10 em 60s: devolver 429 com mensagem "calma, você mandou muitas perguntas seguidas. respira e tenta de novo em alguns segundos".
- Limite configurável em `tutor_settings.burst_limit_per_minute int default 10`.

**Frontend (`TutorChat`):**
- Tratar 429 sem quebrar o chat: bolha de aviso curta, input liberado depois de 30s com countdown.

---

## Resumo técnico de arquivos

**Migração:**
- `tutor_safety_events` (tabela + RLS + GRANTs)
- `profiles.tutor_consent_at` (coluna)
- `tutor_settings`: `daily_total_cap`, `daily_total_alert_threshold`, `burst_limit_per_minute`
- `tutor_message_events.retention_until` + `tutor_safety_events.retention_until`
- `tutor_daily_counters` (tabela + RLS service-role only)
- função `cleanup_tutor_events()`

**Insert tool (não migração, contém URL+anon key):**
- `pg_cron` agendando `cleanup_tutor_events()` diário 03h BRT

**Edge functions:**
- `tutor-trail-chat`: classificador de risco + cap global + burst + consentimento check
- `tutor-admin-digest`: anonimização antes do prompt

**Frontend:**
- `TutorSafetyNotice.tsx` (novo)
- `TutorConsentModal.tsx` (novo, 1x por estudante)
- `TutorChat.tsx`: integrar safety notice + tratamento 429
- `TutorPage.tsx`: gate de consentimento
- `AdminTutorCommand.tsx`: card de custo do dia + lista de eventos de segurança

---

## Critério de "excelência" pra liberar Fase B

1. Teste manual com 5 mensagens de risco simuladas (cada nível): tutor não responde, intervenção aparece, evento registrado.
2. Teste de burst: 12 mensagens em 30s do mesmo usuário → bloqueio na 11ª.
3. Teste de cap global: setar `daily_total_cap=3` temporariamente e validar 429 + alerta em `admin_insights`.
4. Digest rodado em ambiente com dados reais: confirmar visualmente que nomes/emails foram mascarados.
5. Cron `cleanup_tutor_events` rodado manualmente sem erro.
6. Modal de consentimento aparece 1x e persiste decisão.

Depois disso, abrir o plano da **Fase B** (drill-down, off-scope baseado em `scope_forbidden_terms`, comparação temporal, alinhar janela do digest).

---

# Fase C — Polimento técnico (concluída)

Foco: refinar instrumentação, robustez e UX miúda do tutor agora que segurança (A) e análise admin (B) estão de pé.

## Mudanças

1. **TTFB (time-to-first-byte)** — capturado no proxy do stream e gravado em `tutor_message_events.ttfb_ms`. KPI novo "ttfb mediano" no painel admin, separado da latência total.
2. **Fallback de modelo** — `tutor_settings.fallback_model` (default `gemini-2.5-flash-lite`). Se o principal responder 5xx/429/408, tutor tenta o fallback automaticamente e envia headers `x-tutor-model` + `x-tutor-fallback` na resposta.
3. **Feedback estruturado** — `tutor_message_events.helpful_reason` aceita 5 motivos pré-definidos (`confuso`, `fora_do_tema`, `longo_demais`, `errado`, `nao_ajudou`). `TutorMessageActions` mostra chips após o polegar pra baixo. Painel admin agrega top motivos.
4. **Retenção de insights** — `admin_insights.retention_until` (default 180d) + função `cleanup_admin_insights()` agendada via `pg_cron` 03h05 BRT.
5. **TutorContextChip renderizado** — agora aparece no header do chat quando há pílula/módulo ativo, confirmando ao estudante o que o tutor está considerando.
6. **Alinhamento policy/função** — janela do `tutor-rate-message` ampliada pra 60min, batendo com a policy de update do banco.
7. **A11y** — `role="log"` + `aria-live="polite"` na lista de mensagens, `aria-busy` durante streaming, `aria-label` no textarea, `aria-pressed` nos botões de rating, `focus-visible:ring` nos controles do TutorMessageActions.

## Arquivos
- `supabase/functions/tutor-trail-chat/index.ts` (TTFB, fallback de modelo, headers de observabilidade)
- `supabase/functions/tutor-rate-message/index.ts` (reason + janela 60min)
- `src/components/chora-bot/TutorMessageActions.tsx` (chips de motivo + a11y)
- `src/components/eletiva/TutorChat.tsx` (TutorContextChip + a11y do log)
- `src/features/admin/AdminTutorCommand.tsx` (KPI ttfb mediano, top motivos, select de fallback model)
- migrações: colunas novas em `tutor_message_events`, `tutor_settings` e `admin_insights`; função `cleanup_admin_insights()` + cron diário.
