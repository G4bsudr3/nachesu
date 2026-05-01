// edge function: restaura uma versão antiga do artwork de um arquétipo.
// admin escolhe uma version_id do histórico — copiamos a image_url + prompt
// de volta pra archetype_artworks (linha única do arquétipo) e propagamos
// pras builder_cards desse arquétipo. marca também is_current no histórico.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "só admin pode restaurar artworks" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const versionId = body?.version_id as string | undefined;
    if (!versionId || typeof versionId !== "string") {
      return new Response(JSON.stringify({ error: "version_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: version, error: vErr } = await admin
      .from("archetype_artwork_versions")
      .select("id, archetype, image_url, prompt_used, model")
      .eq("id", versionId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!version) {
      return new Response(JSON.stringify({ error: "versão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // restaura no archetype_artworks (linha única por arquétipo)
    const { data: artwork, error: upsertErr } = await admin
      .from("archetype_artworks")
      .upsert(
        {
          archetype: version.archetype,
          image_url: version.image_url,
          prompt_used: version.prompt_used,
          model: version.model,
          generated_at: now,
        },
        { onConflict: "archetype" },
      )
      .select()
      .single();
    if (upsertErr) throw upsertErr;

    // marca essa versão como atual e desmarca as outras
    await admin
      .from("archetype_artwork_versions")
      .update({ is_current: false })
      .eq("archetype", version.archetype)
      .eq("is_current", true);

    await admin
      .from("archetype_artwork_versions")
      .update({ is_current: true })
      .eq("id", version.id);

    // propaga pras builder_cards
    await admin
      .from("builder_cards")
      .update({ image_url: version.image_url, image_generated_at: now })
      .eq("archetype", version.archetype);

    return new Response(JSON.stringify({ artwork }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[restore-archetype-artwork] fatal:", e);
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
