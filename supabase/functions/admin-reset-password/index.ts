import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fail } from "../_shared/errors.ts";

const FN = "admin-reset-password";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail(corsHeaders, { status: 401, code: "missing_auth", message: "faltou o cabeçalho de autenticação", fn: FN });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verifica que o caller é admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return fail(corsHeaders, { status: 401, code: "invalid_token", message: "sessão inválida ou expirada, entra de novo", cause: userErr, fn: FN });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr || !roleData) {
      return fail(corsHeaders, { status: 403, code: "forbidden_not_admin", message: "só admin pode redefinir senha", cause: roleErr, fn: FN });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.target_user_id as string | undefined;
    // SEC-05: sem senha padrão previsível. O chamador (admin) DEVE enviar uma
    // senha — o frontend gera uma aleatória forte e a exibe uma única vez.
    const newPassword = body?.new_password as string | undefined;

    if (!targetUserId) {
      return fail(corsHeaders, { status: 400, code: "missing_target", message: "target_user_id é obrigatório", fn: FN });
    }

    if (!newPassword || newPassword.length < 8) {
      return fail(corsHeaders, { status: 400, code: "weak_password", message: "new_password é obrigatório (mínimo 8 caracteres)", fn: FN });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updErr) {
      return fail(corsHeaders, { status: 500, code: "reset_failed", message: "não consegui redefinir a senha", cause: updErr, fn: FN });
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ has_password: true })
      .eq("user_id", targetUserId);

    if (profileErr) {
      console.warn("[admin-reset-password] senha resetada, mas profile não foi marcado:", profileErr);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return fail(corsHeaders, { status: 500, code: "unexpected", message: "erro inesperado ao redefinir a senha", cause: err, fn: FN });
  }
});
