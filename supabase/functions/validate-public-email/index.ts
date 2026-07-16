import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, clientIp, tooManyRequests } from "../_shared/rate-limit.ts";
import { fail } from "../_shared/errors.ts";

const FN = "validate-public-email";

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ valid: false, error: "email obrigatório" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // rate limit por IP (fail-open) — trava enumeração/coleta em massa de PII
    if (!(await checkRateLimit(admin, `vpe:${clientIp(req)}`, 30, 60))) {
      return tooManyRequests(cors);
    }

    const { data: invited, error } = await admin
      .from("invited_participants")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return fail(cors, {
        status: 500,
        code: "db_lookup_failed",
        message: "não consegui validar o email agora, tenta de novo em instantes",
        cause: error,
        fn: FN,
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
    // NOTA (SEC-01): não expomos mais `account_has_password` — revelar quais contas
    // têm senha facilitava ataque direcionado e não é consumido pelo frontend.
    let accountExists = false;
    try {
      const { data: lookup, error: lookupErr } = await admin.rpc("lookup_user_by_email", {
        _email: normalizedEmail,
      });
      if (lookupErr) {
        console.warn("[validate-public-email] lookup rpc error:", lookupErr);
      } else if (Array.isArray(lookup) && lookup.length > 0) {
        accountExists = true;
      }
    } catch (e) {
      console.warn("[validate-public-email] lookup failed:", e);
    }

    if (!invited) {
      // gate de acesso: só entra quem é sebrae edu, tem convite de curso,
      // ou já tem conta ativa (evita trancar quem foi liberado antes)
      const isSebrae = normalizedEmail.endsWith("@edu.sebrae.com.br");

      let hasCourseInvite = false;
      if (!isSebrae) {
        const { data: invite } = await admin
          .from("course_invites")
          .select("id")
          .eq("email_normalized", normalizedEmail)
          .maybeSingle();
        hasCourseInvite = !!invite;
      }

      const canEnter = isSebrae || hasCourseInvite || accountExists;

      return new Response(
        JSON.stringify({
          valid: false,
          prefill: null,
          can_enter: canEnter,
          already_submitted: fbiSubmitted,
          has_user: !!existing?.user_id || accountExists,
          account_exists: accountExists,
        }),
        {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
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
        // invited sempre pode entrar; fbi submitted também
        can_enter: true,
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return fail(cors, {
      status: 500,
      code: "unexpected",
      message: "erro inesperado ao validar o email",
      cause: e,
      fn: FN,
    });
  }
});
