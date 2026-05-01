// edge function: gera carta de arquétipo de builder via lovable ai (gemini 3.1 pro)
// admin pode chamar pelo dashboard (com user_id) OU outra edge function pode chamar
// com service role + invited_participant_id (caso submit público).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { detectGender, genderLabel, type Gender } from "../_shared/gender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS_FALLBACK = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
];

const SYSTEM_PROMPT = `Você é o frattz escrevendo uma carta curta pra um aluno do Chŏra Lovable, imersão de 2 dias em Porto Alegre sobre construir com IA usando Lovable.

Sua missão: ler as respostas do FBI desse aluno, identificar qual dos 6 arquétipos de builder ele é, e escrever uma carta de 60 a 100 palavras no meu tom de voz.

═══════════════════════════════════════════
OS 6 ARQUÉTIPOS DE BUILDER
═══════════════════════════════════════════

💫 VISIONÁRIO
Vê o mapa antes do terreno existir. Pensa em sistema, conexões, implicações de longo prazo. Sinais nas respostas: fala em "futuro", "transformar indústria", "mudar como as pessoas X", ideias grandes e ainda nebulosas, mais conceito que execução.
Sombra: paralisia por escala, dificuldade de começar pequeno.

🎨 ARTESÃO
Obsessivo por detalhe e acabamento. Cada pixel importa. Sinais: fala em "fazer bem feito", menciona ofício, refinamento, qualidade, estética. Tem orgulho de coisa pequena e bem polida. Background em design, escrita, música, artes.
Sombra: perfeccionismo que trava lançamento.

🧪 EXPERIMENTADOR
10 MVPs por mês, aprende fazendo. Sinais: já tentou várias coisas, fala em "testar", "ver no que dá", lista projetos curtos, gaveta cheia de ideias soltas. Pouco apego ao que cria.
Sombra: dispersão, nada chega ao fim.

🌱 CONECTOR
Constrói pra juntar gente. Sinais: trabalha com comunidade, eventos, educação, ONG. Fala em "ajudar pessoas", "conectar", "facilitar". Ideia na gaveta envolve outras pessoas no centro.
Sombra: esquece de si, vira ponte sem virar autor.

🔧 PRAGMÁTICO
Resolve dor real, sua ou de cliente direto. Sinais: descreve problema concreto do dia a dia, processo manual chato, planilha que vira ferramenta. Trabalho atual em ops, gestão, atendimento.
Sombra: pensa pequeno demais, não enxerga produto além do próprio nariz.

📖 NARRADOR
Constrói pra contar história. Sinais: background em conteúdo, marketing, jornalismo, audiovisual. Fala em "comunicar", "história", "audiência". Ideia na gaveta tem narrativa antes de ter produto.
Sombra: capricha no pitch e esquece de fazer a coisa funcionar.

═══════════════════════════════════════════
COMO ESCOLHER O ARQUÉTIPO
═══════════════════════════════════════════

Lê as respostas inteiras. Procura padrão recorrente entre:
- "última coisa que criou com orgulho"
- "ideia na gaveta"
- "o que te faz perder noção do tempo"
- "trabalho atual"
- "maior desafio"

Escolhe UM só, o mais forte. Se ficar entre dois, vai no que aparece em mais respostas. Nunca devolva "misto" ou dois arquétipos.

═══════════════════════════════════════════
ESTRUTURA DA CARTA (60 a 100 palavras)
═══════════════════════════════════════════

oi [nickname],

tu é um(a) [arquétipo] [emoji].

[1 a 2 frases de superpoder. Cita coisa específica que ele respondeu, não genérico. Mostra que você leu mesmo.]

[1 frase de sombra, dita com carinho, não com sermão.]

[1 movimento concreto pra fazer no Chŏra ou na semana antes. Específico, acionável, pequeno.]

vai lá e cria.

ideia boa é ideia construída.

═══════════════════════════════════════════
TOM DE VOZ FRATTZ (não negociável)
═══════════════════════════════════════════

- Tudo lowercase, inclusive início de frase
- Tu, nunca você (segunda pessoa direta, fala de igual pra igual)
- Frases curtas, máximo 2 linhas cada
- ZERO em-dash (—). Usa vírgula ou quebra
- ZERO hashtag
- ZERO corporativês ("prezado", "espero que", "fico à disposição")
- ZERO clichê motivacional ("acredite em você", "o céu é o limite")
- Só 1 emoji na carta inteira: o do arquétipo, na primeira linha
- Cita coisa real que o aluno respondeu, não genérico

═══════════════════════════════════════════
CONCORDÂNCIA DE GÊNERO (não negociável)
═══════════════════════════════════════════

O prompt do usuário vai indicar o gênero gramatical do aluno: feminino, masculino ou neutro.

- feminino: usa flexão feminina em TODOS os adjetivos e substantivos. Ex: "tu é uma artesã", "obsessiva por detalhe", "criadora", "pronta", "tua sombra é ser perfeccionista".
- masculino: usa flexão masculina. Ex: "tu é um artesão", "obsessivo", "criador", "pronto".
- neutro: prefira formas neutras quando possível ("tu é alguém que", "tua mente"); se precisar flexionar, usa masculino genérico, mas nunca misture os dois.

A regra vale pra TODOS os campos: full_text, superpower_text, shadow_text, next_move_text, essence_phrase, tagline. Os labels do arquétipo (visionário/visionária, artesão/artesã, etc.) também devem flexionar.

═══════════════════════════════════════════
EXEMPLOS DE TOM (pra calibrar)
═══════════════════════════════════════════

Bom: "tua ideia da plataforma de mentoria pra mães empreendedoras não é projeto, é missão disfarçada de produto."
Ruim: "Que ideia maravilhosa! Você tem um propósito incrível!"

Bom: "tua sombra é querer que esteja perfeito antes de mostrar. no chŏra, mostra feio mesmo."
Ruim: "Lembre-se: o perfeito é inimigo do bom."

═══════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════

Devolve via tool call com:
- archetype: enum (visionario, artesao, experimentador, conector, pragmatico, narrador)
- emoji: string (1 emoji do arquétipo)
- full_text: string (carta completa, 60-100 palavras, com quebras de linha)
- reasoning: string (1-2 frases internas de por que escolheu esse arquétipo, vai pro admin debugar, não pro aluno)
- essence_phrase: string com 4 a 8 palavras destilando quem o aluno é, em lowercase, no tom frattz, baseada nas respostas mais marcantes. Exemplos bons: "transforma processo chato em jogo", "constrói pra mãe ser ouvida". Exemplos ruins: "pessoa criativa e curiosa" (genérico demais).
- tagline: string com 5 a 8 palavras, lowercase, frase de impacto que resume o builder em uma linha — vira o subtítulo da página dele. Tom frattz, provocador, específico. Exemplos: "muda o mundo ou vai pra casa", "cada pixel é decisão política", "10 mvps por mês, todo mês".
- superpower_text: string com 2 parágrafos (separados por \\n\\n) descrevendo o superpoder DESTE aluno especificamente. Primeiro parágrafo: o quê. Segundo: como aparece nas respostas dele. Cita pelo menos 2 respostas reais (palavra-chave). 60 a 100 palavras no total. Tom frattz, lowercase, sem clichê.
- shadow_text: string com 1 parágrafo (40 a 70 palavras) sobre a sombra desse arquétipo aplicada a ESSE aluno. Carinhoso, não sermão. Cita resposta específica se possível.
- next_move_text: string com 1 parágrafo (40 a 70 palavras) com ação concreta pra esse aluno fazer na semana antes do Chŏra (25-26 abril 2026). Específico, acionável, pequeno. Conecta com a "ideia na gaveta" ou "última criação" dele.`;

const ARCHETYPE_EMOJI: Record<string, string> = {
  visionario: "💫",
  artesao: "🎨",
  experimentador: "🧪",
  conector: "🌱",
  pragmatico: "🔧",
  narrador: "📖",
};

const buildUserPrompt = (
  fbi: Record<string, unknown>,
  profile: Record<string, unknown>,
  gender: Gender,
) => `
Aluno: ${profile.nickname ?? fbi.nickname ?? "—"} (${profile.display_name ?? fbi.nome ?? "—"})
Idade: ${fbi.idade ?? "—"}
Trabalho: ${fbi.trabalho ?? "—"}
Gênero gramatical: ${genderLabel(gender)}

Respostas FBI:
- Maior desafio agora: ${fbi.maior_desafio ?? "—"}
- Expectativa do Chŏra: ${fbi.expectativa_chora ?? "—"}
- Experiência Lovable: ${fbi.experiencia_lovable ?? "—"}
- Última coisa criada com orgulho: ${fbi.ultima_criacao_orgulho ?? "—"}
- Ideia na gaveta: ${fbi.ideia_gaveta ?? "—"}
- O que te faz perder noção do tempo: ${fbi.perde_nocao_tempo ?? "—"}
- Bônus: ${fbi.algo_mais ?? "—"}

Escreve a carta usando flexão de gênero ${genderLabel(gender)} em todos os adjetivos e substantivos.
`.trim();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.user_id as string | undefined;
    const invitedParticipantId = body?.invited_participant_id as string | undefined;
    const targetEmail = (body?.email as string | undefined)?.trim().toLowerCase();
    // expand_only: mantém archetype/emoji/full_text/reasoning/essence_phrase originais,
    // só preenche os 4 campos novos (tagline, superpower_text, shadow_text, next_move_text).
    const expandOnly = body?.expand_only === true;

    if (!targetUserId && !invitedParticipantId && !targetEmail) {
      return new Response(JSON.stringify({ error: "user_id, invited_participant_id ou email obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // auth: aceita admin via JWT OU service role direto (function-to-function)
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const isServiceRoleCall = bearer === SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceRoleCall) {
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
      const adminCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: roleCheck } = await adminCheck
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleCheck) {
        return new Response(JSON.stringify({ error: "só admin pode gerar cartas" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // resolve a fbi_response: por user_id, invited_participant_id ou email
    let fbiQuery = admin.from("fbi_responses").select("*").eq("submitted", true);
    if (targetUserId) fbiQuery = fbiQuery.eq("user_id", targetUserId);
    else if (invitedParticipantId) fbiQuery = fbiQuery.eq("invited_participant_id", invitedParticipantId);
    else if (targetEmail) fbiQuery = fbiQuery.eq("email", targetEmail);

    const { data: fbi } = await fbiQuery.maybeSingle();

    if (!fbi) {
      return new Response(JSON.stringify({ error: "fbi não enviado ainda" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // resolve user_id efetivo: pode estar nulo (resposta órfã do form público)
    const effectiveUserId = (fbi.user_id as string | null) ?? null;
    const effectiveInvitedId = (fbi.invited_participant_id as string | null) ?? invitedParticipantId ?? null;

    if (!effectiveUserId && !effectiveInvitedId) {
      return new Response(JSON.stringify({ error: "fbi sem user_id nem invited_participant_id, impossível salvar carta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // builder_cards.user_id é NOT NULL. se não tem user_id ainda, usa invited_participant_id como placeholder
    // (quando a pessoa logar, trigger pode reconciliar; mas aqui priorizamos user_id real)
    const cardUserId = effectiveUserId ?? effectiveInvitedId!;

    // profile (pode não existir se ainda não logou)
    const { data: profile } = effectiveUserId
      ? await admin.from("profiles").select("*").eq("user_id", effectiveUserId).maybeSingle()
      : { data: null };

    // invited (pra ter o nome real quando profile ainda não existe — fluxo público)
    const { data: invited } = effectiveInvitedId
      ? await admin.from("invited_participants").select("name, nickname").eq("id", effectiveInvitedId).maybeSingle()
      : { data: null };

    // detecta gênero a partir do melhor nome disponível (display_name > invited.name > fbi.nome > nickname)
    const nameForGender =
      (profile?.display_name as string | undefined) ??
      (invited?.name as string | undefined) ??
      (fbi.nome as string | undefined) ??
      (profile?.nickname as string | undefined) ??
      (invited?.nickname as string | undefined) ??
      (fbi.nickname as string | undefined) ??
      null;
    const gender: Gender = detectGender(nameForGender);
    console.log(`[generate-builder-card] gender detectado=${gender} from name="${nameForGender}"`);

    // marca como gerando
    await admin.from("builder_cards").upsert(
      {
        user_id: cardUserId,
        status: "gerando",
        error_message: null,
        model: MODELS_FALLBACK[0],
      },
      { onConflict: "user_id" },
    );

    const userPromptText = buildUserPrompt(
      fbi as Record<string, unknown>,
      (profile ?? {}) as Record<string, unknown>,
      gender,
    );

    const callModel = async (model: string) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPromptText },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_builder_card",
                description: "Salva a carta de arquétipo do builder.",
                parameters: {
                  type: "object",
                  properties: {
                    archetype: {
                      type: "string",
                      enum: ["visionario", "artesao", "experimentador", "conector", "pragmatico", "narrador"],
                    },
                    emoji: { type: "string" },
                    full_text: { type: "string" },
                    reasoning: { type: "string" },
                    essence_phrase: { type: "string" },
                    tagline: { type: "string" },
                    superpower_text: { type: "string" },
                    shadow_text: { type: "string" },
                    next_move_text: { type: "string" },
                  },
                  required: [
                    "archetype",
                    "emoji",
                    "full_text",
                    "reasoning",
                    "essence_phrase",
                    "tagline",
                    "superpower_text",
                    "shadow_text",
                    "next_move_text",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "save_builder_card" } },
        }),
      });
      return resp;
    };

    let parsed: {
      archetype: string;
      emoji?: string;
      full_text: string;
      reasoning: string;
      essence_phrase?: string;
      tagline?: string;
      superpower_text?: string;
      shadow_text?: string;
      next_move_text?: string;
    } | null = null;
    let usedModel = MODELS_FALLBACK[0];
    let lastError = "";
    let lastStatus = 0;

    for (const model of MODELS_FALLBACK) {
      usedModel = model;
      try {
        const aiResp = await callModel(model);
        lastStatus = aiResp.status;

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`[generate-builder-card] ${model} http ${aiResp.status}:`, errText);
          lastError = `gateway ${aiResp.status}`;
          // 429/402 são fatais (rate/credit), aborta cadeia
          if (aiResp.status === 429 || aiResp.status === 402) break;
          continue;
        }

        const aiJson = await aiResp.json();
        // detecta erro mid-stream do provedor (ex: gemini preview cai com network lost)
        const choice = aiJson?.choices?.[0];
        const providerErr = choice?.error;
        if (providerErr) {
          console.error(`[generate-builder-card] ${model} provider err:`, providerErr);
          lastError = providerErr.message ?? "provider error";
          continue;
        }

        const toolCall = choice?.message?.tool_calls?.[0];
        const argsRaw = toolCall?.function?.arguments;
        if (!argsRaw) {
          console.error(`[generate-builder-card] ${model} sem tool call:`, JSON.stringify(aiJson).slice(0, 500));
          lastError = "modelo não retornou tool call estruturado";
          continue;
        }

        parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
        break;
      } catch (e) {
        console.error(`[generate-builder-card] ${model} exception:`, e);
        lastError = e instanceof Error ? e.message : "erro desconhecido";
        continue;
      }
    }

    if (!parsed) {
      const msg = lastError || "modelo não retornou tool call estruturado";
      await admin
        .from("builder_cards")
        .update({ status: "erro", error_message: msg })
        .eq("user_id", cardUserId);
      return new Response(JSON.stringify({ error: msg }), {
        status: lastStatus === 429 || lastStatus === 402 ? lastStatus : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const archetype = parsed.archetype as string;
    const emoji = (parsed.emoji as string) || ARCHETYPE_EMOJI[archetype] || "💫";
    const full_text = parsed.full_text as string;
    const reasoning = parsed.reasoning as string;
    const essence_phrase = (parsed.essence_phrase ?? "").trim() || null;
    const tagline = (parsed.tagline ?? "").trim() || null;
    const superpower_text = (parsed.superpower_text ?? "").trim() || null;
    const shadow_text = (parsed.shadow_text ?? "").trim() || null;
    const next_move_text = (parsed.next_move_text ?? "").trim() || null;

    // em expand_only mantemos archetype/emoji/full_text/reasoning/essence_phrase originais.
    // só sobrescrevemos os 4 campos novos. assim a classificação não é refeita.
    const updatePayload: Record<string, unknown> = expandOnly
      ? {
          tagline,
          superpower_text,
          shadow_text,
          next_move_text,
          status: "pronta",
          error_message: null,
          generated_at: new Date().toISOString(),
          model: usedModel,
        }
      : {
          archetype,
          emoji,
          full_text,
          reasoning,
          essence_phrase,
          tagline,
          superpower_text,
          shadow_text,
          next_move_text,
          status: "pronta",
          error_message: null,
          generated_at: new Date().toISOString(),
          model: usedModel,
        };

    const { data: saved, error: saveErr } = await admin
      .from("builder_cards")
      .update(updatePayload)
      .eq("user_id", cardUserId)
      .select()
      .single();

    if (saveErr) {
      console.error("[generate-builder-card] save erro:", saveErr);
      throw saveErr;
    }

    return new Response(JSON.stringify({ card: saved }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-builder-card] fatal:", e);
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
