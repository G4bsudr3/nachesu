// check-video-links: confere cada vídeo cadastrado nas pílulas contra o próprio
// youtube (oembed público) e devolve título e canal reais, marcando divergência
// e vídeo fora do ar. só admin. sem chave, sem custo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type PillRow = {
  id: string;
  order_index: number;
  title: string;
  kind: string;
  published: boolean;
  interaction_schema: Record<string, unknown> | null;
  video_url: string | null;
  modules: {
    number: number;
    title: string;
    trails: { courses: { slug: string; title: string } | null } | null;
  } | null;
};

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchOEmbed(videoId: string) {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`,
  );
  if (res.status === 200) {
    const d = await res.json();
    return { ok: true as const, title: String(d.title ?? ""), channel: String(d.author_name ?? "") };
  }
  return { ok: false as const, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "não autenticado" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: "não autenticado" }, 401);

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "acesso restrito a admins" }, 403);

    const { data, error } = await admin
      .from("module_pills")
      .select(
        "id, order_index, title, kind, published, interaction_schema, video_url, modules!inner(number, title, trails!inner(courses!inner(slug, title)))",
      )
      .order("order_index");

    if (error) return json({ error: error.message }, 500);

    const pills = (data ?? []) as unknown as PillRow[];

    // só entra na conferência quem é aula (pílula) ou já tem algum vídeo cadastrado.
    // exercício, registro e reflexão não têm vídeo por natureza e ficam de fora.
    const LESSON_KINDS = new Set(["pilula_a", "pilula_b", "pilula_c"]);

    const items = pills
      .map((p) => {
        const schema = (p.interaction_schema ?? {}) as Record<string, any>;
        const video = schema.video as Record<string, any> | undefined;
        const embedUrl = typeof schema.embed_url === "string" ? schema.embed_url : null;
        const link: string | null = video?.url ?? embedUrl ?? p.video_url ?? null;
        const course = p.modules?.trails?.courses;
        const expectsVideo = LESSON_KINDS.has(p.kind) || Boolean(video) || Boolean(link);
        if (!expectsVideo) return null;
        return {
          pill_id: p.id,
          course_slug: course?.slug ?? "?",
          course_title: course?.title ?? "?",
          module_number: p.modules?.number ?? 0,
          module_title: p.modules?.title ?? "",
          order_index: p.order_index,
          pill_title: p.title,
          published: p.published,
          is_bonus: Boolean(embedUrl) || video?.optional === true,
          link,
          db_title: (video?.title as string | undefined) ?? null,
          db_channel: (video?.channel as string | undefined) ?? null,
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    // só faz rede pros links de youtube
    const results = await Promise.all(
      items.map(async (item) => {
        if (!item.link) {
          return { ...item, status: "sem_video" as const, real_title: null, real_channel: null };
        }
        const vid = extractVideoId(item.link);
        if (!vid) {
          // vídeo próprio hospedado, nada a conferir no youtube
          return { ...item, status: "arquivo_proprio" as const, real_title: null, real_channel: null };
        }
        try {
          const r = await fetchOEmbed(vid);
          if (!r.ok) {
            return {
              ...item,
              status: "fora_do_ar" as const,
              http_status: r.status,
              real_title: null,
              real_channel: null,
            };
          }
          // divergência de verdade é conteúdo diferente, não formatação. se um texto
          // contém o outro (título encurtado, emoji, sufixo), é o mesmo vídeo.
          const sameText = (a: string, b: string) => {
            const x = normalize(a);
            const y = normalize(b);
            if (!x || !y) return true;
            if (x === y || x.includes(y) || y.includes(x)) return true;
            // último critério: maioria das palavras em comum (emoji, sufixo de canal, corte)
            const xs = new Set(x.split(" ").filter((w) => w.length > 2));
            const ys = new Set(y.split(" ").filter((w) => w.length > 2));
            if (!xs.size || !ys.size) return false;
            let hits = 0;
            xs.forEach((w) => ys.has(w) && hits++);
            return hits / Math.min(xs.size, ys.size) >= 0.7;
          };
          const titleMismatch = Boolean(item.db_title) && !sameText(item.db_title!, r.title);
          const channelMismatch =
            Boolean(item.db_channel) && !sameText(item.db_channel!, r.channel);
          const missingFicha = !item.db_title || !item.db_channel;
          return {
            ...item,
            status: titleMismatch || channelMismatch
              ? ("divergente" as const)
              : missingFicha
                ? ("ficha_incompleta" as const)
                : ("ok" as const),
            title_mismatch: titleMismatch,
            channel_mismatch: channelMismatch,
            real_title: r.title,
            real_channel: r.channel,
          };
        } catch (e) {
          return {
            ...item,
            status: "erro" as const,
            error: String(e),
            real_title: null,
            real_channel: null,
          };
        }
      }),
    );

    return json({ checked_at: new Date().toISOString(), items: results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
