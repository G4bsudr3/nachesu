// gera análise crítica, rascunho de feedback ou rascunho de resposta para uma entrega
// admin-only. modes: "draft" (default) | "analysis" | "reply"

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOM = `regras de tom (não-negociáveis):
- tudo em pt-BR, tudo minúsculo
- usa "você", nunca "tu"
- frases curtas (1-3 linhas)
- zero em-dash, zero emoji, zero hashtag, zero corporativês
- vocabulário: "estudante" não "aluno"; "educador" não "professor"
- celebra o que ficou forte antes de pedir ajuste
- markdown leve permitido: **negrito**, *itálico*, listas com -`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')

  const auth = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: hasRole } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!hasRole) return json({ error: 'forbidden' }, 403)
  if (!lovableKey) return json({ error: 'LOVABLE_API_KEY ausente' }, 500)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid json' }, 400) }
  const deliverableId: string = body?.deliverable_id
  if (!deliverableId || typeof deliverableId !== 'string') {
    return json({ error: 'deliverable_id obrigatório' }, 400)
  }
  const mode: 'draft' | 'analysis' | 'reply' =
    body?.mode === 'analysis' || body?.mode === 'reply' ? body.mode : 'draft'

  // busca entrega + módulo + perfil
  const { data: del, error: delErr } = await admin
    .from('module_deliverables')
    .select('id, user_id, module_id, content, feedback, module:modules(id, number, title, objective, deliverable_description, rubric_id)')
    .eq('id', deliverableId)
    .maybeSingle()
  if (delErr || !del) {
    console.error('deliverable lookup failed', { deliverableId, delErr })
    return json({ error: 'entrega não encontrada', detail: delErr?.message }, 404)
  }

  const { data: profileRow } = await admin
    .from('profiles')
    .select('display_name, nickname')
    .eq('user_id', del.user_id)
    .maybeSingle()
  ;(del as any).profile = profileRow

  // rubrica vinculada ao módulo ou default
  let rubricId = (del as any).module?.rubric_id ?? null
  let rubric: any = null
  if (rubricId) {
    const { data } = await admin.from('rubrics').select('*').eq('id', rubricId).maybeSingle()
    rubric = data
  }
  if (!rubric) {
    const { data } = await admin.from('rubrics').select('*').eq('is_default', true).limit(1).maybeSingle()
    rubric = data
  }

  const criteria = (rubric?.criteria ?? []) as Array<{ label: string; description?: string }>
  const studentName = (del as any).profile?.display_name ?? (del as any).profile?.nickname ?? 'estudante'
  const moduleLabel = (del as any).module ? `módulo ${(del as any).module.number} · ${(del as any).module.title}` : 'módulo'
  const moduleSummary = (del as any).module?.summary ?? ''
  const scoreMax = rubric?.score_max ?? 10

  // serializa respostas da entrega
  const content = (del.content ?? {}) as Record<string, unknown>
  const answers = serializeAnswers(content)

  const rubricBlock = criteria.length
    ? criteria.map((c) => `- ${c.label}${c.description ? `: ${c.description}` : ''}`).join('\n')
    : '(sem critérios definidos)'

  const baseContext = `estudante: ${studentName}
${moduleLabel}
${moduleSummary ? `contexto do módulo: ${moduleSummary}` : ''}

rubrica disponível:
${rubricBlock}

entrega do estudante:
${answers || '(entrega vazia)'}`

  let systemPrompt = ''
  let userPrompt = ''
  let tool: Record<string, unknown>

  if (mode === 'analysis') {
    systemPrompt = `você é um educador experiente da NachesU analisando criticamente a entrega de um estudante de 14-15 anos.

sua análise é para o educador ler, não para o estudante. seja honesto e específico, citando trechos da entrega.

${TOM}

avalie:
- o que está forte de verdade (nada de elogio genérico)
- o que está frágil ou raso
- onde falta evidência, exemplo concreto ou aprofundamento
- se a resposta parece genérica, copiada de ia ou fora do que o módulo pediu`
    userPrompt = `${baseContext}

nota máxima da rubrica: ${scoreMax}

analisa criticamente essa entrega agora.`
    tool = {
      type: 'function',
      function: {
        name: 'analyze_deliverable',
        description: 'devolve a análise crítica da entrega para o educador',
        parameters: {
          type: 'object',
          properties: {
            strengths: { type: 'array', items: { type: 'string' }, description: 'até 3 pontos fortes concretos' },
            gaps: { type: 'array', items: { type: 'string' }, description: 'até 3 fragilidades ou lacunas concretas' },
            risk_note: { type: 'string', description: 'alerta curto de resposta genérica/copiada/fora de escopo, ou string vazia' },
            suggested_verdict: { type: 'string', enum: ['aprovado', 'ajustar'], description: 'sugestão de veredito' },
            suggested_score: { type: 'number', description: `nota sugerida de 0 a ${scoreMax}` },
            suggested_tags: { type: 'array', items: { type: 'string' }, description: 'até 3 labels da rubrica' },
          },
          required: ['strengths', 'gaps', 'risk_note', 'suggested_verdict', 'suggested_score', 'suggested_tags'],
          additionalProperties: false,
        },
      },
    }
  } else if (mode === 'reply') {
    const { data: thread } = await admin
      .from('deliverable_messages')
      .select('author_role, body_md, created_at')
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: true })
      .limit(30)
    const threadBlock = (thread ?? []).length
      ? (thread ?? [])
          .map((m: any) => `${m.author_role === 'student' ? 'estudante' : 'educador'}: ${String(m.body_md).slice(0, 1200)}`)
          .join('\n\n')
      : '(sem mensagens ainda)'

    systemPrompt = `você é um educador da NachesU respondendo a um estudante de 14-15 anos numa conversa sobre a entrega dele.

${TOM}

a resposta é curta (2-5 linhas), responde o que o estudante perguntou ou comentou por último, e termina com um próximo passo claro. nunca punitiva.`
    userPrompt = `${baseContext}

${del.feedback ? `feedback já dado pelo educador:\n${del.feedback}\n` : ''}
conversa até aqui:
${threadBlock}

escreve o rascunho da próxima resposta do educador.`
    tool = {
      type: 'function',
      function: {
        name: 'draft_reply',
        description: 'devolve o rascunho de resposta do educador ao estudante',
        parameters: {
          type: 'object',
          properties: {
            draft_md: { type: 'string', description: 'resposta curta em markdown leve, pt-BR minúsculo' },
          },
          required: ['draft_md'],
          additionalProperties: false,
        },
      },
    }
  } else {
    systemPrompt = `você é um educador da NachesU (Naches + Sebrae BH) ajudando a rascunhar um feedback escrito para um estudante de 14-15 anos do ensino médio.

${TOM}

estrutura sugerida do feedback (curta, 4-8 linhas no total):
1. uma linha valorizando algo concreto da entrega
2. uma observação específica sobre o que pode aprofundar/ajustar (cita o trecho)
3. um próximo passo claro e acionável

depois, sugira 1 a 3 tags da rubrica que melhor descrevem essa entrega.`
    userPrompt = `${baseContext}

gera o rascunho de feedback agora.`
    tool = {
      type: 'function',
      function: {
        name: 'draft_feedback',
        description: 'devolve o feedback rascunhado em markdown e as tags sugeridas da rubrica',
        parameters: {
          type: 'object',
          properties: {
            draft_md: { type: 'string', description: 'feedback em markdown leve, 4-8 linhas, em pt-BR minúsculo' },
            suggested_tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'até 3 labels da rubrica que melhor se aplicam',
            },
          },
          required: ['draft_md', 'suggested_tags'],
          additionalProperties: false,
        },
      },
    }
  }

  const toolName = (tool as any).function.name

  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: 'function', function: { name: toolName } },
    }),
  })

  if (!aiRes.ok) {
    const t = await aiRes.text()
    console.error('ai gateway error', aiRes.status, t)
    if (aiRes.status === 429) return json({ error: 'limite de uso atingido, tenta de novo daqui a pouco' }, 429)
    if (aiRes.status === 402) return json({ error: 'créditos esgotados no workspace' }, 402)
    return json({ error: 'falha ao gerar com a ia' }, 500)
  }

  const data = await aiRes.json()
  const call = data?.choices?.[0]?.message?.tool_calls?.[0]
  let parsed: any = null
  try { parsed = JSON.parse(call?.function?.arguments ?? '{}') } catch { /* ignora */ }
  if (!parsed) return json({ error: 'resposta vazia da ia' }, 500)

  const validLabels = new Set(criteria.map((c) => c.label.toLowerCase()))
  const cleanTags = (raw: unknown) =>
    (Array.isArray(raw) ? raw : [])
      .map((t) => String(t).toLowerCase().trim())
      .filter((t) => validLabels.has(t))
      .slice(0, 3)

  const rubricInfo = { id: rubric?.id ?? null, slug: rubric?.slug ?? null, name: rubric?.name ?? null }

  if (mode === 'analysis') {
    const clampList = (raw: unknown) =>
      (Array.isArray(raw) ? raw : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
    const rawScore = Number(parsed.suggested_score)
    const suggestedScore = Number.isFinite(rawScore)
      ? Math.min(Math.max(rawScore, 0), scoreMax)
      : null
    return json({
      strengths: clampList(parsed.strengths),
      gaps: clampList(parsed.gaps),
      risk_note: String(parsed.risk_note ?? '').trim(),
      suggested_verdict: parsed.suggested_verdict === 'ajustar' ? 'ajustar' : 'aprovado',
      suggested_score: suggestedScore,
      score_max: scoreMax,
      suggested_tags: cleanTags(parsed.suggested_tags),
      rubric: rubricInfo,
    })
  }

  if (!parsed.draft_md) return json({ error: 'rascunho vazio' }, 500)

  return json({
    draft_md: String(parsed.draft_md).trim(),
    suggested_tags: mode === 'draft' ? cleanTags(parsed.suggested_tags) : [],
    rubric: rubricInfo,
  })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function serializeAnswers(content: Record<string, unknown>): string {
  // tenta extrair respostas comuns; fallback pro JSON serializado
  const skip = new Set(['review_verdict', 'review_tags', 'feedback_read_at', 'history'])
  const lines: string[] = []
  for (const [key, value] of Object.entries(content)) {
    if (skip.has(key)) continue
    if (value == null || value === '') continue
    if (typeof value === 'string') {
      lines.push(`### ${key}\n${value}`)
    } else if (Array.isArray(value)) {
      lines.push(`### ${key}\n${value.map((v) => `- ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n')}`)
    } else if (typeof value === 'object') {
      lines.push(`### ${key}\n${JSON.stringify(value, null, 2)}`)
    } else {
      lines.push(`### ${key}\n${String(value)}`)
    }
  }
  return lines.join('\n\n').slice(0, 8000)
}
