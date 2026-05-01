import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// preço aproximado gemini 2.5 flash (USD por 1M tokens)
const PRICE_IN = 0.3 / 1_000_000;
const PRICE_OUT = 2.5 / 1_000_000;

// instruções de tom — devem espelhar src/features/hub/choraBotTones.ts
const TONE_INSTRUCTIONS: Record<string, string> = {
  padrao: "",
  tecnico:
    "ajusta o tom: seja preciso e técnico. pode usar jargão de dev, snippets de código quando ajudar e referências a docs. evita rodeios, foca na solução.",
  acolhedor:
    "ajusta o tom: seja acolhedor e empático. encoraja a pessoa, evita jargão pesado, explica como se tivesse paciência. valide a dúvida antes de responder.",
  criativo:
    "ajusta o tom: seja criativo. usa analogias, exemplos do mundo real e ideias adjacentes. mantém a precisão da informação, mas embala de um jeito que abre cabeça.",
};

const isValidTone = (t: unknown): t is keyof typeof TONE_INSTRUCTIONS =>
  typeof t === "string" && t in TONE_INSTRUCTIONS;

function normalizeEmbeddingModel(model: string | null | undefined): string {
  const cleanModel = (model || "gemini-embedding-001").replace(/^google\//, "").replace(/^models\//, "");
  if (cleanModel === "text-embedding-004" || cleanModel === "embedding-001") {
    return "gemini-embedding-001";
  }
  return cleanModel;
}

async function embed(text: string, model: string, taskType = "RETRIEVAL_QUERY"): Promise<number[]> {
  const cleanModel = normalizeEmbeddingModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`embed ${res.status}: ${t}`);
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`embedding inválido: ${values?.length ?? 0} dimensões`);
  }
  return values;
}

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

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: settings } = await admin
      .from("chora_bot_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (!settings) throw new Error("configuração não encontrada");

    if (!settings.enabled) {
      return new Response(
        JSON.stringify({ ended: true, message: "o chora bot tá pausado agora." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (new Date(settings.cutoff_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({
          ended: true,
          message: "o chora bot encerrou em 26/05/2026. mas tudo do evento continua aqui no hub.",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { conversation_id, message, tone } = body as {
      conversation_id: string;
      message: string;
      tone?: string;
    };
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!conversation_id || trimmedMessage.length === 0) {
      return new Response(JSON.stringify({ error: "conversation_id e message obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (trimmedMessage.length < 2) {
      return new Response(JSON.stringify({ error: "mensagem curta demais" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (trimmedMessage.length > 2000) {
      return new Response(JSON.stringify({ error: "mensagem excede 2000 caracteres" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeTone = isValidTone(tone) ? tone : "padrao";
    const toneInstruction = TONE_INSTRUCTIONS[safeTone];

    // valida ownership da conversa
    const { data: conv } = await admin
      .from("chora_bot_conversations")
      .select("id, user_id, title")
      .eq("id", conversation_id)
      .single();
    if (!conv || conv.user_id !== userId) {
      return new Response(JSON.stringify({ error: "conversa não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // histórico (últimas 10 mensagens)
    const { data: history } = await admin
      .from("chora_bot_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // RAG
    let contextBlock = "";
    let chunkIds: string[] = [];
    try {
      const queryEmbedding = await embed(message, settings.embedding_model);
      const { data: matches } = await admin.rpc("match_chora_bot_chunks", {
        query_embedding: `[${queryEmbedding.join(",")}]` as unknown as string,
        match_count: settings.match_count ?? 4,
        similarity_threshold: settings.similarity_threshold ?? 0.5,
      });
      if (matches && matches.length > 0) {
        chunkIds = matches.map((m: { id: string }) => m.id);
        contextBlock = matches
          .map(
            (m: { document_title: string; content: string }, i: number) =>
              `[fonte ${i + 1}: ${m.document_title}]\n${m.content}`,
          )
          .join("\n\n---\n\n");
      }
    } catch (e) {
      console.error("rag falhou, segue sem contexto:", e);
    }

    const systemPrompt = `${settings.system_prompt}${
      toneInstruction ? `\n\n## ajuste de tom solicitado pelo usuário\n\n${toneInstruction}` : ""
    }\n\n## contexto da base de conhecimento\n\n${
      contextBlock || "(nenhum trecho relevante encontrado pra essa pergunta)"
    }`;

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...(history?.filter((m) => m.role === "user" || m.role === "assistant") ?? []),
      { role: "user", content: message },
    ];

    // salva user msg antes (cutoff trigger valida)
    const { error: insertUserErr } = await admin.from("chora_bot_messages").insert({
      conversation_id,
      user_id: userId,
      role: "user",
      content: message,
    });
    if (insertUserErr) throw insertUserErr;

    // chamada streaming
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
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
          JSON.stringify({ error: "créditos da ia esgotados, avisa o frattz." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiRes.text();
      console.error("ai error:", aiRes.status, t);
      throw new Error("ia falhou");
    }

    // proxia streaming e captura conteúdo pra salvar no final
    const reader = aiRes.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

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
                // ignora
              }
            }
          }
        } finally {
          // estimativa de tokens
          const tokensIn = Math.ceil(
            messagesForAI.reduce((s, m) => s + (m.content?.length || 0), 0) / 4,
          );
          const tokensOut = Math.ceil(assistantText.length / 4);
          const cost = tokensIn * PRICE_IN + tokensOut * PRICE_OUT;

          if (assistantText.trim()) {
            await admin.from("chora_bot_messages").insert({
              conversation_id,
              user_id: userId,
              role: "assistant",
              content: assistantText,
              tokens_in: tokensIn,
              tokens_out: tokensOut,
              cost_usd_estimate: cost,
              context_chunk_ids: chunkIds.length > 0 ? chunkIds : null,
            });

            // atualiza title se for primeira interação
            if (!history || history.length === 0) {
              const newTitle = message.slice(0, 60);
              await admin
                .from("chora_bot_conversations")
                .update({ title: newTitle, updated_at: new Date().toISOString() })
                .eq("id", conversation_id);
            } else {
              await admin
                .from("chora_bot_conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversation_id);
            }
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
