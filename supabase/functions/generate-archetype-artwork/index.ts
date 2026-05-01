// edge function: gera artwork fixo por arquétipo via nano banana pro.
// 1 arte ativa por arquétipo (is_current=true). regerar substitui em
// TODAS as builder_cards desse arquétipo. histórico mantém todas as versões
// com seed/variables/preset pra rastrear/regenerar/restaurar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-pro-image-preview"; // nano banana pro
const BUCKET = "archetype-artworks";
const SEED_VERSION = "v3";

type Archetype = "visionario" | "artesao" | "experimentador" | "conector" | "pragmatico" | "narrador";

const VALID_ARCHETYPES: Archetype[] = [
  "visionario",
  "artesao",
  "experimentador",
  "conector",
  "pragmatico",
  "narrador",
];

// ============= variáveis procedurais =============

const COMPOSITIONS = ["centered", "off-center", "asymmetric"] as const;
const DENSITIES = ["sparse", "medium", "dense"] as const;
const ACCENTS = ["orange", "red", "pink", "blue"] as const;
const ROTATIONS = ["static", "tilt", "dynamic"] as const;
const NOISES = ["subtle", "medium", "heavy"] as const;

type Composition = (typeof COMPOSITIONS)[number];
type Density = (typeof DENSITIES)[number];
type Accent = (typeof ACCENTS)[number];
type Rotation = (typeof ROTATIONS)[number];
type Noise = (typeof NOISES)[number];
type Preset = "ousado" | "clean";

type Variables = {
  composition: Composition;
  density: Density;
  accent: Accent;
  rotation: Rotation;
  noise: Noise;
};

const ACCENT_HEX: Record<Accent, string> = {
  orange: "#fe7b02",
  red: "#fd4644",
  pink: "#f756a6",
  blue: "#6f77fc",
};

const COMPOSITION_DESC: Record<Composition, string> = {
  centered: "Composition: strictly centered, balanced, symmetric breathing space on all sides.",
  "off-center":
    "Composition: off-center anchor following golden ratio, deliberate asymmetric breathing space on one side.",
  asymmetric:
    "Composition: bold asymmetric layout, primary element pushed to one third, opposing negative space carries the eye.",
};

const DENSITY_DESC: Record<Density, string> = {
  sparse:
    "Density: very sparse, ~70% beige negative space, only 1-2 secondary elements, lots of breathing room.",
  medium: "Density: balanced, ~50% beige negative space, 3-4 supporting elements arranged with restraint.",
  dense:
    "Density: dense and rich, ~30% beige negative space, 5-7 supporting elements layered with Risograph overlap.",
};

const ROTATION_DESC: Record<Rotation, string> = {
  static: "Rotation: all elements perfectly upright, zero tilt, architectural stillness.",
  tilt: "Rotation: primary element tilted ~10-15° as a deliberate gesture, supporting elements remain upright.",
  dynamic:
    "Rotation: multiple elements rotated at varied angles (0°, 15°, -20°, 30°), kinetic motion across the canvas.",
};

const NOISE_DESC: Record<Noise, string> = {
  subtle: "Noise: very subtle Risograph grain, barely visible, clean print feel.",
  medium: "Noise: visible Risograph halftone dots, soft color misregistration on overlaps, tactile printed feel.",
  heavy:
    "Noise: heavy Risograph grain throughout, pronounced halftone dot pattern, strong color misregistration creating overlap glow.",
};

// ============= core template (DNA visual compartilhado) =============

const CORE_TEMPLATE = `Perestroika visual identity poster — Brazilian editorial design meets Swiss Bauhaus meets Risograph print meets Y2K maximalism.

CORE LANGUAGE (mandatory across all 6 archetypes — this is the visual DNA):
- The "lágrima Perestroika" (tear-drop shape) is the SOUL of every piece. It must appear as a central anchor element, filled with a smooth multi-color gradient flowing from orange #fe7b02 → red #fd4644 → pink #f756a6 → blue #6f77fc.
- Solid beige #f2e4d8 is the DOMINANT background color (~60% of the canvas). The Perestroika colors are accents, not floods.
- Risograph print aesthetic: visible halftone dots, soft color misregistration on overlapping shapes, slightly grainy texture, never digital-smooth.
- Bauhaus geometric rigor: clean primitive shapes (circles, triangles, rectangles, arcs), asymmetric composition with breathing space.
- Brazilian editorial poster vibe: bold and graphic, like a Perestroika course flyer or Helvetica-Brasil Bauhaus print.

STRICT PALETTE (only these 6 hex values, no others):
- beige #f2e4d8 (dominant background, ~60%)
- orange #fe7b02
- red #fd4644
- pink #f756a6
- blue #6f77fc
- black #090909 (used sparingly for sharp accents and contrast)

HARD CONSTRAINTS:
- NO text, NO letters, NO numbers, NO logos, NO signatures, NO watermarks anywhere
- NO human faces, NO realistic photography, NO photo textures, NO 3D rendered look
- NO drop shadows, NO chrome, NO metallic, NO glassmorphism
- NO AI-aesthetic generic gradients (purple-magenta-cyan)
- NO mandala, NO tarot illustration, NO aurora, NO "spiritual radiance"
- NO frames or borders around the image (it lives inside a card frame added separately)
- 3:4 vertical portrait aspect ratio (1080×1440 reference)`;

// ============= motifs corrigidos por arquétipo =============
// fonte de verdade dos motifs Perestroika (versão v3 do prompt).

const ARCHETYPE_MOTIFS: Record<Archetype, { name: string; motif: string; mood: string }> = {
  visionario: {
    name: "O Visionário",
    motif:
      "Centered Perestroika lágrima with the full gradient, positioned in the upper-third golden ratio, slightly compressed vertically as if reaching far. Behind the lágrima: a clean horizontal composition of THREE parallel thin lines in solid blue #6f77fc crossing the entire canvas — suggesting a distant horizon or meridian lines receding into depth. Above the lágrima: a single sharp triangle in solid {ACCENT_HEX} pointing upward (suggesting trajectory / future). Below the lágrima in the lower third: a cluster of small solid black #090909 dots scattered like a distant star map — specifically 7 to 11 dots arranged irregularly, not symmetric.",
    mood:
      "Long horizon, silent altitude, future being mapped. NO concentric circles, NO sonar, NO radial burst. This is a landscape of far distance, not an orbit.",
  },
  artesao: {
    name: "A Artesã",
    motif:
      "Centered Perestroika lágrima with the full gradient, larger and more prominent than any other archetype. Surrounding the lágrima: a precise hexagonal lattice of solid {ACCENT_HEX} hexagons tiled like textile or honeycomb mosaic, NOT in concentric rings — in a flat continuous mesh filling the canvas like a quilt. Some hexagons are solid-filled, others are outline-only in black #090909, others have half-fills (risograph imperfection). One or two hexagons deliberately 'missing' (empty beige) as if still being crafted. A single small solid pink #f756a6 hexagon offset asymmetrically as a deliberate detail of personal signature.",
    mood:
      "Devotional patience, quilt-in-progress, jewel-like mosaic. Feels like a hand-crafted textile, NOT an orbit. Composition suggests fabric/tapestry, not planetary system.",
  },
  experimentador: {
    name: "O Experimentador",
    motif:
      "Centered Perestroika lágrima with the full gradient, tilted ~15° as if mid-motion. Surrounding it: a giant Perestroika-style balão serrado (elongated jagged starburst / explosion) in solid red #fd4644 bursting outward asymmetrically. The explosion direction should match the composition variable (off-center-left means explodes from lower-left corner, asymmetric means across the diagonal, etc). Splashes of solid {ACCENT_HEX} droplets and small orange triangles scattered chaotically. Visible Risograph dot texture on overlapping areas creating color overlap moments.",
    mood:
      "Joyful eruption, mid-experiment energy, controlled chaos. Off-balance but not ugly — kinetic and alive.",
  },
  conector: {
    name: "A Conectora",
    motif:
      "A large central Perestroika lágrima with the full gradient, clearly anchoring the composition. Around it — NOT overlapping, but clearly separated with breathing space — EXACTLY 5 smaller lágrimas in different solid Perestroika colors (one orange #fe7b02, one red #fd4644, one pink #f756a6, one blue #6f77fc, one with the full gradient). Each smaller lágrima is connected to the central one by a SINGLE clean thin solid black #090909 line — slightly wobbly but distinct, like a hand-drawn network graph. Some lágrimas also connect to EACH OTHER forming triangles of relationship, but the graph should be READABLE: one can trace the network. A single very thin blue #6f77fc circle behind the entire network suggesting the space holds them.",
    mood:
      "Warm convergence, readable network of care, each lágrima is a person, the lines are relationships. It should look like a diagram of a community, NOT a chaotic cluster.",
  },
  pragmatico: {
    name: "O Pragmático",
    motif:
      "Centered Perestroika lágrima with the full gradient. Behind it: an AGGRESSIVELY STRUCTURAL Bauhaus grid filling at least 70% of the canvas — a huge solid black #090909 vertical rectangle occupying the entire left third, a huge solid orange #fe7b02 horizontal rectangle occupying the entire middle horizontal band, and a solid red #fd4644 square overlapping their intersection, prominent and dominant. The rectangles should feel MASSIVE and FLAT, like a 1965 Swiss-Brazilian political poster. A single thin blue #6f77fc line cuts horizontally across the whole composition as a functional accent (a ruler, a deadline, a constraint). The {ACCENT_HEX} color appears as a small square somewhere as a signature detail.",
    mood:
      "Confident utility, no-nonsense, STRUCTURAL DOMINANCE. Composition should feel like a 1965 political poster — authoritative, unornamented, flat graphic weight. The lágrima reads as the human warmth inside a rigid structure.",
  },
  narrador: {
    name: "A Narradora",
    motif:
      "Centered Perestroika lágrima with the full gradient, positioned slightly lower-center. Wrapping around the lágrima but NOT COVERING it: a single flowing condensed banner-ribbon in solid pink #f756a6 curving clearly from the LOWER-LEFT corner, passing BEHIND the lágrima, and emerging toward the UPPER-RIGHT corner. The ribbon has clear directionality (it tells a story of motion). A second shorter echo-ribbon in solid {ACCENT_HEX} color below and parallel, giving rhythm. A trail of tiny solid black #090909 dots following the direction of the ribbon, like punctuation or footsteps marking where the story has traveled. The lágrima must remain clearly visible and central — the ribbons frame it, don't obscure it.",
    mood:
      "Story unfurling in clear motion, lower-left to upper-right, narrative momentum. Readable as 'something is being told.'",
  },
};

// ============= helpers procedurais =============

const PRESET_OVERRIDES: Record<Preset, Partial<Variables>> = {
  ousado: { density: "dense", rotation: "dynamic", noise: "heavy" },
  clean: { density: "sparse", rotation: "static", noise: "subtle" },
};

const sha256Hex = async (input: string): Promise<string> => {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const pickFromHash = <T,>(arr: readonly T[], hex: string, offset: number): T => {
  // pega 4 hex chars como int → módulo do tamanho do array
  const slice = hex.slice(offset, offset + 4) || "0000";
  const n = parseInt(slice, 16);
  return arr[n % arr.length];
};

const resolveVariables = async (
  archetype: Archetype,
  body: { seed?: string; variables?: Partial<Variables>; preset?: Preset },
): Promise<{ variables: Variables; seed: string; preset: Preset | null }> => {
  const seed = body.seed?.trim() || crypto.randomUUID();
  const hex = await sha256Hex(`${seed}:${archetype}:${SEED_VERSION}`);

  // base full random a partir do hash
  const base: Variables = {
    composition: pickFromHash(COMPOSITIONS, hex, 0),
    density: pickFromHash(DENSITIES, hex, 4),
    accent: pickFromHash(ACCENTS, hex, 8),
    rotation: pickFromHash(ROTATIONS, hex, 12),
    noise: pickFromHash(NOISES, hex, 16),
  };

  // aplica preset se houver
  const preset = body.preset ?? null;
  const presetOverrides = preset ? PRESET_OVERRIDES[preset] : {};

  // aplica variables explícitas (maior prioridade)
  const explicit = body.variables ?? {};

  const variables: Variables = {
    ...base,
    ...presetOverrides,
    ...explicit,
  };

  return { variables, seed, preset };
};

const buildPrompt = (archetype: Archetype, vars: Variables): string => {
  const t = ARCHETYPE_MOTIFS[archetype];
  const accentHex = `${vars.accent} ${ACCENT_HEX[vars.accent]}`;
  // os motifs do documento usam {ACCENT_HEX} como placeholder pra cor de accent
  const motifWithAccent = t.motif.replaceAll("{ACCENT_HEX}", accentHex);
  return `${CORE_TEMPLATE}

PERSONALIZATION (unique to this generation):
- Composition: ${vars.composition}
- Density: ${vars.density}
- Secondary accent color: ${accentHex}
- Motion mood: ${vars.rotation}
- Risograph texture intensity: ${vars.noise}

ARCHETYPE: ${t.name}

UNIQUE MOTIF (mandatory — do not deviate from this composition):
${motifWithAccent}

MOOD: ${t.mood}

PROCEDURAL VARIABLES (apply these to vary this generation while keeping the motif intact):
- ${COMPOSITION_DESC[vars.composition]}
- ${DENSITY_DESC[vars.density]}
- Color accent emphasis: lean slightly extra toward ${accentHex} as the dominant accent color among the supporting elements (without breaking the strict palette).
- ${ROTATION_DESC[vars.rotation]}
- ${NOISE_DESC[vars.noise]}

Render this as a finished Perestroika poster artwork, 3:4 vertical portrait, ready to be the central illustration inside a card frame.`;
};

const dataUrlToBytes = (dataUrl: string): { bytes: Uint8Array; contentType: string } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("formato de imagem inválido do gateway");
  const contentType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "só admin pode gerar artworks" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const archetype = body?.archetype as Archetype | undefined;

    if (!archetype || !VALID_ARCHETYPES.includes(archetype)) {
      return new Response(
        JSON.stringify({
          error: `archetype inválido. usar um de: ${VALID_ARCHETYPES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // valida preset/variables se vierem
    const rawPreset = body?.preset;
    if (rawPreset && rawPreset !== "ousado" && rawPreset !== "clean") {
      return new Response(
        JSON.stringify({ error: "preset inválido (usar 'ousado' ou 'clean')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { variables, seed, preset } = await resolveVariables(archetype, {
      seed: typeof body?.seed === "string" ? body.seed : undefined,
      variables: body?.variables ?? undefined,
      preset: rawPreset,
    });

    // make_current default false: gera + salva no histórico SEM ativar nem propagar.
    // admin escolhe no histórico qual versão vira a is_current via restore-archetype-artwork.
    const makeCurrent = body?.make_current === true;

    const prompt = buildPrompt(archetype, variables);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[generate-archetype-artwork] ai erro:", aiResp.status, errText);
      const msg =
        aiResp.status === 429
          ? "rate limit do gateway. tenta de novo em alguns segundos."
          : aiResp.status === 402
          ? "créditos da lovable ai esgotados."
          : `erro do gateway (${aiResp.status})`;
      return new Response(JSON.stringify({ error: msg }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiText = await aiResp.text();
    let aiJson: unknown;
    try {
      aiJson = aiText ? JSON.parse(aiText) : {};
    } catch (parseErr) {
      console.error("[generate-archetype-artwork] parse falhou:", parseErr, "body:", aiText.slice(0, 300));
      return new Response(JSON.stringify({ error: "resposta inválida do gateway, tenta de novo" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataUrl = (
      aiJson as { choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[] }
    )?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!dataUrl) {
      console.error(
        "[generate-archetype-artwork] sem imagem no retorno:",
        JSON.stringify(aiJson).slice(0, 500),
      );
      return new Response(JSON.stringify({ error: "modelo não retornou imagem" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bytes, contentType } = dataUrlToBytes(dataUrl);
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const filePath = `${archetype}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(filePath, bytes, {
      contentType,
      upsert: true,
    });
    if (uploadErr) throw uploadErr;

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = pub.publicUrl;
    const nowIso = new Date().toISOString();

    let artwork: unknown = null;

    if (makeCurrent) {
      // upsert na archetype_artworks (uma linha por arquétipo, sempre = arte atual)
      const { data: artworkRow, error: upsertErr } = await admin
        .from("archetype_artworks")
        .upsert(
          {
            archetype,
            image_url: publicUrl,
            prompt_used: prompt,
            model: MODEL,
            generated_at: nowIso,
          },
          { onConflict: "archetype" },
        )
        .select()
        .single();
      if (upsertErr) throw upsertErr;
      artwork = artworkRow;

      // marca anteriores como não-atuais
      await admin
        .from("archetype_artwork_versions")
        .update({ is_current: false })
        .eq("archetype", archetype)
        .eq("is_current", true);
    }

    // sempre insere no histórico (is_current só se makeCurrent)
    const { data: versionRow } = await admin
      .from("archetype_artwork_versions")
      .insert({
        archetype,
        image_url: publicUrl,
        prompt_used: prompt,
        model: MODEL,
        generated_at: nowIso,
        is_current: makeCurrent,
        seed,
        variables,
        preset,
      })
      .select()
      .single();

    if (makeCurrent) {
      // propaga pra todas as builder_cards desse arquétipo
      await admin
        .from("builder_cards")
        .update({
          image_url: publicUrl,
          image_generated_at: nowIso,
        })
        .eq("archetype", archetype);
    }

    return new Response(
      JSON.stringify({
        artwork,
        version: versionRow,
        seed,
        variables,
        preset,
        made_current: makeCurrent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[generate-archetype-artwork] fatal:", e);
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
