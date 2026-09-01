// Envio de email de app + registro em email_send_log.
//
// O transporte é da Lovable (entrega, retentativa, supressão e descadastro são
// gerenciados lá). Aqui só guardamos a trilha de auditoria que o app já usava:
// uma linha 'sent', 'suppressed' ou 'failed' por tentativa.
import { EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import {
  sendTemplateEmail,
  type SendTemplateEmailResult,
} from './transactional-email-templates/send-email.ts'


interface MinimalSupabaseClient {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>
  }
}

export interface SendAndLogOptions {
  templateData?: Record<string, unknown>
  idempotencyKey?: string
  metadata?: Record<string, unknown> | null
  replyTo?: string
}

export type SendAndLogResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }
  | { sent: false; reason: 'send_failed'; error: string }

async function logRow(
  supabase: MinimalSupabaseClient,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('email_send_log').insert(row)
  if (error) {
    console.error('[email-send-log] falha ao registrar envio', {
      template_name: row.template_name,
      status: row.status,
      error,
    })
  }
}

export async function sendAndLog(
  supabase: MinimalSupabaseClient,
  templateName: string,
  recipientEmail: string,
  options: SendAndLogOptions = {},
): Promise<SendAndLogResult> {
  const send = () =>
    sendTemplateEmail(templateName, recipientEmail, {
      templateData: options.templateData ?? {},
      idempotencyKey: options.idempotencyKey,
      replyTo: options.replyTo,
    })

  let result: SendTemplateEmailResult
  try {
    try {
      result = await send()
    } catch (error) {
      // 429: a Lovable diz quanto esperar. Espera uma vez e tenta de novo.
      if (error instanceof EmailAPIError && error.status === 429) {
        const waitSeconds = error.retryAfterSeconds ?? 60
        console.warn('[email-send-log] rate limited, aguardando', { waitSeconds })
        await new Promise((r) => setTimeout(r, waitSeconds * 1000))
        result = await send()
      } else {
        throw error
      }
    }
  } catch (error) {

    const message = error instanceof Error ? error.message : String(error)
    await logRow(supabase, {
      template_name: templateName,
      recipient_email: recipientEmail,
      status: 'failed',
      error_message: message.slice(0, 1000),
      metadata: options.metadata ?? null,
    })
    return { sent: false, reason: 'send_failed', error: message }
  }

  if (!result.sent) {
    await logRow(supabase, {
      template_name: templateName,
      recipient_email: recipientEmail,
      status: 'suppressed',
      metadata: options.metadata ?? null,
    })
    return { sent: false, reason: 'recipient_suppressed' }
  }

  await logRow(supabase, {
    template_name: templateName,
    recipient_email: recipientEmail,
    status: 'sent',
    metadata: options.metadata ?? null,
  })
  return { sent: true }
}
