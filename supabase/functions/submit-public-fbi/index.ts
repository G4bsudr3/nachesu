import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, clientIp, tooManyRequests } from "../_shared/rate-limit.ts";

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const email = (body?.email as string)?.trim().toLowerCase();
    const data = body?.data as Record<string, unknown> | undefined;
    const invited_participant_id = body?.invited_participant_id as string | undefined;
    const doSubmit = body?.submit === true;

    if (!email) {
      return new Response(JSON.stringify({ error: "email obrigatório" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // rate limit por email+IP (fail-open). Limite alto o suficiente para o
    // autosave (debounce 1200ms → ~50/min quando digitando); 90/min mantém a
    // UX intacta e ainda corta escrita/sobrescrita abusiva em massa (SEC-07).
    if (!(await checkRateLimit(admin, `spf:${email}:${clientIp(req)}`, 90, 60))) {
      return tooManyRequests(cors);
    }

    // verify email is invited
    const { data: invited } = await admin
      .from("invited_participants")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!invited) {
      return new Response(JSON.stringify({ error: "email não está na lista de convidados" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // sanitize: only allow known fbi fields
    const ALLOWED_FIELDS = [
      "nome", "nickname", "whatsapp", "idade", "instagram", "linkedin",
      "trabalho", "cidade", "ja_fez_perestroika", "quais_cursos_perestroika",
      "restricao_alimentar", "locomocao", "expectativa_chora", "maior_desafio",
      "experiencia_lovable", "ultima_criacao_orgulho", "ideia_gaveta",
      "perde_nocao_tempo", "algo_mais",
    ];

    const clean: Record<string, unknown> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (ALLOWED_FIELDS.includes(k)) clean[k] = v;
      }
    }

    const payload: Record<string, unknown> = {
      email,
      invited_participant_id: invited_participant_id ?? invited.id,
      ...clean,
    };

    if (doSubmit) {
      payload.submitted = true;
      payload.submitted_at = new Date().toISOString();
    }

    // upsert by email
    const { data: saved, error: saveErr } = await admin
      .from("fbi_responses")
      .upsert([payload], { onConflict: "email" })
      .select()
      .single();

    if (saveErr) {
      console.error("[submit-public-fbi] save error:", saveErr);
      return new Response(JSON.stringify({ error: "erro ao salvar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // dispara geração da carta builder no submit final.
    // usa EdgeRuntime.waitUntil pra não morrer quando a response retornar.
    if (doSubmit) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const generateTask = fetch(`${SUPABASE_URL}/functions/v1/generate-builder-card`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invited_participant_id: invited.id }),
      })
        .then(async (r) => {
          const body = await r.text().catch(() => "");
          console.log("[submit-public-fbi] generate-card status:", r.status, body.slice(0, 300));
        })
        .catch((err) => console.error("[submit-public-fbi] generate-card invoke failed:", err));

      // @ts-ignore EdgeRuntime is provided by supabase deno runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(generateTask);
      }
    }

    return new Response(JSON.stringify({ ok: true, submitted: doSubmit, id: saved?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[submit-public-fbi] fatal:", e);
    return new Response(JSON.stringify({ error: "erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
