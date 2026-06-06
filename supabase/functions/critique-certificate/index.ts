// edge function de QA visual: recebe um PNG (data url ou base64) do certificado
// e pede ao gemini 2.5 pro uma crítica de senior art director.
// uso: dev-only, chamada do /admin/preview/feedback-final.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `você é um senior art director e diretor de design gráfico, especialista em identidade editorial brasileira (perestroika, naves, ps.2, conrad), tipografia (kris sowersby, jonathan hoefler), e design de certificados/diplomas premium.

vai receber a imagem de um certificado oficial chŏra lovable.

contexto da identidade:
- paleta perestroika: bege #f2e4d8 (fundo), preto #090909, gradient laranja→vermelho→rosa→azul
- fontes: league gothic (display/títulos) + urbanist (corpo/labels)
- mood: editorial brasileiro + y2k + bauhaus, NÃO saas genérico
- tem uma carta de tarot embutida com arquétipo do aluno (visionário, artesão, etc.)

avalie criticamente em 6 eixos (nota 0-10):
1. hierarquia tipográfica (peso visual entre título, nome, corpo, labels)
2. ritmo e espaçamento (respiro, breathing room, alinhamentos)
3. balanço composicional (carta vs bloco textual, simetria/assimetria intencional)
4. cor e contraste (uso da paleta, legibilidade, harmonia do gradient)
5. craftsmanship tipográfico (tracking, leading, kerning, microtipografia)
6. coerência com identidade perestroika (não-saas, brasileiro, editorial)

seja brutal e específico. aponte:
- problemas concretos com localização ("o nome do aluno parece pequeno demais comparado ao CHŎRA LOVABLE")
- fixes acionáveis em pixels/percentuais
- elementos que funcionam bem
- prioridade (high/medium/low)

responda APENAS com a tool call critique_certificate. nada de markdown extra.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "critique_certificate",
    description: "crítica estruturada do certificado",
    parameters: {
      type: "object",
      properties: {
        overall_score: {
          type: "number",
          description: "nota geral 0-10",
        },
        scores: {
          type: "object",
          properties: {
            hierarquia_tipografica: { type: "number" },
            ritmo_espaco: { type: "number" },
            balanco_composicional: { type: "number" },
            cor_contraste: { type: "number" },
            craftsmanship: { type: "number" },
            coerencia_identidade: { type: "number" },
          },
          required: [
            "hierarquia_tipografica",
            "ritmo_espaco",
            "balanco_composicional",
            "cor_contraste",
            "craftsmanship",
            "coerencia_identidade",
          ],
          additionalProperties: false,
        },
        what_works: {
          type: "array",
          description: "3-5 coisas que estão excelentes",
          items: { type: "string" },
        },
        issues: {
          type: "array",
          description: "problemas concretos encontrados",
          items: {
            type: "object",
            properties: {
              priority: { type: "string", enum: ["high", "medium", "low"] },
              area: { type: "string", description: "ex: 'nome do aluno', 'rodapé', 'logo'" },
              problem: { type: "string" },
              fix: { type: "string", description: "fix acionável" },
            },
            required: ["priority", "area", "problem", "fix"],
            additionalProperties: false,
          },
        },
        verdict: {
          type: "string",
          description: "1-2 frases de veredicto final",
        },
      },
      required: ["overall_score", "scores", "what_works", "issues", "verdict"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // auth: admin-only (ferramenta dev/admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageDataUrl (data url do png) é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "critique esse certificado com rigor. retorne via tool call.",
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "critique_certificate" } },
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("[critique-certificate] gateway error:", response.status, txt);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate limit. tenta de novo em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "créditos esgotados. adiciona em settings > workspace > usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "erro no gateway", details: txt }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "resposta sem tool call", raw: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const critique = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ critique }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[critique-certificate]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
