// gera og:image 1200x630 da carta usando nano banana pro (gemini-3-pro-image-preview)
// edita a image_url existente da carta + adiciona texto editorial perestroika do lado direito.
// salva em builder-card-og/{share_token}.png (bucket público) e marca og_image_generated_at.
// auth: admin via JWT, OU service_role (chamada server-to-server de outra function).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { detectGender, type Gender } from "../_shared/gender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3.1-flash-image-preview";
const BUCKET = "builder-card-og";

const ARCHETYPE_LABELS: Record<string, { f: string; m: string }> = {
  visionario: { f: "A VISIONÁRIA", m: "O VISIONÁRIO" },
  artesao: { f: "A ARTESÃ", m: "O ARTESÃO" },
  experimentador: { f: "A EXPERIMENTADORA", m: "O EXPERIMENTADOR" },
  conector: { f: "A CONECTORA", m: "O CONECTOR" },
  pragmatico: { f: "A PRAGMÁTICA", m: "O PRAGMÁTICO" },
  narrador: { f: "A NARRADORA", m: "O NARRADOR" },
};

const archetypeLabel = (archetype: string, gender: Gender): string => {
  const entry = ARCHETYPE_LABELS[archetype];
  if (!entry) return archetype.toUpperCase();
  return gender === "f" ? entry.f : entry.m;
};

const ARCHETYPE_HEX: Record<string, string> = {
  visionario: "#6f77fc",
  artesao: "#fe7b02",
  experimentador: "#fd4644",
  conector: "#f756a6",
  pragmatico: "#090909",
  narrador: "#f756a6",
};

const buildPrompt = (
  archetype: string,
  nickname: string | null,
  tagline: string | null,
  gender: Gender,
) => {
  const label = archetypeLabel(archetype, gender);
  const hue = ARCHETYPE_HEX[archetype] ?? "#090909";
  const nick = nickname?.trim() ? `@${nickname.trim().replace(/^@/, "")}` : "";
  const tag = tagline?.trim() ?? "";

  return `Create a 1200x630 horizontal social share card (Open Graph image) using the input image as the LEFT artwork.

Composition (strict):
- Background: solid warm beige #f2e4d8 filling the entire 1200x630 canvas
- LEFT side (~40% width, centered vertically): the provided input image displayed as a vertical 3:4 tarot card portrait, placed inside a thin beige frame, with a very subtle -3 degree tilt. Add a soft drop shadow underneath
- RIGHT side (~60% width, generous padding): editorial typography stack, left-aligned, vertically centered:
  1. Display title: "${label}" in a bold condensed sans-serif (League Gothic style), uppercase, very large (~120px), color ${hue}, tight line-height. Render the title in PORTUGUESE exactly as provided, including accents (Á, Ã, Õ, etc.)
  2. Below the title with breathing room: "${nick}" in a clean modern sans-serif (Urbanist style), regular weight, ~36px, color #090909
  3. Below that: "${tag}" in italic, ~28px, color rgba(9,9,9,0.7), max 2 lines
  4. At the bottom right corner: small text "chŏra lovable · 25-26 abr 2026" in tiny uppercase tracking, ~16px, color rgba(9,9,9,0.5)

Style rules (mandatory):
- Editorial Brazilian magazine aesthetic, Perestroika brand
- Only these colors allowed: #f2e4d8 (bg), #090909 (text), #fe7b02, #fd4644, #f756a6, #6f77fc
- NO em-dashes anywhere
- NO emojis
- NO extra decorative elements, no logos other than the chŏra wordmark text
- NO gradients in the background, only solid beige
- Typography is the protagonist; respect generous whitespace
- Output exactly 1200x630 pixels, horizontal landscape`;
};

const dataUrlToBytes = (dataUrl: string) => {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("formato de imagem inválido do gateway");
  const contentType = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json().catch(() => ({}));
    const cardId = body?.card_id as string | undefined;
    const userId = body?.user_id as string | undefined;
    const force = Boolean(body?.force);

    // auth: aceita service_role (server-to-server) OU admin via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const internalSecret = req.headers.get("x-internal-secret") ?? "";
    const isServiceRole = (bearer && bearer === SERVICE_KEY) ||
      (internalSecret && internalSecret === LOVABLE_API_KEY);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!isServiceRole) {
      // tenta validar como JWT de admin
      let isAdmin = false;
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: u } = await userClient.auth.getUser();
        if (u?.user) {
          const { data: roleCheck } = await admin
            .from("user_roles")
            .select("role")
            .eq("user_id", u.user.id)
            .eq("role", "admin")
            .maybeSingle();
          if (roleCheck) isAdmin = true;
        }
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!cardId && !userId) {
      return new Response(JSON.stringify({ error: "card_id ou user_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cardQuery = admin.from("builder_cards").select("*").limit(1);
    if (cardId) cardQuery = cardQuery.eq("id", cardId);
    else if (userId) cardQuery = cardQuery.eq("user_id", userId);
    const { data: cards, error: cardErr } = await cardQuery;
    if (cardErr) throw cardErr;
    const card = cards?.[0];
    if (!card) {
      return new Response(JSON.stringify({ error: "carta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!card.archetype) {
      return new Response(
        JSON.stringify({ error: "carta sem arquétipo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // og só faz sentido pra carta publicada (precisa de share_token pro nome do arquivo).
    // se ainda não tem token, retorna ok+skipped pra não quebrar o pipeline de regerar tudo.
    if (!card.share_token) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "carta ainda não publicada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (card.og_image_generated_at && !force) {
      const { data: pub } = admin.storage
        .from(BUCKET)
        .getPublicUrl(`${card.share_token}.png`);
      return new Response(JSON.stringify({ ok: true, url: pub.publicUrl, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // busca nickname + display_name (display_name serve pra detectar gênero)
    const { data: profile } = await admin
      .from("profiles")
      .select("nickname, display_name")
      .eq("user_id", card.user_id)
      .maybeSingle();
    let nickname: string | null = profile?.nickname ?? profile?.display_name ?? null;
    let displayName: string | null = profile?.display_name ?? null;
    if (!nickname) {
      const { data: fbi } = await admin
        .from("fbi_responses")
        .select("nickname, nome")
        .or(`user_id.eq.${card.user_id},invited_participant_id.eq.${card.user_id}`)
        .maybeSingle();
      nickname = fbi?.nickname ?? fbi?.nome ?? null;
      displayName = displayName ?? (fbi?.nome ?? null);
    }
    if (!nickname) {
      const { data: invited } = await admin
        .from("invited_participants")
        .select("nickname, name")
        .eq("id", card.user_id)
        .maybeSingle();
      nickname = invited?.nickname ?? invited?.name ?? null;
      displayName = displayName ?? (invited?.name ?? null);
    }

    // sempre usa a artwork oficial atual do baralho (archetype_artworks),
    // não o snapshot velho em card.image_url
    const { data: artwork } = await admin
      .from("archetype_artworks")
      .select("image_url")
      .eq("archetype", card.archetype)
      .maybeSingle();
    const artworkUrl = artwork?.image_url ?? card.image_url;
    if (!artworkUrl) {
      return new Response(
        JSON.stringify({ error: "sem artwork pro arquétipo " + card.archetype }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gender: Gender = detectGender(displayName ?? nickname);
    console.log(`[generate-card-og-image] gender=${gender} archetype=${card.archetype}`);

    const prompt = buildPrompt(card.archetype, nickname, card.tagline, gender);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: artworkUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[generate-card-og-image] ai erro:", aiResp.status, errText);
      const msg =
        aiResp.status === 429
          ? "rate limit do gateway"
          : aiResp.status === 402
          ? "créditos lovable ai esgotados"
          : `erro do gateway (${aiResp.status})`;
      return new Response(JSON.stringify({ error: msg }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiText = await aiResp.text();
    if (!aiText) {
      console.error("[generate-card-og-image] gateway retornou body vazio com status", aiResp.status);
      return new Response(JSON.stringify({ error: "gateway retornou resposta vazia, tenta de novo" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let aiJson: unknown;
    try {
      aiJson = JSON.parse(aiText);
    } catch (e) {
      console.error("[generate-card-og-image] json invalido do gateway:", aiText.slice(0, 500));
      return new Response(JSON.stringify({ error: "resposta inválida do gateway" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataUrl = (aiJson as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> })
      ?.choices?.[0]?.message?.images?.[0]?.image_url?.url as
      | string
      | undefined;
    if (!dataUrl) {
      console.error("[generate-card-og-image] sem imagem:", JSON.stringify(aiJson).slice(0, 500));
      return new Response(JSON.stringify({ error: "modelo não retornou imagem" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bytes, contentType } = dataUrlToBytes(dataUrl);
    const filePath = `${card.share_token}.png`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType, upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(filePath);

    await admin
      .from("builder_cards")
      .update({ og_image_generated_at: new Date().toISOString() })
      .eq("id", card.id);

    return new Response(JSON.stringify({ ok: true, url: pub.publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-card-og-image] fatal:", e);
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
