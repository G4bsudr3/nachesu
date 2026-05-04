import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ valid: false, error: "email obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: invited, error } = await admin
      .from("invited_participants")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("[validate-public-email] db error:", error);
      return new Response(JSON.stringify({ valid: false, error: "erro interno" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // check if already submitted (precisa antes do early return pra calcular can_enter)
    const { data: existing } = await admin
      .from("fbi_responses")
      .select("submitted, email, user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const fbiSubmitted = existing?.submitted === true;

    // checa se já existe conta auth via RPC (lookup direto por email, sem paginação)
    let accountExists = false;
    let accountHasPassword = false;
    try {
      const { data: lookup, error: lookupErr } = await admin.rpc("lookup_user_by_email", {
        _email: normalizedEmail,
      });
      if (lookupErr) {
        console.warn("[validate-public-email] lookup rpc error:", lookupErr);
      } else if (Array.isArray(lookup) && lookup.length > 0) {
        accountExists = true;
        accountHasPassword = !!lookup[0].has_password;
      }
    } catch (e) {
      console.warn("[validate-public-email] lookup failed:", e);
    }

    if (!invited) {
      // acesso aberto: qualquer email pode entrar (cria conta via magic link se não existir)
      return new Response(
        JSON.stringify({
          valid: false,
          prefill: null,
          can_enter: true,
          already_submitted: fbiSubmitted,
          has_user: !!existing?.user_id || accountExists,
          account_exists: accountExists,
          account_has_password: accountHasPassword,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const prefill: Record<string, unknown> = {};
    const set = (k: string, v: unknown) => {
      if (v !== null && v !== undefined && String(v).trim() !== "") prefill[k] = v;
    };

    set("nome", invited.name);
    set("nickname", invited.nickname);
    set("whatsapp", invited.whatsapp);
    set("instagram", invited.instagram);
    set("trabalho", invited.trabalho);
    set("cidade", invited.cidade);
    if (invited.ja_fez_perestroika) {
      const v = invited.ja_fez_perestroika.trim().toLowerCase();
      if (v === "sim" || v === "nao" || v === "não") {
        set("ja_fez_perestroika", v === "não" ? "nao" : v);
      }
    }
    set("quais_cursos_perestroika", invited.quais_cursos_perestroika);
    set("expectativa_chora", invited.ctx_expectativa);
    set("maior_desafio", invited.ctx_maior_trava);
    if (
      invited.ctx_experiencia_lovable &&
      ["nunca-usei", "ja-mexi", "ja-publiquei", "uso-diario"].includes(invited.ctx_experiencia_lovable)
    ) {
      set("experiencia_lovable", invited.ctx_experiencia_lovable);
    }

    return new Response(
      JSON.stringify({
        valid: true,
        prefill,
        invited_participant_id: invited.id,
        already_submitted: fbiSubmitted,
        has_user: !!existing?.user_id || accountExists,
        account_exists: accountExists,
        account_has_password: accountHasPassword,
        // invited sempre pode entrar; fbi submitted também
        can_enter: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[validate-public-email] fatal:", e);
    return new Response(JSON.stringify({ valid: false, error: "erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
