// busca de GIFs via Giphy API
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GIPHY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GIPHY_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 24), 50);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
    const rating = url.searchParams.get("rating") ?? "pg-13";
    const lang = url.searchParams.get("lang") ?? "pt";

    const endpoint = q.length === 0 ? `${GIPHY_BASE}/trending` : `${GIPHY_BASE}/search`;
    const params = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      offset: String(offset),
      rating,
      bundle: "messaging_non_clips",
    });
    if (q.length > 0) {
      params.set("q", q);
      params.set("lang", lang);
    }

    const r = await fetch(`${endpoint}?${params.toString()}`);
    if (!r.ok) {
      const body = await r.text();
      return new Response(
        JSON.stringify({ error: `giphy ${r.status}`, body }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await r.json();

    type GiphyItem = {
      id: string;
      title: string;
      images: {
        fixed_height: { url: string; width: string; height: string };
        fixed_height_small: { url: string; width: string; height: string };
        original: { url: string; width: string; height: string };
      };
    };

    const items = (data.data as GiphyItem[]).map((g) => ({
      id: g.id,
      title: g.title,
      url: g.images.fixed_height.url,
      preview_url: g.images.fixed_height_small?.url ?? g.images.fixed_height.url,
      original_url: g.images.original.url,
      width: Number(g.images.fixed_height.width),
      height: Number(g.images.fixed_height.height),
    }));

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
