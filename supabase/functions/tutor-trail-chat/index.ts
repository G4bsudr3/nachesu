// edge function: chat com o tutor IA "joão-de-barro" por trilha.
// usa lovable AI gateway, sem RAG (só system prompt curto + contexto da trilha).
// salva conversa em tutor_conversations (uma por aluno+trilha).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_MSG = 2000;
const HISTORY_LIMIT = 20;

type ChatMessage = { role: "user" | "assistant"; content: string };

const buildSystemPrompt = (ctx: {
  trailTitle: string;
  trailDescription: string | null;
  pblPrompt: string | null;
  currentModule: { number: number; title: string; objective: string | null } | null;
  completedModules: { number: number; title: string }[];
}): string => {
  const completedList = ctx.completedModules.length
    ? ctx.completedModules
        .map((m) => `- módulo ${String(m.number).padStart(2, "0")}: ${m.title}`)
        .join("\n")
    : "(ainda não fechou nenhum módulo dessa trilha)";

  const current = ctx.currentModule
    ? `módulo ${String(ctx.currentModule.number).padStart(2, "0")} — ${ctx.currentModule.title}${
        ctx.currentModule.objective ? `\nobjetivo: ${ctx.currentModule.objective}` : ""
      }`
    : "(nenhum módulo em andamento agora)";

  return `você é o joão-de-barro, tutor IA da eletiva sebrae. seu jeito é o do frattz: lowercase sempre, frases curtas, direto, sem em-dash, sem hashtags, sem corporativês. trata o aluno por "você" (nunca "tu"). emoji raro, no máximo um por resposta, e só se couber.

você tá conversando com um aluno da trilha "${ctx.trailTitle}".
${ctx.trailDescription ? `descrição da trilha: ${ctx.trailDescription}` : ""}

${
  ctx.pblPrompt
    ? `## problema central da trilha (PBL)\n\n${ctx.pblPrompt}\n\nseu papel é ajudar o aluno a destravar esse problema, não entregar resposta pronta. faz pergunta socrática, sugere caminho, valida raciocínio, oferece exemplo só quando ele já tentou.`
    : "ainda não tem um problema PBL definido pra essa trilha. ajuda o aluno com o conteúdo dos módulos e com a aplicação prática."
}

## contexto do aluno

módulos que ele já fechou nessa trilha:
${completedList}

módulo atual:
${current}

## como responder

- nunca mais que 4 parágrafos curtos.
- se ele perguntar algo fora da trilha, traz de volta com leveza ("foge um pouco do escopo aqui, mas...").
- se ele pedir "me dá a resposta", devolve uma pergunta que destrava ele.
- nunca finja que sabe coisa que não sabe sobre o curso. se faltar contexto, diz "isso aí seu professor de turma resolve melhor".
- termina ofertando próximo movimento concreto sempre que fizer sentido.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const trailId = typeof body?.trail_id === "string" ? body.trail_id : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!trailId || message.length < 2) {
      return new Response(
        JSON.stringify({ error: "trail_id e message obrigatórios (mín 2 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (message.length > MAX_MSG) {
      return new Response(
        JSON.stringify({ error: `mensagem maior que ${MAX_MSG} caracteres` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // contexto: trilha + módulos da trilha + progresso do aluno
    const [trailRes, modulesRes, progressRes, convRes] = await Promise.all([
      admin
        .from("trails")
        .select("id, title, description, pbl_prompt")
        .eq("id", trailId)
        .single(),
      admin
        .from("modules")
        .select("id, number, title, objective, trail_id, published, available_from")
        .eq("trail_id", trailId)
        .order("number"),
      admin
        .from("student_module_progress")
        .select("module_id, started_at, completed_at")
        .eq("user_id", userId),
      admin
        .from("tutor_conversations")
        .select("id, messages, title")
        .eq("user_id", userId)
        .eq("trail_id", trailId)
        .maybeSingle(),
    ]);

    if (trailRes.error || !trailRes.data) {
      return new Response(JSON.stringify({ error: "trilha não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trail = trailRes.data;
    const modules = modulesRes.data ?? [];
    const progressByModuleId = new Map<string, { completed_at: string | null; started_at: string | null }>();
    (progressRes.data ?? []).forEach((p) =>
      progressByModuleId.set(p.module_id, { completed_at: p.completed_at, started_at: p.started_at }),
    );

    const completedModules = modules
      .filter((m) => progressByModuleId.get(m.id)?.completed_at)
      .map((m) => ({ number: m.number, title: m.title }));

    // módulo atual = primeiro publicado e disponível com started mas não completed
    const now = Date.now();
    const isAvailable = (m: { published: boolean; available_from: string | null }) =>
      m.published && (!m.available_from || new Date(m.available_from).getTime() <= now);

    const currentModule =
      modules
        .filter(isAvailable)
        .find((m) => {
          const p = progressByModuleId.get(m.id);
          return p?.started_at && !p?.completed_at;
        }) ?? null;

    const systemPrompt = buildSystemPrompt({
      trailTitle: trail.title,
      trailDescription: trail.description,
      pblPrompt: trail.pbl_prompt,
      currentModule: currentModule
        ? { number: currentModule.number, title: currentModule.title, objective: currentModule.objective }
        : null,
      completedModules,
    });

    const history = (convRes.data?.messages ?? []) as ChatMessage[];
    const trimmedHistory = history.slice(-HISTORY_LIMIT);
    const existingTitle = (convRes.data as { title?: string | null } | null)?.title ?? null;

    // título curto a partir da primeira mensagem do aluno (gerado uma única vez)
    const buildTitle = (raw: string): string => {
      const clean = raw.replace(/\s+/g, " ").trim();
      if (clean.length <= 60) return clean || "conversa sem título";
      const cut = clean.slice(0, 60);
      const lastSpace = cut.lastIndexOf(" ");
      return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
    };
    const titleToPersist = existingTitle && existingTitle.trim().length > 0
      ? existingTitle
      : buildTitle(message);

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messagesForAI,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "muitas perguntas em sequência, espera uns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "créditos da ia esgotados, avisa a equipe." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiRes.text();
      console.error("ai gateway:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ia falhou" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // proxy streaming + capturar texto pra persistir no fim
    const reader = aiRes.body!.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            controller.enqueue(value);

            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nl).replace(/\r$/, "");
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) assistantText += delta;
              } catch {
                // ignora JSON parcial
              }
            }
          }
        } finally {
          if (assistantText.trim()) {
            const newMessages: ChatMessage[] = [
              ...history,
              { role: "user", content: message },
              { role: "assistant", content: assistantText },
            ];
            // mantém histórico no banco enxuto (últimas 40 trocas)
            const trimmed = newMessages.slice(-80);
            const nowIso = new Date().toISOString();
            await admin.from("tutor_conversations").upsert(
              {
                user_id: userId,
                trail_id: trailId,
                messages: trimmed,
                updated_at: nowIso,
              },
              { onConflict: "user_id,trail_id" },
            );
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tutor-trail-chat:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
