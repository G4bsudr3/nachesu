// avalia (👍/👎) o evento mais recente do tutor pra um aluno/trilha.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const trailId = typeof body?.trail_id === "string" ? body.trail_id : "";
    const helpful = body?.helpful;
    if (!trailId || (helpful !== 1 && helpful !== -1 && helpful !== null)) {
      return new Response(JSON.stringify({ error: "trail_id e helpful (1, -1 ou null) obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // evento mais recente do user nessa trilha nos últimos 30 min
    const { data: latest } = await admin
      .from("tutor_message_events")
      .select("id")
      .eq("user_id", u.user.id)
      .eq("trail_id", trailId)
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) {
      return new Response(JSON.stringify({ error: "nenhuma resposta recente pra avaliar" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("tutor_message_events").update({ helpful }).eq("id", latest.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tutor-rate-message:", e);
    return new Response(JSON.stringify({ error: "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
