## status atual

- domínio `notify.frattz.com`: ✅ verificado e delegado pros nameservers da Lovable
- infra de email: instalada (queue pgmq, cron, `send-transactional-email`, `auth-email-hook`, `process-email-queue` já deployados)
- 5 templates transacionais registrados: `future-letter-delivery`, `evasion-nudge`, `admin-direct-message`, `tutor-safety-alert`, `course-invite`
- aviso menor: preview cache do painel Cloud → Emails deu "Template build failed", mas isso é só o preview do painel, não afeta envio real

conclusão: config parece correta. pra confirmar de ponta a ponta, falta um envio real.

## plano de teste

1. criar um template mínimo `test-email` em `supabase/functions/_shared/transactional-email-templates/test-email.tsx` (React Email, fundo branco, tipografia Urbanist, cor accent do projeto, copy lowercase no tom NachesU)
2. registrá-lo em `registry.ts`
3. deployar `send-transactional-email` pra ele reconhecer o novo template
4. invocar `send-transactional-email` com:
   - `templateName: "test-email"`
   - `recipientEmail: "gabreda188@gmail.com"`
   - `idempotencyKey: "test-<timestamp>"`
5. checar `email_send_log` filtrando por `recipient_email = 'gabreda188@gmail.com'` pra confirmar `status = 'sent'`
6. se `status = 'failed'` ou ficar preso em `pending`, olhar logs de `process-email-queue` e reportar o erro exato
7. depois de validado, deixar o template `test-email` no repo (útil pra futuros testes) ou removê-lo — me diz sua preferência

## detalhes técnicos

- envio é assíncrono via pgmq → `process-email-queue` roda a cada 5s, então o log deve aparecer em segundos
- `from` sai como `chorahub <noreply@notify.frattz.com>` (config atual do `send-transactional-email`)
- nenhuma mudança no domínio, NS ou infra — só um template novo e uma chamada de teste

posso seguir?