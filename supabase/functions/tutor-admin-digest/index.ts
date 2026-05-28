// gera digest editorial dos últimos 7d de uso do tutor.
// só admin. cacheia em admin_insights scope='tutor:7d'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdminRow } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!isAdminRow) {
      return new Response(JSON.stringify({ error: "só admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [evRes, convRes, trailRes] = await Promise.all([
      admin.from("tutor_message_events")
        .select("trail_id, user_id, off_scope, helpful, latency_ms, tokens_estimate, created_at")
        .gte("created_at", periodStart.toISOString()),
      admin.from("tutor_conversations")
        .select("trail_id, messages, updated_at")
        .gte("updated_at", periodStart.toISOString())
        .order("updated_at", { ascending: false })
        .limit(80),
      admin.from("trails").select("id, title"),
    ]);

    const events = evRes.data ?? [];
    const conversations = convRes.data ?? [];
    const trailMap = new Map<string, string>(
      (trailRes.data ?? []).map((t: { id: string; title: string }) => [t.id, t.title]),
    );

    // anonimização LGPD: remove nome próprio, email, telefone, @handle, link
    const anonymize = (raw: string): string => {
      let t = raw;
      t = t.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
      t = t.replace(/https?:\/\/\S+/g, "[link]");
      t = t.replace(/@[A-Za-z0-9_.]{2,}/g, "[handle]");
      t = t.replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]");
      t = t.replace(/\b(?:eu\s+sou|me\s+chamo|sou\s+o|sou\s+a|meu\s+nome\s+é)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+){0,2})/gi, (_m, _g) => "[nome]");
      return t;
    };

    // amostra de perguntas (até 200, truncadas em 240 chars, anonimizadas)
    const userQuestions: string[] = [];
    for (const conv of conversations) {
      const msgs = Array.isArray(conv.messages) ? (conv.messages as Array<{ role?: string; content?: string }>) : [];
      const recentUserMsgs = msgs.filter((m) => m?.role === "user" && typeof m?.content === "string").slice(-3);
      const trailName = trailMap.get(conv.trail_id) ?? "trilha";
      for (const m of recentUserMsgs) {
        const cleaned = anonymize((m.content as string).replace(/\s+/g, " ").trim()).slice(0, 240);
        if (cleaned.length > 4) userQuestions.push(`[${trailName.toLowerCase()}] ${cleaned}`);
        if (userQuestions.length >= 200) break;
      }
      if (userQuestions.length >= 200) break;
    }

    const totalQuestions = events.length;
    const uniqueStudents = new Set(events.map((e) => e.user_id)).size;
    const offScopePct = totalQuestions > 0
      ? Math.round((events.filter((e) => e.off_scope).length / totalQuestions) * 100)
      : 0;
    const helpfulCount = events.filter((e) => e.helpful === 1).length;
    const unhelpfulCount = events.filter((e) => e.helpful === -1).length;
    const ratedCount = helpfulCount + unhelpfulCount;
    const helpfulPct = ratedCount > 0 ? Math.round((helpfulCount / ratedCount) * 100) : null;

    const prompt = `você analisa o uso do tutor ia "joão-de-barro" da nachesu (eletivas pra ensino médio na escola sebrae bh).

período: últimos 7 dias.
total de perguntas: ${totalQuestions}
estudantes únicos: ${uniqueStudents}
% off-scope (saiu da eletiva): ${offScopePct}%
% 👍 (de quem avaliou): ${helpfulPct ?? "—"}%

amostra de perguntas reais (com a trilha entre colchetes):
${userQuestions.slice(0, 120).map((q, i) => `${i + 1}. ${q}`).join("\n")}

devolve em markdown editorial, lowercase, sem em-dash, sem hashtags, sem emoji, com EXATAMENTE essas seções:

## 5 dores recorrentes
(lista numerada, cada item 1 linha, descreve o padrão que aparece nas perguntas)

## 3 sinais de frustração
(lista numerada, momentos onde o estudante parece travado ou perdido)

## 2 oportunidades pedagógicas
(lista numerada, sugestões concretas pro educador melhorar a próxima aula com base no que apareceu)

tom: direto, sem corporativês, sem encher linguiça. máximo 6 linhas por seção.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("digest ai gateway:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ia falhou no digest" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const summaryMd = aiJson.choices?.[0]?.message?.content ?? "(sem resposta da ia)";

    const raw = {
      totalQuestions, uniqueStudents, offScopePct, helpfulPct,
      helpfulCount, unhelpfulCount, sampleSize: userQuestions.length,
      anonymized: true,
    };

    await admin.from("admin_insights").insert({
      scope: "tutor:7d",
      summary_md: summaryMd,
      raw_metrics: raw,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      model: "google/gemini-2.5-flash",
    });

    return new Response(JSON.stringify({ ok: true, summary_md: summaryMd, raw }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tutor-admin-digest:", e);
    return new Response(JSON.stringify({ error: "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
