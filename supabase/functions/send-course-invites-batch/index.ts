// dispara o email transacional "course-invite" para todos os emails de
// course_invites de um curso. opcionalmente filtra só os que ainda não logaram
// (only_unclaimed=true). admin-only. pode receber emails extras de teste.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const LOGIN_BASE = 'https://nachesu.lovable.app/auth'

const educatorFor = (courseTitle: string): string => {
  const t = courseTitle.toLowerCase()
  if (t.includes('circular')) return 'Dudu'
  if (t.includes('ia')) return 'frattz'
  return 'frattz'
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

  const admin = createClient(supabaseUrl, serviceKey)

  // permite chamada via service-role (server-to-server) OU usuário admin logado
  const isServiceRole = auth.includes(serviceKey)
  if (!isServiceRole) {
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: hasRole } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const courseId: string = body?.course_id
  const onlyUnclaimed: boolean = body?.only_unclaimed !== false
  const extraRecipients: string[] = Array.isArray(body?.extra_recipients) ? body.extra_recipients : []
  const dryRun: boolean = body?.dry_run === true

  if (!courseId) {
    return new Response(JSON.stringify({ error: 'course_id é obrigatório' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, title')
    .eq('id', courseId)
    .maybeSingle()
  if (courseErr || !course) {
    return new Response(JSON.stringify({ error: 'course não encontrado' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let q = admin.from('course_invites').select('id, email_normalized, claimed_at').eq('course_id', courseId)
  if (onlyUnclaimed) q = q.is('claimed_at', null)
  const { data: invites, error: invitesErr } = await q
  if (invitesErr) {
    return new Response(JSON.stringify({ error: invitesErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const inviteEmails = (invites ?? []).map(i => i.email_normalized as string)
  const allEmails = Array.from(new Set([...inviteEmails, ...extraRecipients.map(e => e.toLowerCase().trim())]))

  const courseTitle = course.title as string
  const educatorName = educatorFor(courseTitle)

  if (dryRun) {
    return new Response(JSON.stringify({ would_send: allEmails.length, emails: allEmails, courseTitle }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let queued = 0
  const errors: { email: string; error: string }[] = []

  for (const email of allEmails) {
    const loginUrl = `${LOGIN_BASE}?email=${encodeURIComponent(email)}`
    const idempotencyKey = `course-invite-${courseId}-${email}`
    try {
      const { error } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'course-invite',
          recipientEmail: email,
          idempotencyKey,
          templateData: {
            courseTitle,
            educatorName,
            loginUrl,
          },
        },
      })
      if (error) {
        errors.push({ email, error: error.message ?? 'invoke error' })
      } else {
        queued++
      }
    } catch (e) {
      errors.push({ email, error: (e as Error).message })
    }
  }

  return new Response(JSON.stringify({ courseTitle, queued, total: allEmails.length, errors }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
