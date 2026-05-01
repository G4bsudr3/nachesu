// edge function: análise IA coletiva da pesquisa final.
// cruza notas quanti (imersão, profs, melhoria, nps) com texto livre e devolve
// retrospectiva acionável pra próxima edição. salva em hub_insights scope='feedback-final'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEXT_MODEL = "google/gemini-2.5-pro";
const MAX_RETRIES = 2;
const MIN_RESPOSTAS = 3;

const SYSTEM_PROMPT = `tu é etnógrafa do chŏra lovable lendo a pesquisa final, depois que a imersão acabou. o frattz e a perestroika vão usar tua análise pra: 1) decidir o que manter e mudar na próxima edição, 2) extrair depoimento de marketing, 3) entender tensões. tom: frattz, lowercase, direto, sem corporativês, sem em-dash, sem hashtag, sem emoji.

cada aluno respondeu (ou não):
- 4 notas: nota_imersao (0-10), nota_profs (0-10), melhoria_entregas (1-5), nps_recomendacao (0-10)
- 5 textos: geral, mais_gostou, menos_gostou, conteudo_faltou, coracao_aberto

a edge function já te passa: notas agregadas (média + nps detalhado promotores/passivos/detratores) e cada resposta marcada com seu nps (sem nome).

regras:
- evidência crua > paráfrase. cita trechos curtos entre aspas, sempre anônimo
- agrupa o que muita gente disse de jeitos diferentes mas significa o mesmo
- nada de "a maioria gostou", insight óbvio é proibido
- cruza quanti com quali. se nps caiu por causa de um tema específico, nomeia
- sugestões precisam ser concretas pra próxima edição (não genéricas tipo "melhorar comunicação")
- promotores_say e detratores_say cita LITERAL os trechos das pessoas pelo seu nps
- nunca invente nome, nunca cite ninguém pelo apelido

via tool call save_feedback_final_analysis, devolve:

1. manchete: 1 frase forte (máx 14 palavras) que captura a sensação coletiva da imersão
2. subtitulo: 1 frase tom frattz expandindo
3. temperatura: 1 frase do clima (ex: "rasgaram o coração", "amor com ressalvas", "queriam mais")
4. leitura_quanti: 1-2 frases interpretando os números agregados (médias + nps)
5. pontos_fortes: 3-5 cards do que funcionou e deve manter. cada um:
   - titulo: 3-6 palavras
   - evidencias: 1-3 citações curtas anônimas
   - por_que_importa: 1 frase
6. a_repensar: 3-6 cards do que mudar pra próxima edição. cada um:
   - titulo: 3-6 palavras
   - quantas_pessoas: número aproximado que tocou no tema
   - evidencias: 1-3 citações curtas
   - sugestao: ação concreta pra próxima edição (1-2 frases)
   - prioridade: "alta" | "media" | "baixa"
7. conteudos_faltantes: 0-4 demandas explícitas de conteúdo que faltou. cada um:
   - tema: 3-6 palavras
   - evidencias: 1-2 citações
   - sugestao: ideia concreta de como cobrir (1 frase)
8. promotores_say: 2-4 frases reais de promotores (nps 9-10) que servem como depoimento de marketing
9. detratores_say: 0-3 frases de detratores (nps ≤ 6) com diagnóstico curto (1 frase) do que feriu cada um
10. citacoes_marcantes: 3-5 trechos anônimos pra ler em voz alta no fechamento`;

const TOOL = {
  type: "function",
  function: {
    name: "save_feedback_final_analysis",
    description: "salva análise da pesquisa final do chŏra lovable",
    parameters: {
      type: "object",
      properties: {
        manchete: { type: "string" },
        subtitulo: { type: "string" },
        temperatura: { type: "string" },
        leitura_quanti: { type: "string" },
        pontos_fortes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              evidencias: { type: "array", items: { type: "string" } },
              por_que_importa: { type: "string" },
            },
            required: ["titulo", "evidencias", "por_que_importa"],
            additionalProperties: false,
          },
        },
        a_repensar: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              quantas_pessoas: { type: "integer" },
              evidencias: { type: "array", items: { type: "string" } },
              sugestao: { type: "string" },
              prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
            },
            required: ["titulo", "quantas_pessoas", "evidencias", "sugestao", "prioridade"],
            additionalProperties: false,
          },
        },
        conteudos_faltantes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tema: { type: "string" },
              evidencias: { type: "array", items: { type: "string" } },
              sugestao: { type: "string" },
            },
            required: ["tema", "evidencias", "sugestao"],
            additionalProperties: false,
          },
        },
        promotores_say: { type: "array", items: { type: "string" } },
        detratores_say: {
          type: "array",
          items: {
            type: "object",
            properties: {
              citacao: { type: "string" },
              diagnostico: { type: "string" },
            },
            required: ["citacao", "diagnostico"],
            additionalProperties: false,
          },
        },
        citacoes_marcantes: { type: "array", items: { type: "string" } },
      },
      required: [
        "manchete",
        "subtitulo",
        "temperatura",
        "leitura_quanti",
        "pontos_fortes",
        "a_repensar",
        "conteudos_faltantes",
        "promotores_say",
        "detratores_say",
        "citacoes_marcantes",
      ],
      additionalProperties: false,
    },
  },
};

async function callAIOnce(apiKey: string, userPrompt: string): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "save_feedback_final_analysis" } },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`ai gateway ${res.status}: ${txt.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.error("[analyze-feedback-final] sem tool call:", JSON.stringify(json).slice(0, 400));
    throw new Error("ia não retornou tool call");
  }
  return JSON.parse(args);
}

async function callAI(apiKey: string, userPrompt: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callAIOnce(apiKey, userPrompt);
    } catch (e) {
      lastErr = e;
      const status = (e as any)?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
      const wait = (attempt + 1) * 2500;
      console.warn(`[analyze-feedback-final] retry ${attempt + 1}:`, e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

const avg = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // valida admin
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // carrega respostas finais
    const { data: respostas, error: rErr } = await admin
      .from("hub_event_feedback_final")
      .select(
        "nota_imersao, nota_profs, melhoria_entregas, nps_recomendacao, geral, mais_gostou, menos_gostou, conteudo_faltou, coracao_aberto, created_at",
      )
      .order("created_at", { ascending: true });

    if (rErr) throw rErr;

    if (!respostas || respostas.length < MIN_RESPOSTAS) {
      return new Response(
        JSON.stringify({
          error: `precisa de no mínimo ${MIN_RESPOSTAS} respostas pra rodar análise. tem ${respostas?.length ?? 0}.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // agregados quanti
    const npsArr = respostas.map((r) => r.nps_recomendacao);
    const promoters = npsArr.filter((n) => n >= 9).length;
    const passives = npsArr.filter((n) => n >= 7 && n <= 8).length;
    const detractors = npsArr.filter((n) => n <= 6).length;
    const npsScore = Math.round(((promoters - detractors) / npsArr.length) * 100);

    const quanti = {
      n: respostas.length,
      media_imersao: avg(respostas.map((r) => r.nota_imersao)),
      media_profs: avg(respostas.map((r) => r.nota_profs)),
      media_melhoria_entregas: avg(respostas.map((r) => r.melhoria_entregas)),
      nps_score: npsScore,
      nps_promotores: promoters,
      nps_passivos: passives,
      nps_detratores: detractors,
    };

    // monta prompt anonimizado, marcando cada resposta com nps
    const lines = respostas.map((r, i) => {
      const parts: string[] = [`feedback ${i + 1} [nps=${r.nps_recomendacao}, imersao=${r.nota_imersao}/10, profs=${r.nota_profs}/10, melhoria=${r.melhoria_entregas}/5]:`];
      const clean = (s: string | null) => (s ? s.replace(/"/g, "'").trim() : "");
      if (r.geral) parts.push(`  geral: "${clean(r.geral)}"`);
      if (r.mais_gostou) parts.push(`  mais gostou: "${clean(r.mais_gostou)}"`);
      if (r.menos_gostou) parts.push(`  menos gostou: "${clean(r.menos_gostou)}"`);
      if (r.conteudo_faltou) parts.push(`  conteúdo faltou: "${clean(r.conteudo_faltou)}"`);
      if (r.coracao_aberto) parts.push(`  coração aberto: "${clean(r.coracao_aberto)}"`);
      return parts.join("\n");
    });

    const userPrompt = `agregados quanti:
- total respostas: ${quanti.n}
- média nota imersão: ${quanti.media_imersao}/10
- média nota profs: ${quanti.media_profs}/10
- média melhoria entregas: ${quanti.media_melhoria_entregas}/5
- nps: ${quanti.nps_score} (promotores: ${quanti.nps_promotores}, passivos: ${quanti.nps_passivos}, detratores: ${quanti.nps_detratores})

respostas individuais (anonimizadas, marcadas com nps):

${lines.join("\n\n")}

gera a análise via tool call.`;

    console.log(`[analyze-feedback-final] ${respostas.length} respostas, nps=${npsScore}, indo pra ia...`);

    const result = await callAI(LOVABLE_API_KEY, userPrompt);

    // upsert em hub_insights
    const { data: existing } = await admin
      .from("hub_insights")
      .select("id")
      .eq("scope", "feedback-final")
      .is("user_id", null)
      .maybeSingle();

    const payload = {
      scope: "feedback-final",
      user_id: null,
      aggregates: { ...result, sample_size: respostas.length, quanti },
      generated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await admin.from("hub_insights").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("hub_insights").insert(payload);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, sample_size: respostas.length, analysis: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[analyze-feedback-final] erro:", e);
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    const status = (e as any)?.status === 429 ? 429 : (e as any)?.status === 402 ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
