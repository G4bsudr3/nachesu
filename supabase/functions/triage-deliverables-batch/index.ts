// triagem por ia em lote das entregas dos estudantes.
// admin-only. processa um lote pequeno por chamada e grava em deliverable_ai_reviews.
// o cliente chama em loop até restantes = 0, com barra de progresso.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "openai/gpt-6-astra";
const MAX_BATCH = 8;

const SYSTEM = `você é educador experiente da NachesU triando entregas de estudantes de 14-15 anos.

sua saída é pro educador, não pro estudante. seja honesto, curto e específico.

vereditos:
- "ok": respondeu o que o módulo pediu, com conteúdo próprio e suficiente pra idade
- "revisar": respondeu, mas raso, incompleto ou fora de foco em parte
- "atencao": praticamente vazio, resposta genérica, copiada de ia, ou fora do que o módulo pediu

regras de tom: pt-BR, tudo minúsculo, frases curtas, zero em-dash, zero emoji, zero hashtag.
"estudante" nunca "aluno". resumo com no máximo 2 linhas. no máximo 3 motivos, cada um com até 12 palavras.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: hasRole } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!hasRole) return json({ error: "forbidden" }, 403);
  if (!lovableKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corpo opcional */ }
  const courseId = typeof body.course_id === "string" ? body.course_id : null;
  const moduleId = typeof body.module_id === "string" ? body.module_id : null;
  const batchSize = Math.min(Number(body.batch_size) || 5, MAX_BATCH);

  // candidatas: entregas enviadas, ainda não revisadas, sem triagem guardada
  const { data: candidates, error: candErr } = await admin.rpc("admin_triage_candidates", {
    p_course_id: courseId,
    p_module_id: moduleId,
    p_limit: batchSize,
  });
  if (candErr) return json({ error: candErr.message }, 500);

  const { data: remainingRow } = await admin.rpc("admin_triage_pending_count", {
    p_course_id: courseId,
    p_module_id: moduleId,
  });
  const remainingBefore = Number(remainingRow ?? 0);

  const rows = (candidates ?? []) as Array<{
    deliverable_id: string;
    content: unknown;
    module_number: number | null;
    module_title: string | null;
    module_objective: string | null;
    deliverable_description: string | null;
  }>;

  let processed = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const answers = serializeAnswers((row.content ?? {}) as Record<string, unknown>);
    const prompt = `módulo ${row.module_number ?? "?"} · ${row.module_title ?? ""}
${row.module_objective ? `objetivo do módulo: ${row.module_objective}` : ""}
${row.deliverable_description ? `o que o módulo pediu: ${row.deliverable_description}` : ""}

entrega do estudante:
${answers || "(entrega vazia)"}

triagem essa entrega agora.`;

    let parsed: TriageResult | null = null;
    try {
      parsed = await triage(lovableKey, prompt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // circuito: crédito/bloqueio para o lote inteiro na hora
      if (msg.startsWith("402") || msg.startsWith("403")) {
        return json({ error: "ia_bloqueada", detail: msg, processed, remaining: remainingBefore - processed }, 200);
      }
      if (msg.startsWith("429")) {
        return json({ error: "ia_limite", detail: msg, processed, remaining: remainingBefore - processed }, 200);
      }
      failures.push(`${row.deliverable_id}: ${msg}`);
      continue;
    }
    if (!parsed) { failures.push(`${row.deliverable_id}: resposta vazia`); continue; }

    const { error: upErr } = await admin.from("deliverable_ai_reviews").upsert(
      {
        deliverable_id: row.deliverable_id,
        verdict: parsed.verdict,
        summary: parsed.summary,
        reasons: parsed.reasons,
        suggested_score: parsed.suggested_score,
        score_max: 10,
        model: MODEL,
      },
      { onConflict: "deliverable_id" },
    );
    if (upErr) { failures.push(`${row.deliverable_id}: ${upErr.message}`); continue; }
    processed += 1;
  }

  return json({
    processed,
    failures,
    remaining: Math.max(remainingBefore - processed, 0),
  });
});

type TriageResult = {
  verdict: "ok" | "revisar" | "atencao";
  summary: string;
  reasons: string[];
  suggested_score: number | null;
};

async function triage(key: string, prompt: string): Promise<TriageResult> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: SYSTEM,
      input: prompt,
      stream: true,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "triagem",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              verdict: { type: "string", enum: ["ok", "revisar", "atencao"] },
              summary: { type: "string" },
              reasons: { type: "array", items: { type: "string" } },
              suggested_score: { type: ["number", "null"] },
            },
            required: ["verdict", "summary", "reasons", "suggested_score"],
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${detail.slice(0, 300)}`);
  }

  const text = await readSseText(res);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("json inválido da ia");
  }
  const verdict = obj.verdict === "ok" || obj.verdict === "revisar" || obj.verdict === "atencao"
    ? obj.verdict
    : "revisar";
  const rawScore = Number(obj.suggested_score);
  return {
    verdict,
    summary: String(obj.summary ?? "").trim().slice(0, 400),
    reasons: (Array.isArray(obj.reasons) ? obj.reasons : [])
      .map((r) => String(r).trim())
      .filter(Boolean)
      .slice(0, 3),
    suggested_score: Number.isFinite(rawScore) ? Math.min(Math.max(rawScore, 0), 10) : null,
  };
}

/** lê o SSE do /v1/responses e devolve o texto final acumulado */
async function readSseText(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let completed = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            out += evt.delta;
          } else if (evt.type === "response.completed") {
            const o = evt.response?.output_text;
            if (typeof o === "string") completed = o;
          }
        } catch { /* ignora evento malformado */ }
      }
    }
  }
  return (out || completed).trim();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serializeAnswers(content: Record<string, unknown>): string {
  const skip = new Set(["review_verdict", "review_tags", "feedback_read_at", "history"]);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (skip.has(key)) continue;
    if (value == null || value === "") continue;
    if (typeof value === "string") lines.push(`### ${key}\n${value}`);
    else if (Array.isArray(value)) {
      lines.push(`### ${key}\n${value.map((v) => `- ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}`);
    } else if (typeof value === "object") lines.push(`### ${key}\n${JSON.stringify(value)}`);
    else lines.push(`### ${key}\n${String(value)}`);
  }
  return lines.join("\n\n").slice(0, 6000);
}
