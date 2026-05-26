import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `você é um transcritor de áudio em português brasileiro pra estudantes de ensino médio.
transcreva exatamente o que a pessoa falou, preservando pontuação natural (vírgula, ponto, interrogação).
não comente, não traduza, não corrija, não adicione introdução ou despedida.
retorne só o texto transcrito em minúsculas, sem aspas, sem markdown.
se o áudio estiver inaudível ou vazio, retorne string vazia.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile || audioFile.size === 0) {
      return new Response(
        JSON.stringify({ error: "nenhum áudio recebido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "áudio muito grande (máx 25mb)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    // chunked base64 pra não estourar stack em áudios grandes
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    const base64Audio = btoa(binary);

    const mimeType = audioFile.type || "audio/webm";
    const format = mimeType.includes("wav")
      ? "wav"
      : mimeType.includes("mp3")
        ? "mp3"
        : "wav"; // gemini aceita "wav" como rótulo genérico

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: { data: base64Audio, format },
              },
              {
                type: "text",
                text: "transcreva esse áudio em pt-br. retorne só o texto.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "muitas requisições. tente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "créditos da ia esgotados. avise o educador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("ai gateway error", status, errorText);
      return new Response(
        JSON.stringify({ error: "erro ao transcrever áudio." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const transcript: string =
      result?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    return new Response(
      JSON.stringify({ transcript }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("transcribe-audio error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
