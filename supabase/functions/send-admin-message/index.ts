// envia mensagem manual do educador (admin) pro estudante:
// - cria notification in-app
// - opcionalmente dispara e-mail pelo pipeline gerenciado da Lovable
// - registra em admin_messages

import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAndLog } from '../_shared/email-send-log.ts'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: hasRole } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!hasRole) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipientId: string = body?.recipient_id
  const subject: string = (body?.subject ?? '').toString().trim()
  const bodyMd: string = (body?.body_md ?? '').toString().trim()
  const link: string | null = body?.link?.toString().trim() || null
  const sendEmail: boolean = body?.send_email === true

  if (!recipientId || !subject || !bodyMd) {
    return new Response(JSON.stringify({ error: 'recipient_id, subject e body_md são obrigatórios' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (subject.length > 200 || bodyMd.length > 4000) {
    return new Response(JSON.stringify({ error: 'limite de tamanho excedido' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // perfil + email
  const [{ data: profile }, { data: authRow }] = await Promise.all([
    admin.from('profiles').select('id, user_id, display_name, nickname').eq('user_id', recipientId).maybeSingle(),
    admin.auth.admin.getUserById(recipientId),
  ])
  if (!profile) {
    return new Response(JSON.stringify({ error: 'destinatário não encontrado' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const recipientEmail = authRow?.user?.email ?? null

  // autor (educador)
  const { data: authorProfile } = await admin
    .from('profiles').select('display_name, nickname').eq('user_id', user.id).maybeSingle()
  const authorName =
    authorProfile?.nickname || authorProfile?.display_name || 'educador'

  // notification in-app
  const { data: notif } = await admin
    .from('notifications')
    .insert({
      user_id: recipientId,
      kind: 'admin_direct_message',
      title: `${authorName.toLowerCase()} te mandou uma mensagem`,
      body: subject,
      link: link || '/app',
      metadata: { author_id: user.id, subject },
    })
    .select('id').single()

  let emailSent = false
  if (sendEmail && recipientEmail) {
    try {
      const result = await sendAndLog(admin, 'admin-direct-message', recipientEmail, {
        idempotencyKey: `admin-msg-${user.id}-${recipientId}-${Date.now()}`,
        templateData: {
          recipientName: profile.nickname || profile.display_name || '',
          authorName,
          subject,
          bodyMd,
          link: link ? `https://nachesu.lovable.app${link.startsWith('/') ? link : `/${link}`}` : 'https://nachesu.lovable.app/app',
        },
        metadata: { author_id: user.id, recipient_id: recipientId },
      })
      emailSent = result.sent
      if (!result.sent) console.warn('admin-msg email failed', result.reason)
    } catch (e) {
      console.error('admin-msg email exception', e)
    }

  }

  const { data: row, error: insertErr } = await admin
    .from('admin_messages')
    .insert({
      recipient_id: recipientId,
      author_id: user.id,
      subject,
      body_md: bodyMd,
      link,
      email_sent: emailSent,
      notification_id: notif?.id ?? null,
    })
    .select('id').single()

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ ok: true, id: row?.id, email_sent: emailSent }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
