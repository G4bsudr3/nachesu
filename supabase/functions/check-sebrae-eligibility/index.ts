// retorna se um email pode entrar via @edu.sebrae.com.br e se já tem convite/conta
// usado pelo Auth.tsx pra decidir se pergunta qual eletiva no signup.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clean = email.trim().toLowerCase()
    const isSebrae = clean.endsWith('@edu.sebrae.com.br')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // tem convite prévio?
    const { data: invite } = await admin
      .from('course_invites')
      .select('course_id, courses:course_id(slug, title)')
      .eq('email_normalized', clean)
      .limit(1)
      .maybeSingle()

    const hasPreInvite = !!invite
    const preCourse = invite?.courses as { slug: string; title: string } | null | undefined

    // já tem conta auth?
    let accountExists = false
    try {
      const { data: lookup } = await admin.rpc('lookup_user_by_email', { _email: clean })
      accountExists = Array.isArray(lookup) && lookup.length > 0
    } catch { /* noop */ }

    // lista de cursos disponíveis (pra exibir seletor)
    const { data: courses } = await admin
      .from('courses')
      .select('id, slug, title')
      .eq('published', true)
      .order('order_index')

    return new Response(JSON.stringify({
      is_sebrae: isSebrae,
      allowed: isSebrae || hasPreInvite,
      has_pre_invite: hasPreInvite,
      pre_course: preCourse ?? null,
      account_exists: accountExists,
      needs_course_choice: isSebrae && !hasPreInvite && !accountExists,
      courses: courses ?? [],
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
