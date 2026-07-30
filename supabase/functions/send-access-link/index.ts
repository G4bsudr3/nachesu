// send-access-link
//
// Envia magic link e recuperação de senha pelo NOSSO pipeline de email
// (send-transactional-email → notify.frattz.com), sem depender do hook de auth
// do GoTrue, que nunca foi ativado e faz os emails saírem em inglês por um
// remetente genérico (auth.lovable.cloud) e cair no spam.
//
// Público (sem JWT): quem chama ainda não está logado. Toda validação é
// server-side, com rate limit por email e por IP, e a resposta é sempre igual
// independente do email existir (não vaza quem está na base).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, clientIp, tooManyRequests } from "../_shared/rate-limit.ts";

const FN = "send-access-link";
const APP_BASE = "https://sebrae.frattz.com";

type LinkType = "magiclink" | "recovery";

function safePath(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  if (!input.startsWith("/") || input.startsWith("//")) return fallback;
  return input;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const ok = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const type: LinkType = body.type === "recovery" ? "recovery" : "magiclink";
    const nextPath = safePath(body.next, "/app");
    const courseSlug = typeof body.courseSlug === "string" ? body.courseSlug : null;

    if (!rawEmail || !/^\S+@\S+\.\S+$/.test(rawEmail) || rawEmail.length > 254) {
      return new Response(JSON.stringify({ error: "invalid_email", message: "email inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // rate limit: 5 links por email a cada 10 min, 20 por IP a cada 10 min
    if (!(await checkRateLimit(admin, `sal:mail:${rawEmail}`, 5, 600))) {
      return tooManyRequests(cors);
    }
    if (!(await checkRateLimit(admin, `sal:ip:${clientIp(req)}`, 20, 600))) {
      return tooManyRequests(cors);
    }

    // conta já existe?
    let userId: string | null = null;
    try {
      const { data: lookup } = await admin.rpc("lookup_user_by_email", { _email: rawEmail });
      if (Array.isArray(lookup) && lookup.length > 0) {
        userId = (lookup[0] as { user_id?: string })?.user_id ?? null;
      }
    } catch (e) {
      console.warn(`[${FN}] lookup falhou`, e);
    }

    // gate de acesso para quem ainda não tem conta
    if (!userId) {
      if (type === "recovery") {
        // não existe conta: responde ok sem enviar nada (não vaza)
        return ok();
      }

      const isSebrae = rawEmail.endsWith("@edu.sebrae.com.br");
      let allowed = isSebrae;

      if (!allowed) {
        const { data: invited } = await admin
          .from("invited_participants")
          .select("email")
          .eq("email", rawEmail)
          .maybeSingle();
        allowed = Boolean(invited);
      }
      if (!allowed) {
        const { data: courseInvite } = await admin
          .from("course_invites")
          .select("email_normalized")
          .eq("email_normalized", rawEmail)
          .limit(1)
          .maybeSingle();
        allowed = Boolean(courseInvite);
      }

      if (!allowed) {
        console.log(`[${FN}] email fora da lista autorizada`);
        return ok();
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: rawEmail,
        email_confirm: true,
        user_metadata: courseSlug ? { chosen_course_slug: courseSlug } : {},
      });
      if (createErr || !created?.user) {
        console.error(`[${FN}] createUser falhou`, createErr);
        return new Response(
          JSON.stringify({ error: "create_failed", message: "não consegui criar seu acesso agora" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      userId = created.user.id;
    }

    const redirectTo = type === "recovery"
      ? `${APP_BASE}/reset-password`
      : `${APP_BASE}${nextPath}`;

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type,
      email: rawEmail,
      options: { redirectTo },
    });

    const actionLink = linkData?.properties?.action_link;
    if (linkErr || !actionLink) {
      console.error(`[${FN}] generateLink falhou`, linkErr);
      return new Response(
        JSON.stringify({ error: "link_failed", message: "não consegui gerar o link agora" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // nome pra saudação (opcional)
    let recipientName = "";
    if (userId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("nickname, display_name")
        .eq("user_id", userId)
        .maybeSingle();
      recipientName = (profile?.nickname || profile?.display_name || "") as string;
    }

    const templateName = type === "recovery" ? "password-reset" : "access-link";
    const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: rawEmail,
        idempotencyKey: `${templateName}-${userId}-${Date.now()}`,
        templateData: type === "recovery"
          ? { recipientName, resetUrl: actionLink }
          : { recipientName, loginUrl: actionLink },
        metadata: { flow: type, user_id: userId },
      },
    });

    if (sendErr) {
      console.error(`[${FN}] envio falhou`, sendErr);
      return new Response(
        JSON.stringify({ error: "send_failed", message: "não consegui enviar o email agora" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return ok();
  } catch (err) {
    console.error(`[${FN}] erro inesperado`, err);
    return new Response(
      JSON.stringify({ error: "unexpected", message: "algo deu errado, tenta de novo" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
