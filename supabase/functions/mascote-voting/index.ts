// edge function: gerencia o ciclo de votação do mascote da turma.
// actions: open (admin) | close (admin) | vote (autenticado)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    // pega insight global atual
    const { data: row, error: selErr } = await admin
      .from("hub_insights")
      .select("id, aggregates")
      .eq("scope", "global")
      .is("user_id", null)
      .maybeSingle();

    if (selErr || !row) return json({ error: "insight global não encontrado" }, 404);

    const agg: any = row.aggregates ?? {};
    const candidatos = Array.isArray(agg.mascote_candidatos) ? agg.mascote_candidatos : [];
    if (candidatos.length === 0) return json({ error: "sem candidatos disponíveis" }, 400);

    const status: string = agg.voting_status ?? "fechada";

    if (action === "open") {
      if (!isAdmin) return json({ error: "só admin pode abrir" }, 403);
      // limpa votos antigos da rodada (caso seja reabertura)
      await admin.from("mascote_votes").delete().eq("insight_id", row.id);
      agg.voting_status = "aberta";
      agg.voting_opened_at = new Date().toISOString();
      delete agg.voting_closed_at;
      const { error: upd } = await admin
        .from("hub_insights")
        .update({ aggregates: agg })
        .eq("id", row.id);
      if (upd) return json({ error: upd.message }, 500);
      return json({ ok: true, status: "aberta" });
    }

    if (action === "close") {
      if (!isAdmin) return json({ error: "só admin pode fechar" }, 403);
      if (status !== "aberta") return json({ error: "votação não está aberta" }, 400);

      const { data: votes } = await admin
        .from("mascote_votes")
        .select("candidate_index")
        .eq("insight_id", row.id);

      const tally = new Array(candidatos.length).fill(0);
      for (const v of votes ?? []) {
        const i = (v as any).candidate_index as number;
        if (i >= 0 && i < tally.length) tally[i]++;
      }

      // vencedor: maior contagem, desempate por menor índice
      let winner = 0;
      let max = -1;
      for (let i = 0; i < tally.length; i++) {
        if (tally[i] > max) {
          max = tally[i];
          winner = i;
        }
      }

      agg.voting_status = "encerrada";
      agg.voting_closed_at = new Date().toISOString();
      agg.mascote_selected_index = winner;
      agg.voting_final_tally = tally;

      const { error: upd } = await admin
        .from("hub_insights")
        .update({ aggregates: agg })
        .eq("id", row.id);
      if (upd) return json({ error: upd.message }, 500);
      return json({ ok: true, status: "encerrada", winner, tally });
    }

    if (action === "vote") {
      if (status !== "aberta") return json({ error: "essa votação não está aberta" }, 400);
      const index = Number(body?.index);
      if (!Number.isInteger(index) || index < 0 || index >= candidatos.length) {
        return json({ error: "candidato inválido" }, 400);
      }

      // insert sob RLS do user (pra respeitar auth.uid = user_id)
      const { error: insErr } = await userClient.from("mascote_votes").insert({
        insight_id: row.id,
        user_id: userId,
        candidate_index: index,
      });
      if (insErr) {
        if ((insErr as any).code === "23505") {
          return json({ error: "tu já votou nessa rodada" }, 409);
        }
        return json({ error: insErr.message }, 500);
      }
      return json({ ok: true, voted_index: index });
    }

    return json({ error: "action inválida (open|close|vote)" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro desconhecido" }, 500);
  }
});
