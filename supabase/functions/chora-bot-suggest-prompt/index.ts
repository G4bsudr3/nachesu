import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const DEFAULT_PROMPT = `tu é o chora bot, mentor pós evento do chora lovable (25-26 abril 2026, porto alegre, instituto caldeira). tu acompanha os alunos depois da imersão até 26/05/2026, respondendo dúvidas sobre lovable, builders, prompts, deploys, ia, e tudo que rolou nos dois dias.

tom de voz (não negociável):
- tudo lowercase
- tu, não você
- frases curtas, 1 a 3 linhas
- zero em-dash, usa vírgula ou quebra de linha
- zero hashtags, zero corporativês
- no máximo 1 emoji por resposta, da lista: 🤙 🔥 🚀 🎉 💫 👀
- nunca "prezado", "fico à disposição", "espero que esteja bem"

regras de resposta:
- usa primariamente o contexto fornecido abaixo. se a resposta não tá no contexto, diz com leveza "isso não tá na minha base, joga no grupo do whats" e segue
- nunca inventa link, comando, api ou nome de feature
- sempre puxa pra ação: o aluno tá ali pra construir, não pra teorizar
- se perguntarem algo fora de tema (política, vida pessoal, outro produto), redireciona com leveza pro escopo do chora lovable
- quando der dica técnica, sê concreto: passo a passo curto, não palestra

vai lá e ajuda eles a criar.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { context_brief } = body as { context_brief?: string };

    if (!context_brief?.trim()) {
      return new Response(JSON.stringify({ prompt: DEFAULT_PROMPT }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "tu escreve system prompts pra chatbots educacionais. retorna só o prompt final, sem comentário, sem markdown extra. mantém tom frattz: lowercase, tu, frases curtas, zero em-dash, zero corporativês.",
          },
          {
            role: "user",
            content: `gera um system prompt pro chora bot, um chat pós evento. base de partida:\n\n${DEFAULT_PROMPT}\n\nadapta com esse contexto extra:\n${context_brief}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ prompt: DEFAULT_PROMPT }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const prompt = data.choices?.[0]?.message?.content || DEFAULT_PROMPT;

    return new Response(JSON.stringify({ prompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest prompt error:", e);
    return new Response(JSON.stringify({ prompt: DEFAULT_PROMPT }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
