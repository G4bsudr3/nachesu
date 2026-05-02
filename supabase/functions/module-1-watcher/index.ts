// module-1-watcher
//
// roda em loop (cron) e levanta student_alerts quando:
//   - aluno iniciou a aula 1 ("abrir o olho") há mais de 48h
//   - e ainda não enviou o radar (module_deliverables.submitted_at IS NULL)
//   - e ainda não tem alerta aberto pra esse par (user_id, module_id, kind)
//
// retorna json com contagem de alertas criados pra a função poder ser testada
// manualmente via supabase--curl_edge_functions ou disparada por pg_cron.
//
// segurança:
//   - usa service role key (acessa todos os registros, ignora rls)
//   - só permite chamadas autenticadas como admin OU com header
//     x-cron-secret quando vier do pg_cron
//   - validate_jwt fica false (default lovable); validamos manualmente

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const ALERT_KIND = 'inactivity_48h'
const HOURS_THRESHOLD = 48

interface RunResult {
  module_id: string
  module_number: number
  module_title: string
  scanned_started: number
  alerts_created: number
  alerts_existing: number
  threshold_hours: number
  cutoff_iso: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // ---- autorização ---------------------------------------------------
    // só admin logado pode chamar (cron fica pra depois quando virar agendado)
    const authHeader = req.headers.get('Authorization') ?? ''
    let allowed = false
    let actor = 'unknown'

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: claims } = await userClient.auth.getClaims(token)
      if (claims?.claims?.sub) {
        const uid = claims.claims.sub
        const { data: isAdmin } = await userClient.rpc('has_role', {
          _user_id: uid,
          _role: 'admin',
        })
        if (isAdmin === true) {
          allowed = true
          actor = `admin:${uid}`
        }
      }
    }

    if (!allowed) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    // ---- query principal -----------------------------------------------
    // service role pra ignorar rls e poder inserir alertas pra qualquer aluno
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // 1. acha módulo 1
    const { data: mod, error: modError } = await admin
      .from('modules')
      .select('id, number, title')
      .eq('number', 1)
      .maybeSingle()

    if (modError) throw modError
    if (!mod) {
      return jsonResponse({ error: 'module 1 not found' }, 404)
    }

    const cutoff = new Date(Date.now() - HOURS_THRESHOLD * 60 * 60 * 1000)

    // 2. quem começou há mais de 48h
    const { data: started, error: startedError } = await admin
      .from('student_module_progress')
      .select('user_id, started_at, completed_at')
      .eq('module_id', mod.id)
      .lte('started_at', cutoff.toISOString())
      .is('completed_at', null)

    if (startedError) throw startedError
    const candidates = started ?? []
    const candidateIds = candidates.map((c) => c.user_id)

    if (candidateIds.length === 0) {
      const result: RunResult = {
        module_id: mod.id,
        module_number: mod.number,
        module_title: mod.title,
        scanned_started: 0,
        alerts_created: 0,
        alerts_existing: 0,
        threshold_hours: HOURS_THRESHOLD,
        cutoff_iso: cutoff.toISOString(),
      }
      console.log('[module-1-watcher]', actor, 'nada pra alertar', result)
      return jsonResponse({ ok: true, actor, result })
    }

    // 3. quem desses já submeteu (exclui)
    const { data: subs, error: subsError } = await admin
      .from('module_deliverables')
      .select('user_id')
      .eq('module_id', mod.id)
      .not('submitted_at', 'is', null)
      .in('user_id', candidateIds)

    if (subsError) throw subsError
    const submittedSet = new Set((subs ?? []).map((s) => s.user_id))

    // 4. quem já tem alerta aberto desse tipo (qualquer estado, dedup pelo unique)
    const { data: existing, error: existingError } = await admin
      .from('student_alerts')
      .select('user_id')
      .eq('module_id', mod.id)
      .eq('kind', ALERT_KIND)
      .in('user_id', candidateIds)

    if (existingError) throw existingError
    const existingSet = new Set((existing ?? []).map((a) => a.user_id))

    // 5. monta lista a inserir
    const toInsert = candidates
      .filter(
        (c) => !submittedSet.has(c.user_id) && !existingSet.has(c.user_id),
      )
      .map((c) => ({
        user_id: c.user_id,
        module_id: mod.id,
        kind: ALERT_KIND,
        notes: `iniciou em ${c.started_at} sem submeter o radar em ${HOURS_THRESHOLD}h`,
      }))

    let created = 0
    if (toInsert.length > 0) {
      // upsert com onConflict pra ser idempotente em caso de race
      const { data: inserted, error: insertError } = await admin
        .from('student_alerts')
        .upsert(toInsert, {
          onConflict: 'user_id,module_id,kind',
          ignoreDuplicates: true,
        })
        .select('id')

      if (insertError) throw insertError
      created = inserted?.length ?? 0
    }

    const result: RunResult = {
      module_id: mod.id,
      module_number: mod.number,
      module_title: mod.title,
      scanned_started: candidates.length,
      alerts_created: created,
      alerts_existing: existingSet.size,
      threshold_hours: HOURS_THRESHOLD,
      cutoff_iso: cutoff.toISOString(),
    }

    console.log('[module-1-watcher]', actor, 'ok', result)
    return jsonResponse({ ok: true, actor, result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[module-1-watcher] erro', msg)
    return jsonResponse({ error: msg }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
