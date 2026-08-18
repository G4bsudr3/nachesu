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
        "rating, comment, created_at, modules!inner(number, title, trails!inner(title, courses!inner(title, slug)))",
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

    // duas perguntas diferentes convivem na mesma tabela. jamais somar as duas.
    const RITMO_COURSES = new Set(["ia-na-pratica"]);
    const RITMO_LABELS: Record<number, string> = {
      1: "tranquilo demais",
      2: "no ponto",
      3: "pesado demais",
    };

    const flat = ratings.map((r) => {
      const slug = r.modules?.trails?.courses?.slug ?? "";
      const escala = RITMO_COURSES.has(slug) ? "ritmo_1a3" : "satisfacao_1a5";
      return {
        escala,
        valor: r.rating,
        resposta:
          escala === "ritmo_1a3"
            ? (RITMO_LABELS[r.rating] ?? String(r.rating))
            : `${r.rating} de 5 estrelas`,
        comentario: (r.comment ?? "").trim(),
        eletiva: r.modules?.trails?.courses?.title ?? "",
        trilha: r.modules?.trails?.title ?? "",
        modulo: r.modules?.number ?? 0,
        modulo_titulo: r.modules?.title ?? "",
      };
    });

    const ritmo = flat.filter((f) => f.escala === "ritmo_1a3");
    const sat = flat.filter((f) => f.escala === "satisfacao_1a5");

    const ritmoResumo = ritmo.length
      ? {
          total: ritmo.length,
          tranquilo_demais: ritmo.filter((f) => f.valor === 1).length,
          no_ponto: ritmo.filter((f) => f.valor === 2).length,
          pesado_demais: ritmo.filter((f) => f.valor === 3).length,
          percentual_no_ponto: Math.round(
            (ritmo.filter((f) => f.valor === 2).length / ritmo.length) * 100,
          ),
        }
      : null;

    const satResumo = sat.length
      ? {
          total: sat.length,
          media: Number((sat.reduce((a, b) => a + b.valor, 0) / sat.length).toFixed(2)),
          distribuicao: [1, 2, 3, 4, 5].map((n) => ({
            estrelas: n,
            qtd: sat.filter((f) => f.valor === n).length,
          })),
        }
      : null;

    const agrupaPorModulo = (list: typeof flat) =>
      Object.values(
        list.reduce(
          (acc: Record<string, { chave: string; valores: number[] }>, f) => {
            const chave = `${f.eletiva} · módulo ${f.modulo} ${f.modulo_titulo}`;
            acc[chave] = acc[chave] ?? { chave, valores: [] };
            acc[chave].valores.push(f.valor);
            return acc;
          },
          {},
        ),
      );

    const porModuloRitmo = agrupaPorModulo(ritmo).map((m) => ({
      modulo: m.chave,
      respostas: m.valores.length,
      tranquilo_demais: m.valores.filter((v) => v === 1).length,
      no_ponto: m.valores.filter((v) => v === 2).length,
      pesado_demais: m.valores.filter((v) => v === 3).length,
    }));

    const porModuloSat = agrupaPorModulo(sat).map((m) => ({
      modulo: m.chave,
      respostas: m.valores.length,
      media: Number((m.valores.reduce((a, b) => a + b, 0) / m.valores.length).toFixed(2)),
    }));

    const comentarios = flat
      .filter((f) => f.comentario.length > 0)
      .slice(0, MAX_COMMENTS)
      .map((f) => `[${f.resposta} · ${f.eletiva} · mód ${f.modulo}] ${f.comentario}`);

    const payload = {
      periodo: days ? `últimos ${days} dias` : "histórico completo",
      total_respostas: flat.length,
      escalas: {
        ritmo_1a3:
          "pergunta de ritmo do módulo, 3 opções: 1 tranquilo demais, 2 no ponto, 3 pesado demais. não é nota de qualidade. o alvo é 2. 1 significa fácil demais, 3 significa difícil demais.",
        satisfacao_1a5: "avaliação de satisfação de 1 a 5 estrelas, quanto maior melhor.",
      },
      ritmo: ritmoResumo,
      ritmo_por_modulo: porModuloRitmo,
      satisfacao: satResumo,
      satisfacao_por_modulo: porModuloSat,
      comentarios,
    };

    const system = [
      "você é analista de experiência educacional da NachesU, plataforma de eletivas pra estudantes de ensino médio (14-15 anos).",
      "escreva em português do brasil, tudo em minúsculo, frases curtas e diretas, sem emoji, sem hashtag, sem travessão, sem corporativês.",
      "diga 'estudante', nunca 'aluno'. seja concreto: cite módulo e número quando os dados apontarem.",
      "existem duas perguntas diferentes no json e elas nunca podem ser somadas nem comparadas entre si.",
      "a pergunta de ritmo (1 a 3) mede calibragem, não satisfação: 1 é fácil demais, 2 é no ponto, 3 é pesado demais. jamais trate ritmo 1 como nota ruim nem fale em 'nota 4 ou 5' pra ritmo.",
      "a pergunta de satisfação só existe quando o campo satisfacao vem preenchido. se vier nulo, diga que ainda não há avaliação de estrelas no período.",
      "não tire conclusão de módulo com menos de 3 respostas: cite como sinal fraco.",
      "nunca invente dado que não está no json. se a amostra é pequena, diga isso logo no começo.",
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
        raw_metrics: {
          total: flat.length,
          ritmo: ritmoResumo,
          satisfacao: satResumo,
          ritmo_por_modulo: porModuloRitmo,
          satisfacao_por_modulo: porModuloSat,
        },

      })
      .select("id, summary_md, generated_at, model, period_start, period_end")
      .single();

    if (insErr) return json({ error: `falha ao salvar: ${insErr.message}` }, 500);

    return json({ insight: inserted });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro desconhecido" }, 500);
  }
});
