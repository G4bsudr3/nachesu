import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendAndLog } from "../_shared/email-send-log.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_BASE = "https://sebrae.frattz.com";

type Body = {
  email?: string;
  name?: string;
  nickname?: string | null;
  role?: "participant" | "admin";
  course_slugs?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth", message: "faltou autenticação" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. valida admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "invalid_token", message: "sessão inválida" }, 401);
    }
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? "";

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) {
      return json({ error: "forbidden", message: "só admin pode convidar" }, 403);
    }

    // 2. valida body
    const body: Body = await req.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const nickname = body.nickname?.trim() || name?.split(" ")[0] || null;
    const role: "participant" | "admin" = body.role === "admin" ? "admin" : "participant";
    const courseSlugs = Array.isArray(body.course_slugs)
      ? body.course_slugs.filter((s): s is string => typeof s === "string" && s.length > 0)
      : [];

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "invalid_email", message: "email inválido" }, 400);
    }
    if (!name || name.length < 2) {
      return json({ error: "invalid_name", message: "nome é obrigatório" }, 400);
    }

    // 3. usuário já existe?
    const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const alreadyExists = existingList?.users?.some((u) => u.email?.toLowerCase() === email);
    if (alreadyExists) {
      return json({
        error: "already_exists",
        message: "essa pessoa já tem conta. vá em /admin/usuarios pra editar ou resetar senha.",
      }, 409);
    }

    // 4. cria usuário (email confirmado, sem senha — entra por magic link)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        nickname: nickname,
      },
    });
    if (createErr || !created.user) {
      console.error("[admin-invite-user] createUser fail", createErr);
      return json({ error: "create_failed", message: createErr?.message ?? "não consegui criar" }, 500);
    }
    const newUserId = created.user.id;

    // 5. garante nickname/display_name no profile (trigger handle_new_user já rodou)
    await admin.from("profiles")
      .update({ display_name: name, nickname })
      .eq("user_id", newUserId);

    // 6. se admin, concede role via cliente do admin chamador (respeita guard)
    if (role === "admin") {
      const { error: roleErr } = await userClient
        .from("user_roles")
        .insert({ user_id: newUserId, role: "admin" });
      if (roleErr) {
        console.error("[admin-invite-user] grant admin fail", roleErr);
        // não aborta: user já foi criado, mas avisa
        return json({
          error: "role_grant_failed",
          message: `usuário criado, mas falhou conceder admin: ${roleErr.message}`,
          user_id: newUserId,
        }, 500);
      }
    }

    // 7. matrículas em eletivas
    let enrolledTitles: string[] = [];
    if (courseSlugs.length > 0) {
      const { data: courses } = await admin
        .from("courses")
        .select("id, slug, title")
        .in("slug", courseSlugs);

      if (courses && courses.length > 0) {
        const enrollments = courses.map((c) => ({
          user_id: newUserId,
          course_id: c.id as string,
          status: "active" as const,
        }));
        await admin.from("enrollments").upsert(enrollments, { onConflict: "user_id,course_id" });

        const invites = courses.map((c) => ({
          course_id: c.id as string,
          email_normalized: email,
          claimed_at: new Date().toISOString(),
        }));
        await admin.from("course_invites").upsert(invites, { onConflict: "course_id,email_normalized" });

        enrolledTitles = courses.map((c) => c.title as string);
      }
    }

    // 8. gera magic link
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_BASE}/app` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[admin-invite-user] generateLink fail", linkErr);
      return json({
        error: "link_failed",
        message: "usuário criado, mas falhou gerar magic link. peça pra pessoa ir em /auth.",
        user_id: newUserId,
      }, 500);
    }
    const magicLink = linkData.properties.action_link;

    // 9. dispara email transacional
    const inviterName = callerEmail.split("@")[0] || "a equipe da nachesu";
    const sendResult = await sendAndLog(admin, "admin-invite", email, {
      idempotencyKey: `admin-invite-${newUserId}`,
      templateData: {
        recipientName: nickname ?? name,
        invitedBy: inviterName,
        roleLabel: role === "admin" ? "admin" : "estudante",
        courses: enrolledTitles,
        loginUrl: magicLink,
      },
      metadata: {
        invited_by: callerId,
        invited_user_id: newUserId,
        role,
        course_slugs: courseSlugs,
      },
    });

    if (!sendResult.sent) {
      console.error("[admin-invite-user] send email fail", sendResult.reason);
      return json({
        ok: true,
        user_id: newUserId,
        warning: "usuário criado mas email pode não ter saído — verifique em Cloud → Emails",
      }, 200);
    }


    return json({
      ok: true,
      user_id: newUserId,
      email,
      role,
      enrolled: enrolledTitles,
    }, 200);
  } catch (err) {
    console.error("[admin-invite-user] unexpected", err);
    return json({ error: "unexpected", message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
