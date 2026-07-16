import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fail } from "../_shared/errors.ts";

const FN = "admin-upsert-user";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(corsHeaders, { status: 401, code: "missing_auth", message: "faltou o cabeçalho de autenticação", fn: FN });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return fail(corsHeaders, { status: 401, code: "invalid_token", message: "sessão inválida ou expirada, entra de novo", cause: userErr, fn: FN });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return fail(corsHeaders, { status: 403, code: "forbidden_not_admin", message: "só admin pode criar/atualizar usuários", fn: FN });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    const password = body?.password as string | undefined;
    // SEC-04: admin agora é OPT-IN explícito (antes era admin-por-default).
    // Para criar/atualizar um admin, envie `make_admin: true` no corpo.
    const makeAdmin = body?.make_admin === true;

    if (!email || !password || password.length < 6) {
      return fail(corsHeaders, { status: 400, code: "invalid_input", message: "email e password (mínimo 6 caracteres) são obrigatórios", fn: FN });
    }

    // procura user existente
    let targetId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (found) targetId = found.id;

    if (!targetId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr || !created.user) {
        return fail(corsHeaders, { status: 500, code: "create_failed", message: "não consegui criar o usuário", cause: createErr, fn: FN });
      }
      targetId = created.user.id;
    } else {
      const { error: updErr } = await admin.auth.admin.updateUserById(targetId, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        return fail(corsHeaders, { status: 500, code: "update_failed", message: "não consegui atualizar o usuário", cause: updErr, fn: FN });
      }
    }

    // marca has_password no profile (best-effort; profile pode ainda não existir se trigger não disparou)
    await admin.from("profiles").update({ has_password: true }).eq("user_id", targetId);

    if (makeAdmin) {
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: targetId, role: "admin" });
      if (roleErr && !String(roleErr.message).includes("duplicate")) {
        console.warn("[admin-upsert-user] role insert:", roleErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: targetId, email, created: !found }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return fail(corsHeaders, { status: 500, code: "unexpected", message: "erro inesperado ao criar/atualizar o usuário", cause: err, fn: FN });
  }
});
