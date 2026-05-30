## Respostas às suas perguntas

1. **URL de login**: confirmei no código — `https://nachesu.lovable.app/auth?email=<email>` já é suportado (Auth.tsx linha 83 lê `?email=` e pré-preenche). Vou usar essa.
2. **Disparo**: automático na migração + envia também pra `mateusfrattezi@gmail.com` e `frattz@naches.app` (test pra você ver como ficou).
3. **Reenvio em Economia Circular**: confirmei os 3 que já logaram — `bernardo11536`, `mateus.frattz`, `maria11633` (todos `@edu.sebrae.com.br`). São os reais que pediram acesso e foram aprovados antes. **Não reenvio** pra eles (`only_unclaimed=true`).

## Plano

### 1. Backfill dos 19 invites (migração SQL)
`INSERT … ON CONFLICT DO NOTHING` em `course_invites` pros 19 emails Frattz na eletiva IA na Prática (`c0a00000-…-001`).

### 2. Template de email transacional
`supabase/functions/_shared/transactional-email-templates/course-invite.tsx`:

- React Email, fundo branco, paleta Perestroika (rosa primary), tipografia Urbanist via fallback `Arial, sans-serif` (email-safe)
- Header: wordmark "nachesu" em League Gothic-style (fallback Impact)
- Saudação lowercase: "seu acesso à eletiva tá liberado"
- Nome da eletiva + nome do educador (Dudu ou frattz)
- Botão CTA "entrar na nachesu" linkando `https://nachesu.lovable.app/auth?email=<email>`
- Microcopy: "é só clicar no botão e fazer login com esse mesmo email."
- Assinatura: "nachesu · em parceria com escola sebrae"
- Props: `{ courseTitle, educatorName, loginUrl }`
- Subject: `seu acesso à eletiva <nome> tá liberado`
- Registrar em `registry.ts` como `'course-invite'`

### 3. Edge function `send-course-invites-batch`
Admin-only (valida JWT + `has_role admin`). Body: `{ course_id, only_unclaimed=true, extra_recipients?: string[] }`.

Para cada destinatário, invoca `send-transactional-email` com `idempotencyKey: course-invite-${course_id}-${email}` (dedupe garante que reexecuções não duplicam). Retorna `{ queued, errors }`.

Justificativa do loop: cada item é um convite individual triggered por uma matrícula pré-existente (equivalente operacional do welcome email atrasado, análogo ao `import-perestroika-spreadsheet` existente). Não é marketing.

### 4. Disparo automático pós-migração
Logo após a migração, eu mesmo invoco a função 3x via `curl_edge_functions`:
- IA na Prática (Frattz) — 41 destinatários, só unclaimed (~39 envios)
- Economia Circular (Dudu) — 118 destinatários, só unclaimed (~115 envios)
- Extras: `mateusfrattezi@gmail.com` e `frattz@naches.app` recebem o template de IA na Prática como amostra

### 5. Botão admin (uso futuro)
Em `AdminEletivas.tsx`, por curso: "reenviar convite pra quem ainda não logou" com confirmação mostrando contagem. Pra você poder usar de novo se entrarem mais estudantes via planilha.

### 6. Deploy
Deploy de `send-course-invites-batch` e `send-transactional-email` (com registry novo).

## Confirmações finais

Posso executar? Resposta única ("sim") basta.