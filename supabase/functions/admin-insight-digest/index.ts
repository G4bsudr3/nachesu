// admin-insight-digest: gera resumo diário da operação NachesU pra Command Center.
// 1 chamada à Lovable AI (gemini-2.5-flash) com agregados dos últimos 7d vs 7d anteriores.
// salva em admin_insights, retorna o registro.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const PERIOD_DAYS = 7;

interface CourseAgg {
  course_id: string;
  title: string;
  matriculados: number;
  ativos_7d: number;
  ativos_7d_prev: number;
  modulos_completos_7d: number;
  modulos_completos_7d_prev: number;
  entregas_pendentes: number;
  em_risco: number;
  module_health: Array<{
    number: number;
    title: string;
    started: number;
    completed: number;
    drop_pct: number;
    avg_rating: number | null;
  }>;
}

interface DigestPayload {
  generated_at: string;
  period_start: string;
  period_end: string;
  pendentes_aprovacao: number;
  courses: CourseAgg[];
}

const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86400000).toISOString();

async function buildAgg(supabase: any): Promise<DigestPayload> {
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = isoDaysAgo(PERIOD_DAYS);
  const prevStart = isoDaysAgo(PERIOD_DAYS * 2);

  const [coursesRes, pendRes] = await Promise.all([
    supabase.from("courses").select("id, title, slug").order("order_index"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const courses = coursesRes.data ?? [];
  const pendentes = pendRes.count ?? 0;

  const courseAggs: CourseAgg[] = [];

  for (const c of courses) {
    const [enrollRes, riskRes, delivRes, progRes, ratingRes, modulesRes] =
      await Promise.all([
        supabase
          .from("enrollments")
          .select("user_id", { count: "exact", head: true })
          .eq("course_id", c.id)
          .eq("status", "active"),
        supabase
          .from("student_engagement_risk")
          .select("user_id", { count: "exact", head: true })
          .eq("course_id", c.id)
          .in("risk_level", ["medium", "high", "lost"]),
        supabase
          .from("module_deliverables")
          .select("id, modules!inner(trails!inner(course_id))", {
            count: "exact",
            head: true,
          })
          .eq("status", "enviado")
          .eq("modules.trails.course_id", c.id),
        supabase
          .from("student_module_progress")
          .select(
            "user_id, module_id, started_at, completed_at, modules!inner(number, title, trails!inner(course_id))",
          )
          .eq("modules.trails.course_id", c.id)
          .gte("started_at", prevStart),
        supabase
          .from("module_ratings")
          .select("module_id, rating, modules!inner(number, trails!inner(course_id))")
          .eq("modules.trails.course_id", c.id),
        supabase
          .from("modules")
          .select("id, number, title, trails!inner(course_id)")
          .eq("trails.course_id", c.id)
          .eq("published", true)
          .order("number"),
      ]);

    const progress = progRes.data ?? [];
    const ratings = ratingRes.data ?? [];
    const modules = modulesRes.data ?? [];

    const ativos7d = new Set(
      progress
        .filter((p: any) => p.started_at >= periodStart)
        .map((p: any) => p.user_id),
    ).size;
    const ativos7dPrev = new Set(
      progress
        .filter((p: any) => p.started_at >= prevStart && p.started_at < periodStart)
        .map((p: any) => p.user_id),
    ).size;
    const completos7d = progress.filter(
      (p: any) => p.completed_at && p.completed_at >= periodStart,
    ).length;
    const completos7dPrev = progress.filter(
      (p: any) =>
        p.completed_at && p.completed_at >= prevStart && p.completed_at < periodStart,
    ).length;

    const ratingByModule = new Map<string, number[]>();
    ratings.forEach((r: any) => {
      if (!ratingByModule.has(r.module_id)) ratingByModule.set(r.module_id, []);
      ratingByModule.get(r.module_id)!.push(r.rating);
    });

    const moduleHealth = modules
      .map((m: any) => {
        const modProg = progress.filter((p: any) => p.module_id === m.id);
        const started = new Set(modProg.map((p: any) => p.user_id)).size;
        const completed = new Set(
          modProg.filter((p: any) => p.completed_at).map((p: any) => p.user_id),
        ).size;
        const drop = started > 0 ? Math.round(((started - completed) / started) * 100) : 0;
        const ratings = ratingByModule.get(m.id) ?? [];
        const avgRating = ratings.length
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : null;
        return {
          number: m.number,
          title: m.title,
          started,
          completed,
          drop_pct: drop,
          avg_rating: avgRating,
        };
      })
      .filter((m) => m.started > 0);

    courseAggs.push({
      course_id: c.id,
      title: c.title,
      matriculados: enrollRes.count ?? 0,
      ativos_7d: ativos7d,
      ativos_7d_prev: ativos7dPrev,
      modulos_completos_7d: completos7d,
      modulos_completos_7d_prev: completos7dPrev,
      entregas_pendentes: delivRes.count ?? 0,
      em_risco: riskRes.count ?? 0,
      module_health: moduleHealth,
    });
  }

  return {
    generated_at: periodEnd,
    period_start: periodStart,
    period_end: periodEnd,
    pendentes_aprovacao: pendentes,
    courses: courseAggs,
  };
}

const SYSTEM_PROMPT = `tu é analista da operação NachesU e escreve o resumo diário do Command Center pro frattz (admin).

regras absolutas:
- tudo lowercase, sem em-dash, sem hashtag, sem emoji, sem corporativês
- tom Naveia/frattz adaptado pra escola: "você", direto, curto, sem firula
- 3 a 5 frases no total, cada uma 1 fato + 1 comparação ou consequência
- só observa o que os números mostram; nunca invente
- se nada mudou significativamente, diga isso com graça
- proibido: "jornada", "destravar", "engajamento", "ecossistema", "sinergia", "mindset", "alavancar"
- nome das eletivas em minúsculo
- nada de bullets, é texto corrido em 1 parágrafo único

você recebe agregados de 7 dias vs 7 anteriores. produza apenas o texto, sem cabeçalho.`;

async function generateSummary(payload: DigestPayload): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const userPrompt = `agregados últimos 7 dias vs 7 anteriores:

pendentes de aprovação agora: ${payload.pendentes_aprovacao}

${payload.courses
  .map((c) => {
    const ativosDelta = c.ativos_7d - c.ativos_7d_prev;
    const completosDelta = c.modulos_completos_7d - c.modulos_completos_7d_prev;
    const piores = [...c.module_health]
      .filter((m) => m.drop_pct >= 30 || (m.avg_rating !== null && m.avg_rating <= 3))
      .slice(0, 3)
      .map(
        (m) =>
          `módulo ${m.number} (${m.title}): ${m.completed}/${m.started} concluiu, drop ${m.drop_pct}%${
            m.avg_rating !== null ? `, nota média ${m.avg_rating}` : ""
          }`,
      );
    return `eletiva "${c.title}":
- matriculados ativos: ${c.matriculados}
- ativos nos últimos 7d: ${c.ativos_7d} (semana anterior: ${c.ativos_7d_prev}, delta ${ativosDelta >= 0 ? "+" : ""}${ativosDelta})
- módulos completados 7d: ${c.modulos_completos_7d} (anterior: ${c.modulos_completos_7d_prev}, delta ${completosDelta >= 0 ? "+" : ""}${completosDelta})
- entregas esperando revisão: ${c.entregas_pendentes}
- em risco de evasão: ${c.em_risco}
${piores.length ? `- módulos preocupantes:\n  · ${piores.join("\n  · ")}` : "- nenhum módulo crítico"}`;
  })
  .join("\n\n")}

escreva o resumo agora (1 parágrafo, 3-5 frases).`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Lovable AI ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("resposta vazia da IA");
  }
  return content.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "auth requerido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // valida que quem chamou é admin
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "só admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await buildAgg(admin);
    const summary = await generateSummary(payload);

    const { data: inserted, error: insErr } = await admin
      .from("admin_insights")
      .insert({
        scope: "global",
        summary_md: summary,
        model: MODEL,
        period_start: payload.period_start,
        period_end: payload.period_end,
        raw_metrics: payload as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ insight: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[admin-insight-digest]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
