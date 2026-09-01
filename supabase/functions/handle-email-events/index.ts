import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Recebe os eventos terminais de entrega (bounce, reclamação, descadastro) e
// mantém o histórico do app atualizado. A supressão de verdade é aplicada pela
// Lovable no momento do envio: estas tabelas são só leitura/auditoria interna.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<Reason, string> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(
  reason: Reason,
  event: { event_id: string; data: { recipient: string; message_id?: string } },
): Promise<void> {
  const email = event.data.recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Falha ao gravar supressão', {
      event_id: event.event_id,
      code: (suppressError as { code?: string }).code,
      message: (suppressError as { message?: string }).message,
    })
    throw new Error('suppression_write_failed')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })

  if (logError) {
    console.error('Falha ao gravar histórico do email', {
      event_id: event.event_id,
      code: (logError as { code?: string }).code,
      message: (logError as { message?: string }).message,
    })
    throw new Error('log_write_failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record('bounce', event as never)
    },
    'email.complaint': async (event) => {
      await record('complaint', event as never)
    },
    'email.unsubscribed': async (event) => {
      await record('unsubscribe', event as never)
    },
  },
})

Deno.serve((req) => handler(req))
