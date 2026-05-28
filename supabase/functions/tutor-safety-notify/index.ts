// tutor-safety-notify: dispara email transacional para educadores quando
// um evento de safety severo é registrado. cria a linha em
// tutor_safety_escalations pra fila do admin acompanhar.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface Payload {
  safety_event_id: string
}

const SEVERE_CATEGORIES = new Set(['self_harm', 'abuse', 'illegal', 'hate'])
const SLA_BY_CATEGORY: Record<string, number> = {
  self_harm: 2,
  abuse: 4,
  illegal: 6,
  hate: 12,
  other_serious: 24,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = (await req.json()) as Payload
    if (!body?.safety_event_id) {
      return json({ error: 'safety_event_id required' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. busca evento (schema usa risk_level/risk_score/message_excerpt + message_redacted)
    const { data: ev, error: evErr } = await supabase
      .from('tutor_safety_events')
      .select('id, user_id, risk_level, risk_score, message_redacted, message_excerpt, trail_id, created_at')
      .eq('id', body.safety_event_id)
      .single()
    if (evErr || !ev) {
      return json({ error: 'event not found' }, 404)
    }
    const category = ev.risk_level as string
    const severity = (ev.risk_score ?? 0) >= 0.8 ? 'high' : (ev.risk_score ?? 0) >= 0.5 ? 'medium' : 'low'
    const redacted = (ev.message_redacted && ev.message_redacted.trim().length > 0)
      ? ev.message_redacted
      : '(trecho anonimizado indisponível — abre o painel pra ver o evento)'

    // 2. busca settings (lista de emails de educadores)
    const { data: settings } = await supabase
      .from('tutor_settings')
      .select('safety_notify_emails, tutor_enabled')
      .eq('id', 1)
      .single()

    const recipients: string[] = Array.isArray(settings?.safety_notify_emails)
      ? settings!.safety_notify_emails.filter((e: any) => typeof e === 'string' && e.includes('@'))
      : []

    // 3. busca título da trilha (best-effort)
    let trailTitle = 'tutor ia'
    if (ev.trail_id) {
      const { data: t } = await supabase
        .from('trails')
        .select('title')
        .eq('id', ev.trail_id)
        .maybeSingle()
      if (t?.title) trailTitle = t.title.toLowerCase()
    }

    // 4. cria escalação SEMPRE (mesmo sem recipients, pra ficar visível na fila do admin)
    const category = ev.risk_level as string
    const slaHours = SLA_BY_CATEGORY[category] ?? 24
    const studentLabel = `estudante #${ev.user_id.slice(0, 4)}`
    const adminUrl = `${Deno.env.get('PUBLIC_APP_URL') ?? 'https://nachesu.lovable.app'}/admin/tutor`

    const { data: escalation, error: escErr } = await supabase
      .from('tutor_safety_escalations')
      .insert({
        safety_event_id: ev.id,
        user_id: ev.user_id,
        category,
        severity: (ev.risk_score ?? 0) >= 0.8 ? 'high' : (ev.risk_score ?? 0) >= 0.5 ? 'medium' : 'low',
        sla_hours: slaHours,
        notified_emails: recipients,
        status: 'open',
      })
      .select('id')
      .single()
    if (escErr) console.error('[tutor-safety-notify] escalation insert failed', escErr)

    if (recipients.length === 0) {
      console.warn('[tutor-safety-notify] no recipients configured, escalation created but no email sent')
      return json({ ok: true, escalation_id: escalation?.id, skipped: 'no_recipients' }, 200)
    }

    const severity = (ev.risk_score ?? 0) >= 0.8 ? 'high' : (ev.risk_score ?? 0) >= 0.5 ? 'medium' : 'low'

    // 5. dispara email pra cada destinatário
    const sendPromises = recipients.map((to) =>
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'tutor-safety-alert',
          recipientEmail: to,
          idempotencyKey: `tutor-safety-${escalation?.id ?? ev.id}-${to}`,
          templateData: {
            studentLabel,
            category,
            severity,
            redactedMessage: redacted,
            trailTitle,
            occurredAt: ev.created_at,
            adminUrl,
            slaHours,
          },
        },
      }),
    )
    const results = await Promise.allSettled(sendPromises)
    const failed = results.filter((r) => r.status === 'rejected').length

    return json({
      ok: true,
      escalation_id: escalation?.id,
      sent: recipients.length - failed,
      failed,
    }, 200)
  } catch (e) {
    console.error('[tutor-safety-notify] error', e)
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export { SEVERE_CATEGORIES }
