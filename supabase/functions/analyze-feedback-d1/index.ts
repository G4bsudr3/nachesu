// edge function: análise IA coletiva dos feedbacks do dia 1.
// lê todos os feedbacks anonimizados, pede análise estruturada à lovable AI,
// salva em hub_insights com scope='feedback-d1'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEXT_MODEL = "google/gemini-2.5-pro";
const MAX_RETRIES = 2;
const MIN_FEEDBACKS = 3;

const SYSTEM_PROMPT = `tu é etnógrafa do chŏra lovable lendo feedbacks do dia 1 ao vivo. o frattz vai usar tua análise pra ajustar o dia 2 hoje à noite. tom: frattz, lowercase, direto, sem corporativês, sem em-dash, sem hashtag.

cada aluno respondeu (ou não) 3 perguntas:
1. como foi a experiência do dia 1
2. o que poderia ter sido diferente
3. algo que amou

tua missão: virar essa pilha de respostas em insight acionável. foco principal é a pergunta 2 (o que mudaria), porque é o que dá pra atacar agora. mas cruza com as outras 2 pra entender contexto.

regras:
- evidência crua > paráfrase. cita trechos curtos entre aspas, sempre anônimo
- agrupa o que muita gente disse de jeitos diferentes mas significa o mesmo
- nada de "a maioria gostou", insight óbvio é proibido
- ações sugeridas precisam ser concretas e factíveis hoje à noite ou amanhã de manhã, nada de "rever a estrutura completa"
- se feedback foi escasso ou vago, diz isso na temperatura, não inventa

via tool call save_feedback_analysis, devolve:

1. manchete: 1 frase forte (máx 14 palavras) que captura o estado da turma agora
2. subtitulo: 1 frase tom frattz expandindo
3. temperatura: 1 frase sobre o clima geral (quente, morno, frio, dividido, etc.)
4. ajustes_dia2: 3-6 cards do que mudar no dia 2. cada um:
   - titulo: a dor em 3-6 palavras
   - quantas_pessoas: número aproximado que tocou no tema
   - evidencias: 1-3 citações curtas anônimas
   - sugestao: ação concreta pro frattz fazer (1-2 frases)
   - prioridade: "alta" | "media" | "baixa"
5. funcionando: 2-4 cards do que tá dando certo (não desligar). cada um: titulo, evidencias (1-2), por_que_importa (1 frase)
6. tensoes: 0-3 contradições internas da turma. cada uma: titulo, descricao (1-2 frases)
7. citacoes_marcantes: 3-5 trechos curtos anônimos que vale ler em voz alta`;

const TOOL = {
  type: "function",
  function: {
    name: "save_feedback_analysis",
    description: "salva análise dos feedbacks do dia 1",
    parameters: {
      type: "object",
      properties: {
        manchete: { type: "string" },
        subtitulo: { type: "string" },
        temperatura: { type: "string" },
        ajustes_dia2: {
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
        funcionando: {
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
        tensoes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              descricao: { type: "string" },
            },
            required: ["titulo", "descricao"],
            additionalProperties: false,
          },
        },
        citacoes_marcantes: { type: "array", items: { type: "string" } },
      },
      required: [
        "manchete",
        "subtitulo",
        "temperatura",
        "ajustes_dia2",
        "funcionando",
        "tensoes",
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
      tool_choice: { type: "function", function: { name: "save_feedback_analysis" } },
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
    console.error("[analyze-feedback-d1] sem tool call:", JSON.stringify(json).slice(0, 400));
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
      console.warn(`[analyze-feedback-d1] retry ${attempt + 1}:`, e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

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

    // carrega feedbacks
    const { data: feedbacks, error: fbErr } = await admin
      .from("hub_event_feedback")
      .select("experiencia, poderia_ser_diferente, algo_que_amou, created_at")
      .eq("event_day", "dia-1")
      .order("created_at", { ascending: true });

    if (fbErr) throw fbErr;

    if (!feedbacks || feedbacks.length < MIN_FEEDBACKS) {
      return new Response(
        JSON.stringify({
          error: `precisa de no mínimo ${MIN_FEEDBACKS} feedbacks pra rodar análise. tem ${feedbacks?.length ?? 0}.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // monta prompt anonimizado
    const lines = feedbacks.map((f, i) => {
      const parts: string[] = [];
      if (f.experiencia) parts.push(`  experiência: "${f.experiencia.replace(/"/g, "'")}"`);
      if (f.poderia_ser_diferente) parts.push(`  poderia ser diferente: "${f.poderia_ser_diferente.replace(/"/g, "'")}"`);
      if (f.algo_que_amou) parts.push(`  amou: "${f.algo_que_amou.replace(/"/g, "'")}"`);
      return `feedback ${i + 1}:\n${parts.join("\n") || "  (vazio)"}`;
    });

    const userPrompt = `total de ${feedbacks.length} feedbacks recebidos do dia 1.\n\n${lines.join("\n\n")}\n\ngera a análise via tool call.`;

    console.log(`[analyze-feedback-d1] ${feedbacks.length} feedbacks, indo pra ia...`);

    const result = await callAI(LOVABLE_API_KEY, userPrompt);

    // salva em hub_insights (upsert manual via select+update/insert)
    const { data: existing } = await admin
      .from("hub_insights")
      .select("id")
      .eq("scope", "feedback-d1")
      .is("user_id", null)
      .maybeSingle();

    const payload = {
      scope: "feedback-d1",
      user_id: null,
      aggregates: { ...result, sample_size: feedbacks.length },
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
      JSON.stringify({ ok: true, sample_size: feedbacks.length, analysis: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[analyze-feedback-d1] erro:", e);
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    const status = (e as any)?.status === 429 ? 429 : (e as any)?.status === 402 ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
