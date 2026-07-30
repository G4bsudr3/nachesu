// permite que um estudante já autenticado, mas sem nenhuma matrícula ativa,
// escolha a eletiva dele. fecha o beco sem saída de quem entrou com email
// da escola sebrae sem estar na lista de convites.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (cors: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(cors, { error: "login obrigatório" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json(cors, { error: "login obrigatório" }, 401);

    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.course_slug === "string" ? body.course_slug.trim() : "";
    if (!slug) return json(cors, { error: "course_slug obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const email = (user.email ?? "").trim().toLowerCase();

    // só quem tem email da escola ou convite pode se auto-matricular
    const isSebrae = email.endsWith("@edu.sebrae.com.br");
    let hasInvite = false;
    if (!isSebrae) {
      const { data: invite } = await admin
        .from("course_invites")
        .select("id")
        .eq("email_normalized", email)
        .limit(1)
        .maybeSingle();
      hasInvite = !!invite;
    }
    if (!isSebrae && !hasInvite) {
      return json(cors, { error: "not_allowed", message: "seu email não está na lista da escola" }, 403);
    }

    // já matriculado? não faz nada (o trigger só aceita uma matrícula ativa)
    const { data: existing } = await admin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (existing) {
      return json(cors, { error: "already_enrolled", message: "você já tem uma eletiva ativa" }, 409);
    }

    const { data: course } = await admin
      .from("courses")
      .select("id, slug, title")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (!course) return json(cors, { error: "course_not_found", message: "eletiva não encontrada" }, 404);

    const { error: insErr } = await admin
      .from("enrollments")
      .insert({ user_id: user.id, course_id: course.id, status: "active" });
    if (insErr) {
      return json(cors, { error: "insert_failed", message: "não consegui matricular agora" }, 500);
    }

    await admin.from("admin_audit_log").insert({
      actor_id: user.id,
      actor_email: email,
      action: "self_enroll",
      target_kind: "course",
      target_id: course.id,
      target_label: course.title,
      metadata: { slug: course.slug, source: "student_self_service" },
    });

    return json(cors, { ok: true, course: { slug: course.slug, title: course.title } });
  } catch (_e) {
    return json(cors, { error: "unexpected", message: "não consegui matricular agora, tenta de novo" }, 500);
  }
});
