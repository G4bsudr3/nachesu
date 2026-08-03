// analyze-pulso: lê as avaliações de checkpoint (module_ratings) do período e
// devolve uma leitura curta em markdown: o que está funcionando, principais
// atritos e o que fazer a seguir. salva em admin_insights (scope = 'pulso').
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3.5-flash";
const MAX_COMMENTS = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    // auth: precisa ser admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "não autenticado" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: "não autenticado" }, 401);

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "acesso restrito a admins" }, 403);

    let days: number | null = 30;
    try {
      const body = await req.json();
      if (body && "days" in body) {
        const d = body.days;
        days = d === null ? null : Number.isFinite(Number(d)) ? Number(d) : 30;
      }
    } catch {
      // body vazio: usa default
    }

    const periodStart = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
    const periodEnd = new Date().toISOString();

    let query = admin
      .from("module_ratings")
      .select(
        "rating, comment, created_at, modules!inner(number, title, trails!inner(title, courses!inner(title)))",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (periodStart) query = query.gte("created_at", periodStart);

    const { data: rows, error: qErr } = await query;
    if (qErr) return json({ error: `falha ao ler avaliações: ${qErr.message}` }, 500);

    type Row = {
      rating: number;
      comment: string | null;
      created_at: string;
      // deno-lint-ignore no-explicit-any
      modules: any;
    };
    const ratings = (rows ?? []) as Row[];
    if (ratings.length === 0) {
      return json({ error: "nenhuma avaliação no período selecionado" }, 400);
    }

    const flat = ratings.map((r) => ({
      nota: r.rating,
      comentario: (r.comment ?? "").trim(),
      eletiva: r.modules?.trails?.courses?.title ?? "",
      trilha: r.modules?.trails?.title ?? "",
      modulo: r.modules?.number ?? 0,
      modulo_titulo: r.modules?.title ?? "",
    }));

    const media = Number(
      (flat.reduce((a, b) => a + b.nota, 0) / flat.length).toFixed(2),
    );
    const dist = [1, 2, 3, 4, 5].map((n) => ({
      nota: n,
      qtd: flat.filter((f) => f.nota === n).length,
    }));

    const porModulo = Object.values(
      flat.reduce((acc: Record<string, { chave: string; notas: number[] }>, f) => {
        const chave = `${f.eletiva} · módulo ${f.modulo} ${f.modulo_titulo}`;
        acc[chave] = acc[chave] ?? { chave, notas: [] };
        acc[chave].notas.push(f.nota);
        return acc;
      }, {}),
    ).map((m) => ({
      modulo: m.chave,
      media: Number((m.notas.reduce((a, b) => a + b, 0) / m.notas.length).toFixed(2)),
      respostas: m.notas.length,
    }));

    const comentarios = flat
      .filter((f) => f.comentario.length > 0)
      .slice(0, MAX_COMMENTS)
      .map((f) => `[${f.nota}★ · ${f.eletiva} · mód ${f.modulo}] ${f.comentario}`);

    const payload = {
      periodo: days ? `últimos ${days} dias` : "histórico completo",
      total_respostas: flat.length,
      media_geral: media,
      distribuicao: dist,
      por_modulo: porModulo,
      comentarios,
    };

    const system = [
      "você é analista de experiência educacional da NachesU, plataforma de eletivas pra estudantes de ensino médio (14-15 anos).",
      "escreva em português do brasil, tudo em minúsculo, frases curtas e diretas, sem emoji, sem hashtag, sem travessão, sem corporativês.",
      "diga 'estudante', nunca 'aluno'. seja concreto: cite módulo e número quando os dados apontarem.",
      "nunca invente dado que não está no json. se a amostra é pequena, diga isso.",
      "responda em markdown com exatamente estas seções:",
      "## o que está funcionando",
      "## principais atritos",
      "## módulos que pedem atenção",
      "## o que fazer agora",
      "cada seção com 2 a 4 bullets no máximo. a última seção traz ações práticas pro educador.",
    ].join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (aiRes.status === 429) return json({ error: "429 muitas chamadas, tenta em 1 minuto" }, 429);
    if (aiRes.status === 402) return json({ error: "402 créditos de IA esgotados" }, 402);
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: `falha na IA: ${aiRes.status} ${txt.slice(0, 300)}` }, 500);
    }

    const aiJson = await aiRes.json();
    const summary = aiJson?.choices?.[0]?.message?.content?.trim();
    if (!summary) return json({ error: "a IA não retornou texto" }, 500);

    const { data: inserted, error: insErr } = await admin
      .from("admin_insights")
      .insert({
        scope: "pulso",
        summary_md: summary,
        model: MODEL,
        period_start: periodStart,
        period_end: periodEnd,
        raw_metrics: { total: flat.length, media, por_modulo: porModulo },
      })
      .select("id, summary_md, generated_at, model, period_start, period_end")
      .single();

    if (insErr) return json({ error: `falha ao salvar: ${insErr.message}` }, 500);

    return json({ insight: inserted });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro desconhecido" }, 500);
  }
});
