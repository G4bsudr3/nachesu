// dispara o e-mail "entrega corrigida" pro estudante.
// chamado pelo admin logo depois de salvar a revisão no drawer de feedback.
// a notificação in-app já é criada por trigger no banco; aqui é só o e-mail.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const APP_URL = 'https://nachesu.lovable.app'

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
  if (userErr || !user) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: hasRole } = await admin.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (!hasRole) return json({ error: 'forbidden' }, 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const deliverableId: string = (body?.deliverable_id ?? '').toString()
  if (!/^[0-9a-f-]{36}$/i.test(deliverableId)) {
    return json({ error: 'deliverable_id inválido' }, 400)
  }

  const { data: deliverable, error: dErr } = await admin
    .from('module_deliverables')
    .select('id, user_id, module_id, feedback, status, reviewed_at')
    .eq('id', deliverableId)
    .maybeSingle()
  if (dErr) return json({ error: dErr.message }, 500)
  if (!deliverable) return json({ error: 'entrega não encontrada' }, 404)

  const { data: moduleRow } = await admin
    .from('modules')
    .select('number, title, trail_id, trails!inner(course_id, courses!inner(slug, title, professor_name))')
    .eq('id', deliverable.module_id)
    .maybeSingle()

  const course = (moduleRow as any)?.trails?.courses ?? null
  const moduleNumber = (moduleRow as any)?.number ?? null
  const courseSlug = course?.slug ?? null

  const [{ data: profile }, authRow] = await Promise.all([
    admin.from('profiles').select('nickname, display_name').eq('user_id', deliverable.user_id).maybeSingle(),
    admin.auth.admin.getUserById(deliverable.user_id),
  ])
  const recipientEmail = authRow?.data?.user?.email ?? null
  if (!recipientEmail) return json({ error: 'estudante sem e-mail' }, 422)

  const feedback = (deliverable.feedback ?? '').trim()
  const excerpt = feedback.length > 320 ? `${feedback.slice(0, 317)}...` : feedback
  const verdict = deliverable.status === 'ajuste' ? 'ajustar' : 'aprovado'
  const path = courseSlug
    ? `/app/eletiva/${courseSlug}/modulo/${moduleNumber ?? 1}#feedback-do-educador`
    : `/app/modulo/${moduleNumber ?? 1}#feedback-do-educador`

  const idempotencyKey = `deliverable-reviewed-${deliverable.id}-${deliverable.reviewed_at ?? 'x'}`

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: 'deliverable-reviewed',
        recipientEmail,
        idempotencyKey,
        templateData: {
          recipientName: profile?.nickname || profile?.display_name || '',
          educatorName: course?.professor_name || 'seu educador',
          courseTitle: course?.title || 'sua eletiva',
          moduleNumber,
          moduleTitle: (moduleRow as any)?.title ?? null,
          feedbackExcerpt: excerpt,
          verdict,
          link: `${APP_URL}${path}`,
        },
      }),
    })
    if (!resp.ok) {
      const detail = await resp.text()
      console.error(`send-transactional-email failed [${resp.status}]: ${detail}`)
      return json({ error: 'falha ao enfileirar e-mail', status: resp.status, details: detail }, resp.status)
    }
  } catch (e) {
    console.error('deliverable-reviewed email exception', e)
    return json({ error: String(e) }, 500)
  }

  return json({ ok: true, recipient: recipientEmail, message_id: idempotencyKey })
})
