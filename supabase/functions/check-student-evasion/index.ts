// Job diário: detecta estudantes em risco de evasão e dispara
// notificação in-app + e-mail acolhedor assinado pelo educador.
// Re-envio respeita escalonamento: medium -> high -> lost (1x cada).
//
// Chamada via pg_cron diariamente. Sem body obrigatório; pode receber
// { dry_run: true, only_user_id?: uuid } pra testes.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface RiskRow {
  user_id: string
  course_id: string
  days_inactive: number
  risk_level: 'low' | 'medium' | 'high' | 'lost' | 'caught_up'
  last_activity_at: string
}

interface CourseRow {
  id: string
  title: string
  professor_name: string
  slug: string
}

const PRIORITY: Record<string, number> = { medium: 1, high: 2, lost: 3 }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  let dryRun = false
  let onlyUser: string | null = null
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json()
      dryRun = body?.dry_run === true
      onlyUser = typeof body?.only_user_id === 'string' ? body.only_user_id : null
    }
  } catch { /* sem body, ok */ }

  // 1. estudantes em risco
  let riskQuery = supabase
    .from('student_engagement_risk')
    .select('user_id, course_id, days_inactive, risk_level, last_activity_at')
    .in('risk_level', ['medium', 'high', 'lost'])
  if (onlyUser) riskQuery = riskQuery.eq('user_id', onlyUser)

  const { data: risks, error: riskError } = await riskQuery
  if (riskError) {
    console.error('failed to load risks', riskError)
    return new Response(JSON.stringify({ error: riskError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const candidates = (risks ?? []) as RiskRow[]
  if (candidates.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, skipped: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. cursos
  const courseIds = [...new Set(candidates.map((r) => r.course_id))]
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, professor_name, slug')
    .in('id', courseIds)
  const courseById = new Map((courses ?? []).map((c) => [c.id, c as CourseRow]))

  // 3. perfis dos alunos
  const userIds = [...new Set(candidates.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, full_name')
    .in('id', userIds)
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  // 4. emails via auth admin
  const emailById = new Map<string, string>()
  for (const uid of userIds) {
    try {
      const { data } = await supabase.auth.admin.getUserById(uid)
      if (data?.user?.email) emailById.set(uid, data.user.email)
    } catch (e) {
      console.warn('failed to fetch email for', uid, e)
    }
  }

  // 5. nudges já enviados (mais recente por user x course)
  const { data: prevNudges } = await supabase
    .from('evasion_nudges')
    .select('user_id, course_id, level, sent_at')
    .order('sent_at', { ascending: false })
  const lastLevelByKey = new Map<string, string>()
  for (const n of prevNudges ?? []) {
    const key = `${n.user_id}|${n.course_id}`
    if (!lastLevelByKey.has(key)) lastLevelByKey.set(key, n.level)
  }
  // 5b. templates editáveis (opcional; fallback pra copy hardcoded do template)
  const { data: tmplRows } = await supabase
    .from('nudge_templates')
    .select('level, notification_title, notification_body, email_subject, email_body_md')
  const templateByLevel = new Map<string, any>(
    (tmplRows ?? []).map((t: any) => [t.level, t]),
  )

  const interp = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

  let processed = 0
  let skipped = 0
  const results: any[] = []

  for (const r of candidates) {
    const key = `${r.user_id}|${r.course_id}`
    const lastLevel = lastLevelByKey.get(key)
    // só envia se ainda não enviou esse nível (escalona, não repete)
    if (lastLevel && PRIORITY[lastLevel] >= PRIORITY[r.risk_level]) {
      skipped++
      continue
    }

    const course = courseById.get(r.course_id)
    const profile = profileById.get(r.user_id) as any
    const email = emailById.get(r.user_id)
    if (!email || !course) {
      skipped++
      continue
    }
    const recipientName = profile?.nickname || profile?.full_name || ''
    const level = r.risk_level as 'medium' | 'high' | 'lost'

    if (dryRun) {
      results.push({ user_id: r.user_id, course_id: r.course_id, level, email })
      continue
    }

    const tmpl = templateByLevel.get(level)
    const vars = {
      nome: recipientName,
      curso: course.title,
      professor: course.professor_name,
      dias: r.days_inactive,
    }

    // notification in-app (usa template se houver, senão fallback)
    const notifTitle = tmpl
      ? interp(tmpl.notification_title, vars)
      : (level === 'lost' ? `${course.professor_name.toLowerCase()} mandou uma mensagem`
        : level === 'high' ? `${course.professor_name.toLowerCase()} sentiu sua falta`
        : `${course.professor_name.toLowerCase()} passou pra ver como você tá`)
    const notifBody = tmpl
      ? interp(tmpl.notification_body, vars)
      : `faz ${r.days_inactive} dias que você não aparece em ${course.title}`

    const { data: notif } = await supabase
      .from('notifications')
      .insert({
        user_id: r.user_id,
        kind: 'evasion_nudge',
        title: notifTitle,
        body: notifBody,
        link: `/app/eletiva/${course.slug}`,
        metadata: { course_id: r.course_id, level, days_inactive: r.days_inactive },
      })
      .select('id')
      .single()

    // email: usa template do banco via admin-direct-message; senão fallback evasion-nudge
    let emailSent = false
    try {
      const payload = tmpl
        ? {
            templateName: 'admin-direct-message',
            recipientEmail: email,
            idempotencyKey: `evasion-${r.user_id}-${r.course_id}-${level}`,
            templateData: {
              recipientName,
              authorName: course.professor_name,
              subject: interp(tmpl.email_subject, vars),
              bodyMd: interp(tmpl.email_body_md, vars),
              link: `https://nachesu.lovable.app/app/eletiva/${course.slug}`,
            },
          }
        : {
            templateName: 'evasion-nudge',
            recipientEmail: email,
            idempotencyKey: `evasion-${r.user_id}-${r.course_id}-${level}`,
            templateData: {
              recipientName,
              courseTitle: course.title,
              educatorName: course.professor_name,
              level,
              daysInactive: r.days_inactive,
              resumeUrl: `https://nachesu.lovable.app/app/eletiva/${course.slug}`,
            },
          }

      const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(payload),
      })
      emailSent = resp.ok
      if (!resp.ok) console.warn('email failed', await resp.text())
    } catch (e) {
      console.error('email exception', e)
    }

    // registra nudge
    await supabase.from('evasion_nudges').insert({
      user_id: r.user_id,
      course_id: r.course_id,
      level,
      days_inactive: r.days_inactive,
      email_sent: emailSent,
      notification_id: notif?.id ?? null,
    })

    processed++
    results.push({ user_id: r.user_id, course_id: r.course_id, level, email_sent: emailSent })
  }

  return new Response(
    JSON.stringify({ ok: true, processed, skipped, dry_run: dryRun, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
