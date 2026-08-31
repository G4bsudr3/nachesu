import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // auth obrigatório
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // gate de consentimento: o áudio do aluno (menor) é enviado a serviço de IA
    // fora do país pra transcrição. só transcreve quem já aceitou o aviso de
    // privacidade. RLS deixa o usuário ler o próprio profile.
    const { data: profileRow } = await userClient
      .from("profiles")
      .select("tutor_consent_at")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!profileRow?.tutor_consent_at) {
      // 200 com `error` pra que o front (TextareaWithVoice) mostre a mensagem
      // como toast, sem dead-end genérico. o aviso liga a política de privacidade.
      return new Response(
        JSON.stringify({
          needs_consent: true,
          error: "pra transcrever áudio por voz, aceite antes o aviso de privacidade (abra o tutor uma vez).",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // endpoint dedicado de transcrição (multipart). nome do arquivo tem que
    // bater com o container real (webm no chrome/firefox, mp4 no safari).
    const mimeType = (audioFile.type || "audio/webm").split(";")[0];
    const ext =
      ({
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/mp4": "mp4",
        "audio/m4a": "m4a",
        "audio/x-m4a": "m4a",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/flac": "flac",
      } as Record<string, string>)[mimeType] ?? "webm";

    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("file", audioFile, `recording.${ext}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 400) {
        // áudio ilegível pro modelo (gravação curta, container quebrado, mic mudo).
        // devolve 400 com orientação em vez de virar 500 genérico.
        const detail = await response.text().catch(() => "");
        console.error("ai gateway 400", detail);
        return new Response(
          JSON.stringify({
            error: "não consegui ler esse áudio. grave de novo, falando por alguns segundos perto do microfone.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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
      const errorText = await response.text().catch(() => "");
      console.error("ai gateway error", status, errorText);
      return new Response(
        JSON.stringify({ error: "erro ao transcrever áudio." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const transcript: string = (result?.text ?? "").toString().trim();

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
