// edge function pública: serve HTML com Open Graph tags dinâmicas pra crawlers
// (WhatsApp, Twitter, Facebook, LinkedIn, Slack, Discord) e redireciona humanos
// pra SPA em /carta/:token. necessário pq SPA não roda meta no crawler.
//
// rota esperada: /functions/v1/carta-og?token=XXXXX
// rewrite no frontend: /carta/:token (humano) | crawler bate aqui

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = "https://chorahub.lovable.app";

const ARCHETYPE_LABELS: Record<string, string> = {
  visionario: "visionário",
  artesao: "artesão",
  experimentador: "experimentador",
  conector: "conector",
  pragmatico: "pragmático",
  narrador: "narrador",
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? url.pathname.split("/").pop();

  if (!token) {
    return new Response("token ausente", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("get_public_card_by_token", { _token: token });
  const card = Array.isArray(data) ? data[0] : null;

  const publicUrl = `${SITE_URL}/carta/${token}`;

  // fallback global servido do bucket público (sempre disponível, 1200x630)
  const OG_FALLBACK = `${SUPABASE_URL}/storage/v1/object/public/builder-card-og/og-default.png`;

  if (error || !card) {
    const html = baseHtml({
      title: "carta não encontrada · chŏra lovable",
      description: "essa carta de builder não existe ou ainda não foi publicada.",
      image: OG_FALLBACK,
      url: publicUrl,
    });
    return new Response(html, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const archLabel = ARCHETYPE_LABELS[card.archetype] ?? card.archetype;
  const nome = card.nickname || card.display_name?.split(" ")[0] || "builder";
  const emoji = card.emoji ?? "💫";
  const title = `${nome} é ${archLabel} ${emoji} · chŏra lovable`;
  const description = card.essence_phrase
    ? `"${card.essence_phrase}"`
    : card.tagline ?? "descobre teu arquétipo de builder no chŏra lovable.";

  // imagem OG: usa a imagem específica da carta se existir no bucket, senão fallback global
  // (a imagem por carta é gerada pelo admin e salva como {token}.png no mesmo bucket)
  const ogImageBucket = `${SUPABASE_URL}/storage/v1/object/public/builder-card-og/${token}.png`;
  // checa se a imagem específica existe via HEAD; senão cai no fallback
  let finalImage = OG_FALLBACK;
  try {
    const head = await fetch(ogImageBucket, { method: "HEAD" });
    if (head.ok) finalImage = ogImageBucket;
  } catch {
    // mantém fallback
  }

  const html = baseHtml({
    title,
    description,
    image: finalImage,
    url: publicUrl,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
});

function baseHtml({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}" />
<link rel="canonical" href="${url}" />

<meta property="og:type" content="article" />
<meta property="og:site_name" content="chŏra lovable" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDesc}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="pt_BR" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDesc}" />
<meta name="twitter:image" content="${image}" />

<meta http-equiv="refresh" content="0; url=${url}" />
</head>
<body>
<p>redirecionando pra <a href="${url}">${safeTitle}</a>…</p>
<script>window.location.replace(${JSON.stringify(url)});</script>
</body>
</html>`;
}
