// edge function: análise etnográfica da turma chŏra lovable.
// 1 chamada à lovable AI (gemini 2.5 pro) pra análise rica + temas por user.
// 1 chamada à imagem (gemini 2.5 flash image) pra mascote da turma.
// matches deterministicos no backend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEXT_MODEL = "google/gemini-2.5-pro";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const MAX_RETRIES = 2;
const MATCHES_PER_USER = 4;
const MASCOT_BUCKET = "turma-mascots";

// ---------- prompt + tool ----------

const SYSTEM_PROMPT = `tu é etnógrafa da turma chŏra lovable, não estatística. tu lê 30-50 fbis e cartas de arquétipo e devolve uma análise editorial profunda, no tom do frattz.

regras absolutas:
- tudo lowercase, sem em-dash, sem hashtag, sem corporativês
- nada de "a maioria quer aprender ia". análises óbvias estão proibidas
- todo insight cruza pelo menos 2 dimensões (tema + arquétipo, cidade + experiência, expectativa + ideia, etc.)
- quando citar trecho de fbi, use aspas curtas e nunca exponha nome (ex: 'uma pessoa diz "tô travada com o que fazer da minha vida"')
- evidência crua > paráfrase fofa

tu vai produzir, via tool call save_analysis:

1. theme por aluno (theme_primary curto + 2-4 theme_tags)

2. manchete: frase forte tipo capa de revista, máx 12 palavras, captura a alma da turma
3. subtitulo: 1 frase tom frattz que explica a manchete

4. paradoxos (3-5): contradições produtivas que essa turma carrega. cada um tem titulo curto + explicacao 1-2 frases. ex: "metade quer construir pra educação, mas quase ninguém é professor"

5. observacoes (5-8) de 4 tipos:
   - "padrao": coisas que muita gente disse de formas diferentes mas significam o mesmo (ex: "8 pessoas usaram alguma forma de 'travado' descrevendo o trabalho atual")
   - "tensao": contradições entre o que dizem que querem e o que descrevem fazer
   - "cluster": agrupamentos inesperados cruzando 2+ variáveis (ex: "todos os visionários de saúde mental estão fora de capitais")
   - "outlier": 1-3 perfis únicos descritos sem nome (ex: "uma pessoa quer construir pra coral de igreja, é a única que mistura espiritualidade com b2b")
   campos: tipo, titulo (chamada curta), insight (1-2 frases), evidencia (citação curta opcional)

6. constelacoes (3-6): substitui "top temas" plano. cada uma:
   - nome: rótulo poético do grupo (ex: "os que querem ensinar de outro jeito")
   - count: quantas pessoas
   - ancoras: 2-3 nicknames representativos (não todos)
   - une: 1 frase do que conecta esse grupo
   - provocacao: 1 pergunta provocativa pra esse grupo levar pros 2 dias

7. energias (3-4): "vibes" que movem a turma com peso somando 100. ex: [{label:"construir pra resolver dor pessoal", peso:55}, ...]

8. mascote_candidatos: 3 animais distintos, cada um capturando UM ângulo diferente da turma (não 3 variações do mesmo bicho). evita "leão", "águia", "lobo". prefere coisas curiosas e brasileiras quando fizer sentido: "polvo", "joão-de-barro", "capivara", "ema", "tatu-bola", "siri", "bicho-preguiça", "tucano", "saracura", "quati", "bem-te-vi", "cupim", "formiga-cortadeira", "abelha-jataí". cada candidato tem:
   - nome: animal único
   - por_que: 2-3 frases tom frattz conectando comportamento do animal a 2-3 traços específicos da turma
   - tracos: 3-5 tags curtas (ex: ["curioso", "noturno", "coletivo"])
   - prompt_visual: descrição visual do animal de 1-2 frases pra ilustração editorial. foca pose, expressão, atributo característico. nada de cenário ou cor (paleta vem por fora).

9. top_cities: 6-10 cidades com contagem real`;

const TOOL = {
  type: "function",
  function: {
    name: "save_analysis",
    description: "Salva análise etnográfica completa da turma",
    parameters: {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              user_id: { type: "string" },
              theme_primary: { type: "string" },
              theme_tags: { type: "array", items: { type: "string" } },
            },
            required: ["user_id", "theme_primary", "theme_tags"],
            additionalProperties: false,
          },
        },
        aggregates: {
          type: "object",
          properties: {
            manchete: { type: "string" },
            subtitulo: { type: "string" },
            paradoxos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  explicacao: { type: "string" },
                },
                required: ["titulo", "explicacao"],
                additionalProperties: false,
              },
            },
            observacoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string", enum: ["padrao", "tensao", "cluster", "outlier"] },
                  titulo: { type: "string" },
                  insight: { type: "string" },
                  evidencia: { type: "string" },
                },
                required: ["tipo", "titulo", "insight"],
                additionalProperties: false,
              },
            },
            constelacoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  count: { type: "integer" },
                  ancoras: { type: "array", items: { type: "string" } },
                  une: { type: "string" },
                  provocacao: { type: "string" },
                },
                required: ["nome", "count", "ancoras", "une", "provocacao"],
                additionalProperties: false,
              },
            },
            energias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  peso: { type: "integer" },
                },
                required: ["label", "peso"],
                additionalProperties: false,
              },
            },
            mascote_candidatos: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  por_que: { type: "string" },
                  tracos: { type: "array", items: { type: "string" } },
                  prompt_visual: { type: "string" },
                },
                required: ["nome", "por_que", "tracos", "prompt_visual"],
                additionalProperties: false,
              },
            },
            top_cities: {
              type: "array",
              items: {
                type: "object",
                properties: { city: { type: "string" }, count: { type: "integer" } },
                required: ["city", "count"],
                additionalProperties: false,
              },
            },
          },
          required: [
            "manchete",
            "subtitulo",
            "paradoxos",
            "observacoes",
            "constelacoes",
            "energias",
            "mascote_candidatos",
            "top_cities",
          ],
          additionalProperties: false,
        },
      },
      required: ["users", "aggregates"],
      additionalProperties: false,
    },
  },
};

// ---------- ai helpers ----------

async function callAIOnce(apiKey: string, userPrompt: string): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "save_analysis" } },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`ai gateway ${res.status}: ${txt.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.error("[analyze-turma] sem tool call:", JSON.stringify(json).slice(0, 400));
    throw new Error("ia não retornou tool call");
  }
  return JSON.parse(args);
}

async function callAI(apiKey: string, userPrompt: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callAIOnce(apiKey, userPrompt);
    } catch (e) {
      lastErr = e;
      const status = (e as any)?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
      const wait = (attempt + 1) * 2500;
      console.warn(`[analyze-turma] retry ${attempt + 1} após erro:`, e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// ---------- mascote: gerar imagem + upload ----------

const MASCOT_STYLE_PROMPT = `ilustração editorial chapada do animal {ANIMAL}, estilo brasileiro y2k bauhaus minimalista. paleta restrita: fundo bege quente #f2e4d8, traço preto firme #090909, accents em laranja #fe7b02, vermelho #fd4644, rosa #f756a6, azul #6f77fc. composição centralizada, animal de corpo inteiro ou busto, sem texto, sem sombras realistas, sem fotorrealismo, vibe poster cultural perestroika anos 2000. {VISUAL}`;

async function generateMascotImage(apiKey: string, animal: string, visualHint: string): Promise<string | null> {
  const prompt = MASCOT_STYLE_PROMPT
    .replace("{ANIMAL}", animal)
    .replace("{VISUAL}", visualHint || "");
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.warn(`[analyze-turma] image gen falhou ${res.status}:`, (await res.text()).slice(0, 200));
      return null;
    }
    const json = await res.json();
    const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) {
      console.warn("[analyze-turma] sem imagem na resposta");
      return null;
    }
    return dataUrl;
  } catch (e) {
    console.warn("[analyze-turma] erro image gen:", e instanceof Error ? e.message : e);
    return null;
  }
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("data url inválida");
  const contentType = match[1];
  const b64 = match[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType };
}

async function uploadMascotImage(
  admin: ReturnType<typeof createClient>,
  dataUrl: string,
  animal: string,
): Promise<string | null> {
  try {
    const { bytes, contentType } = dataUrlToBytes(dataUrl);
    const slug = animal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mascote";
    const fileName = `${slug}-${Date.now()}.png`;
    const { error } = await admin.storage.from(MASCOT_BUCKET).upload(fileName, bytes, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn("[analyze-turma] upload falhou:", error.message);
      return null;
    }
    const { data } = admin.storage.from(MASCOT_BUCKET).getPublicUrl(fileName);
    return data.publicUrl ?? null;
  } catch (e) {
    console.warn("[analyze-turma] erro upload:", e instanceof Error ? e.message : e);
    return null;
  }
}

// ---------- match scoring ----------

interface ParticipantLite {
  user_id: string;
  nickname: string | null;
  archetype: string | null;
  cidade: string | null;
  experiencia_lovable: string | null;
  desafio: string | null;
  theme_primary: string;
  theme_tags: string[];
}

const EXP_RANK: Record<string, number> = {
  "nunca-usei": 0,
  "ja-mexi": 1,
  "ja-publiquei": 2,
  "uso-diario": 3,
};

function tagOverlap(a: string[], b: string[]): number {
  const setB = new Set(b.map((t) => t.toLowerCase()));
  let n = 0;
  for (const t of a) if (setB.has(t.toLowerCase())) n++;
  return n;
}

function buildReason(focus: ParticipantLite, peer: ParticipantLite): string {
  const sameTheme = focus.theme_primary && peer.theme_primary && focus.theme_primary === peer.theme_primary;
  const overlap = tagOverlap(focus.theme_tags, peer.theme_tags);
  const sameCity = focus.cidade && peer.cidade && focus.cidade.trim().toLowerCase() === peer.cidade.trim().toLowerCase();
  const diffArch = focus.archetype && peer.archetype && focus.archetype !== peer.archetype;
  const fExp = EXP_RANK[focus.experiencia_lovable ?? ""] ?? 0;
  const pExp = EXP_RANK[peer.experiencia_lovable ?? ""] ?? 0;
  const expGap = pExp - fExp;

  if (sameTheme) return `mesmo tema central (${focus.theme_primary}), troca direta de referência`;
  if (overlap >= 2) {
    return `tags em comum: ${focus.theme_tags.filter((t) => peer.theme_tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())).slice(0, 2).join(", ")}`;
  }
  if (expGap >= 2) return `tem mais estrada no lovable, pode te destravar onde tu trava`;
  if (expGap <= -2) return `tu pode destravar quem tá começando, prática vira aula`;
  if (diffArch && peer.archetype) return `arquétipo ${peer.archetype.toLowerCase()} complementa o teu, ângulo diferente`;
  if (sameCity) return `mesma cidade (${peer.cidade}), conexão que continua depois do evento`;
  return `perfil curioso pra trocar, vale puxar conversa`;
}

function scoreMatch(focus: ParticipantLite, peer: ParticipantLite): number {
  let s = 0;
  if (focus.theme_primary && focus.theme_primary === peer.theme_primary) s += 5;
  s += tagOverlap(focus.theme_tags, peer.theme_tags) * 2;
  if (focus.archetype && peer.archetype && focus.archetype !== peer.archetype) s += 1;
  const fExp = EXP_RANK[focus.experiencia_lovable ?? ""] ?? 0;
  const pExp = EXP_RANK[peer.experiencia_lovable ?? ""] ?? 0;
  s += Math.min(2, Math.abs(pExp - fExp));
  if (focus.cidade && peer.cidade && focus.cidade.trim().toLowerCase() === peer.cidade.trim().toLowerCase()) s += 1;
  const seed = (focus.user_id + peer.user_id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  s += (seed % 7) * 0.01;
  return s;
}

// ---------- persistência ----------

async function saveInsight(
  admin: ReturnType<typeof createClient>,
  row: {
    scope: "global" | "user";
    user_id: string | null;
    theme_primary?: string | null;
    theme_tags?: string[];
    matches?: unknown[];
    aggregates?: unknown;
  },
): Promise<{ ok: boolean; error?: string }> {
  const query = admin.from("hub_insights").select("id").eq("scope", row.scope);
  const finalQuery = row.scope === "user" ? query.eq("user_id", row.user_id!) : query.is("user_id", null);
  const { data: existing, error: selErr } = await finalQuery.maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };

  const payload: Record<string, unknown> = {
    scope: row.scope,
    user_id: row.user_id,
    generated_at: new Date().toISOString(),
  };
  if (row.theme_primary !== undefined) payload.theme_primary = row.theme_primary;
  if (row.theme_tags !== undefined) payload.theme_tags = row.theme_tags;
  if (row.matches !== undefined) payload.matches = row.matches;
  if (row.aggregates !== undefined) payload.aggregates = row.aggregates;

  if (existing?.id) {
    const { error } = await admin.from("hub_insights").update(payload).eq("id", existing.id);
    return { ok: !error, error: error?.message };
  }
  const { error } = await admin.from("hub_insights").insert(payload);
  return { ok: !error, error: error?.message };
}

// ---------- main ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. monta payload (cards publicadas + dados de profile/fbi)
    const { data: cards } = await admin
      .from("builder_cards")
      .select("user_id, archetype, tagline, essence_phrase")
      .eq("is_published", true)
      .eq("status", "pronta");

    if (!cards?.length) {
      return new Response(JSON.stringify({ error: "nenhuma carta publicada ainda" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = cards.map((c) => c.user_id);

    const [{ data: profiles }, { data: fbis }] = await Promise.all([
      admin.from("profiles").select("user_id, nickname, cidade").in("user_id", userIds),
      admin
        .from("fbi_responses")
        .select(
          "user_id, experiencia_lovable, trabalho, expectativa_chora, maior_desafio, ideia_gaveta, ultima_criacao_orgulho, perde_nocao_tempo",
        )
        .in("user_id", userIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const fbiMap = new Map((fbis ?? []).map((f) => [f.user_id, f]));

    const trim = (s: string | null | undefined, n = 300) => (s ? s.slice(0, n) : null);

    const aiInput = cards.map((c) => {
      const p = profileMap.get(c.user_id);
      const f = fbiMap.get(c.user_id);
      return {
        user_id: c.user_id,
        nickname: p?.nickname ?? null,
        cidade: p?.cidade ?? null,
        archetype: c.archetype,
        experiencia_lovable: f?.experiencia_lovable ?? null,
        trabalho: trim(f?.trabalho, 120),
        expectativa: trim(f?.expectativa_chora, 300),
        desafio: trim(f?.maior_desafio, 300),
        ideia: trim(f?.ideia_gaveta, 300),
        orgulho: trim(f?.ultima_criacao_orgulho, 250),
        flow: trim(f?.perde_nocao_tempo, 200),
        tagline: trim(c.tagline, 140),
        essencia: trim(c.essence_phrase, 160),
      };
    });

    console.log(`[analyze-turma] processando ${aiInput.length} participantes`);
    const validUserIds = new Set(userIds);

    // 2. chamada única à IA
    const aiPrompt = `${aiInput.length} participantes. material etnográfico bruto:\n\n${JSON.stringify(aiInput)}\n\nresponde via tool call save_analysis com análise editorial profunda. lembra: nada óbvio, cruza dimensões, cita evidências curtas.`;
    const aiResult = await callAI(LOVABLE_API_KEY, aiPrompt);
    console.log("[analyze-turma] ia ok");

    const aggregates: any = aiResult.aggregates ?? null;
    const themeByUser = new Map<string, { theme_primary: string; theme_tags: string[] }>();
    for (const u of aiResult.users ?? []) {
      if (validUserIds.has(u.user_id)) {
        themeByUser.set(u.user_id, {
          theme_primary: u.theme_primary ?? "",
          theme_tags: Array.isArray(u.theme_tags) ? u.theme_tags : [],
        });
      }
    }

    // 3. gera imagem dos 3 candidatos em paralelo (best-effort)
    const candidatos: Array<{ nome: string; por_que: string; tracos: string[]; prompt_visual: string; image_url?: string }> =
      Array.isArray(aggregates?.mascote_candidatos) ? aggregates.mascote_candidatos.slice(0, 3) : [];

    if (candidatos.length > 0) {
      console.log(`[analyze-turma] gerando ${candidatos.length} mascotes em paralelo`);
      const results = await Promise.all(
        candidatos.map(async (c) => {
          const dataUrl = await generateMascotImage(LOVABLE_API_KEY, c.nome, c.prompt_visual ?? "");
          if (!dataUrl) return null;
          return await uploadMascotImage(admin, dataUrl, c.nome);
        }),
      );
      results.forEach((url, i) => {
        if (url) candidatos[i].image_url = url;
      });
      aggregates.mascote_candidatos = candidatos;
      // primeiro candidato vira o "oficial" provisório; vira definitivo só depois da votação da turma
      aggregates.mascote_selected_index = 0;
      // votação começa fechada; admin abre quando quiser disparar pra turma
      aggregates.voting_status = "fechada";
      delete aggregates.voting_opened_at;
      delete aggregates.voting_closed_at;
      delete aggregates.voting_final_tally;
      console.log(`[analyze-turma] mascotes gerados: ${results.filter(Boolean).length}/${candidatos.length}`);
    }

    // 4. salva agregados globais
    if (aggregates) {
      const r = await saveInsight(admin, { scope: "global", user_id: null, aggregates });
      if (!r.ok) console.error("[analyze-turma] erro global:", r.error);
      else console.log("[analyze-turma] global salvo");
    }

    // 5. lista enriquecida pra scoring
    const enriched: ParticipantLite[] = aiInput.map((p) => {
      const t = themeByUser.get(p.user_id);
      return {
        user_id: p.user_id,
        nickname: p.nickname,
        archetype: p.archetype,
        cidade: p.cidade,
        experiencia_lovable: p.experiencia_lovable,
        desafio: p.desafio,
        theme_primary: t?.theme_primary ?? "",
        theme_tags: t?.theme_tags ?? [],
      };
    });

    // 6. salva insight por user com matches
    let okCount = 0;
    let errCount = 0;
    for (const focus of enriched) {
      const ranked = enriched
        .filter((p) => p.user_id !== focus.user_id)
        .map((peer) => ({ peer, score: scoreMatch(focus, peer) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MATCHES_PER_USER);

      const matches = ranked.map(({ peer }) => ({
        user_id: peer.user_id,
        reason: buildReason(focus, peer),
      }));

      const r = await saveInsight(admin, {
        scope: "user",
        user_id: focus.user_id,
        theme_primary: focus.theme_primary || null,
        theme_tags: focus.theme_tags,
        matches,
      });
      if (r.ok) okCount++;
      else {
        errCount++;
        console.error(`[analyze-turma] erro user ${focus.user_id}: ${r.error}`);
      }
    }

    console.log(`[analyze-turma] concluído · ${okCount} ok · ${errCount} erros`);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: enriched.length,
        saved: okCount,
        errors: errCount,
        global_saved: Boolean(aggregates),
        mascote_candidatos: aggregates?.mascote_candidatos?.length ?? 0,
        mascotes_com_imagem: (aggregates?.mascote_candidatos ?? []).filter((c: any) => c.image_url).length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[analyze-turma] erro fatal:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
