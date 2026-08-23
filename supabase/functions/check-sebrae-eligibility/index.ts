// retorna se o email é do domínio da escola e a lista de eletivas publicadas.
// usado pelo Auth.tsx pra decidir se pergunta qual eletiva no primeiro acesso.
//
// SEC-06/SEC-07: esta rota é pública e NÃO faz nenhum lookup por email
// (convite, conta auth, perfil). qualquer resposta que variasse por email
// existente transformava o login em oráculo de enumeração de estudantes.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit, clientIp, tooManyRequests } from '../_shared/rate-limit.ts'
import { fail } from '../_shared/errors.ts'

const FN = 'check-sebrae-eligibility'

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const clean = email.trim().toLowerCase()
    const isSebrae = clean.endsWith('@edu.sebrae.com.br')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // rate limit por IP (fail-open)
    if (!(await checkRateLimit(admin, `cse:${clientIp(req)}`, 30, 60))) {
      return tooManyRequests(cors)
    }

    // lista de cursos publicados (informação pública, não depende do email)
    const { data: courses } = await admin
      .from('courses')
      .select('id, slug, title')
      .eq('published', true)
      .order('order_index')

    // a escolha de eletiva é perguntada pra todo email do domínio da escola.
    // se a pessoa já tem convite ou conta, o send-access-link ignora a escolha.
    return new Response(JSON.stringify({
      needs_course_choice: isSebrae,
      courses: isSebrae ? (courses ?? []) : [],
    }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return fail(cors, {
      status: 500,
      code: 'unexpected',
      message: 'não consegui checar a elegibilidade agora, tenta de novo',
      cause: e,
      fn: FN,
    })
  }
})
