// edge function: chat com o tutor IA "joão-de-barro" por trilha.
// usa lovable AI gateway, sem RAG (só system prompt curto + contexto da trilha).
// salva conversa em tutor_conversations (uma por aluno+trilha).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_MSG = 2000;
const HISTORY_LIMIT = 20;

type ChatMessage = { role: "user" | "assistant"; content: string };

type CourseSlug = "ia-na-pratica" | "economia-circular" | string;

const courseFraming: Record<string, { nome: string; lente: string; educador: string }> = {
  "ia-na-pratica": {
    nome: "ia na prática",
    educador: "frattz",
    lente:
      "essa eletiva é sobre pensar, prototipar e validar soluções reais com ia. tudo termina em um app no ar resolvendo uma dor concreta. quando o estudante hesitar, traga ele de volta pra: qual a dor, quem sente, o que o mvp precisa ter pra responder isso.",
  },
  "economia-circular": {
    nome: "economia circular",
    educador: "dudu",
    lente:
      "essa eletiva é sobre desenhar negócios regenerativos usando a escola sebrae bh como laboratório. quando o estudante hesitar, traga ele de volta pra: qual fluxo você tá olhando, quem participa dele, onde tem desperdício ou oportunidade de regenerar.",
  },
};

const buildSystemPrompt = (ctx: {
  trailTitle: string;
  trailDescription: string | null;
  pblPrompt: string | null;
  courseSlug: CourseSlug | null;
  currentModule: { number: number; title: string; objective: string | null } | null;
  completedModules: { number: number; title: string }[];
  pillPrompt: string | null;
  pillTitle: string | null;
  sessionPills: { title: string; done: boolean }[];
}): string => {
  const completedList = ctx.completedModules.length
    ? ctx.completedModules
        .map((m) => `- módulo ${String(m.number).padStart(2, "0")}: ${m.title}`)
        .join("\n")
    : "(ainda não fechou nenhum módulo dessa trilha)";

  const current = ctx.currentModule
    ? `módulo ${String(ctx.currentModule.number).padStart(2, "0")} — ${ctx.currentModule.title}${
        ctx.currentModule.objective ? `\nobjetivo: ${ctx.currentModule.objective}` : ""
      }`
    : "(nenhum módulo em andamento agora)";

  const sessionBlock = ctx.sessionPills.length
    ? `\n\n## pílulas DESSE módulo (sessão atual)\n\n${ctx.sessionPills
        .map((p) => `${p.done ? "[concluída]" : "[pendente]"} ${p.title}`)
        .join("\n")}\n\nnão re-explique o que tá "[concluída]". referencie pelo nome se precisar.`
    : "";

  const pillBlock = ctx.pillPrompt
    ? `\n\n## EXERCÍCIO ATIVO AGORA (prioridade máxima)\n\no estudante acabou de abrir o exercício "${ctx.pillTitle ?? "sem título"}". segue estas instruções específicas, elas vencem qualquer coisa do system prompt geral:\n\n${ctx.pillPrompt}`
    : "";

  const framing = ctx.courseSlug ? courseFraming[ctx.courseSlug] : null;
  const courseBlock = framing
    ? `\n\n## eletiva\n\nestá na eletiva "${framing.nome}", com o educador ${framing.educador}.\n${framing.lente}`
    : "";

  return `você é o joão-de-barro, tutor ia da nachesu (eletivas naches na escola sebrae bh, 1º ano do ensino médio, estudantes de 14-15 anos).

## quem você é
- um pássaro construtor. seu lema é "vai lá e cria".
- pensa rápido, fala curto, anima sem ser bobo.
- nunca finge entusiasmo. quando algo é bom, diz "isso aí ficou bom". quando algo precisa melhorar, diz onde e como.

## voz (não negociável)
- tudo em minúsculo. sem em-dash, sem hashtag, sem emoji.
- frases curtas. evita parágrafo longo.
- trata por "você", nunca "tu", nunca "prezado".
- nunca usa: "jornada", "destravar" (verbo de produto), "alavancar", "mindset", "ecossistema", "sinergia", "disruptivo", "transformar vidas".
- chama de "estudante" se precisar nomear. nunca "aluno", nunca "usuário", nunca "querido(a)".
- zero corporativês: nada de "espero que esteja bem", "à disposição", "fico no aguardo".
- português do brasil, escrita acessível pra 14-15 anos sem ser infantilizado.

## trilha atual
"${ctx.trailTitle}"${ctx.trailDescription ? `\n${ctx.trailDescription}` : ""}${courseBlock}

${
  ctx.pblPrompt
    ? `## problema central da trilha (pbl)\n\n${ctx.pblPrompt}\n\nseu papel é ajudar o estudante a chegar lá, não entregar resposta pronta. pergunta socrática primeiro, sugere caminho, valida raciocínio, dá exemplo só quando ele já tentou.`
    : "## problema da trilha\n\nainda não tem um problema pbl definido aqui. ajuda com o conteúdo dos módulos e a aplicação prática."
}

## contexto do estudante

módulos que ele já fechou nessa trilha:
${completedList}

módulo atual:
${current}${sessionBlock}

## como responder (regra dura)

formato padrão (3 partes curtas, nessa ordem):
1. uma linha que mostra que você entendeu a dúvida (não repete a pergunta inteira, captura a essência).
2. o conteúdo em si: explica, mostra exemplo, ou faz a pergunta socrática que destrava. no máximo 3 parágrafos curtos.
3. próximo movimento concreto. ex: "tenta reescrever só a primeira frase do prompt e me manda", "abre o módulo 04 e olha a pílula b", "pega 1 fluxo da escola e desenha em 5 minutos".

regras adicionais:
- se ele pedir "me dá a resposta pronta", devolve uma pergunta que destrava + 1 dica mínima.
- se ele perguntar fora do escopo da eletiva, traz de volta com leveza: "isso foge um pouco daqui, mas se importa, me conta em uma frase como conecta com [trilha atual]".
- se ele tiver óbvia confusão sobre um conceito básico, explica em 2 linhas e dá 1 exemplo, sem fazer ele se sentir burro.
- se faltar contexto (algo administrativo, presença, nota, prazo), diz: "isso aí o ${framing?.educador ?? "seu educador"} resolve melhor. fala com ele no encontro presencial ou pelo whats da turma".
- se ele escrever em caps ou agressivo, responda no tom normal, calmo, lowercase. nunca espelha.
- nunca inventa fonte, dado, link ou nome de pessoa. se não souber, diz "não tenho certeza" e propõe como ele pode descobrir.
- nunca diz que é "uma ia" ou "um modelo". você é o joão-de-barro.

## tom em 3 exemplos curtos

❌ "Olá! Que ótima pergunta. Vou te ajudar a destravar essa jornada incrível..."
✅ "boa. o ponto que tá travando é o tamanho do escopo. tenta cortar pela metade."

❌ "Isso é uma estratégia interessante a se considerar..."
✅ "funciona, mas tem um custo. se você fizer assim, perde a evidência de uso real. troca por isso aqui:"

❌ "Espero ter ajudado! Qualquer dúvida estou à disposição."
✅ "próximo passo: escreve 1 frase descrevendo a dor e me manda."${pillBlock}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "login obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const trailId = typeof body?.trail_id === "string" ? body.trail_id : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const pillPrompt = typeof body?.pill_prompt === "string" && body.pill_prompt.trim().length > 0 ? body.pill_prompt : null;
    const pillTitle = typeof body?.pill_title === "string" && body.pill_title.trim().length > 0 ? body.pill_title : null;
    const moduleId = typeof body?.module_id === "string" && body.module_id.length > 0 ? body.module_id : null;

    if (!trailId || message.length < 2) {
      return new Response(
        JSON.stringify({ error: "trail_id e message obrigatórios (mín 2 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (message.length > MAX_MSG) {
      return new Response(
        JSON.stringify({ error: `mensagem maior que ${MAX_MSG} caracteres` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // contexto: trilha + módulos da trilha + progresso do aluno
    const [trailRes, modulesRes, progressRes, convRes] = await Promise.all([
      admin
        .from("trails")
        .select("id, title, description, pbl_prompt")
        .eq("id", trailId)
        .single(),
      admin
        .from("modules")
        .select("id, number, title, objective, trail_id, published, available_from")
        .eq("trail_id", trailId)
        .order("number"),
      admin
        .from("student_module_progress")
        .select("module_id, started_at, completed_at")
        .eq("user_id", userId),
      admin
        .from("tutor_conversations")
        .select("id, messages, title")
        .eq("user_id", userId)
        .eq("trail_id", trailId)
        .maybeSingle(),
    ]);

    if (trailRes.error || !trailRes.data) {
      return new Response(JSON.stringify({ error: "trilha não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trail = trailRes.data;
    const modules = modulesRes.data ?? [];
    const progressByModuleId = new Map<string, { completed_at: string | null; started_at: string | null }>();
    (progressRes.data ?? []).forEach((p) =>
      progressByModuleId.set(p.module_id, { completed_at: p.completed_at, started_at: p.started_at }),
    );

    const completedModules = modules
      .filter((m) => progressByModuleId.get(m.id)?.completed_at)
      .map((m) => ({ number: m.number, title: m.title }));

    // módulo atual = primeiro publicado e disponível com started mas não completed
    const now = Date.now();
    const isAvailable = (m: { published: boolean; available_from: string | null }) =>
      m.published && (!m.available_from || new Date(m.available_from).getTime() <= now);

    const currentModule =
      modules
        .filter(isAvailable)
        .find((m) => {
          const p = progressByModuleId.get(m.id);
          return p?.started_at && !p?.completed_at;
        }) ?? null;

    const activeModuleId = moduleId ?? currentModule?.id ?? null;

    // pílulas da sessão atual: ajuda o tutor a não re-explicar o que o aluno já viu
    let sessionPills: { title: string; done: boolean }[] = [];
    if (activeModuleId) {
      const [sessionPillsRes, donePillsRes] = await Promise.all([
        admin
          .from("module_pills")
          .select("id, title, order_index")
          .eq("module_id", activeModuleId)
          .eq("published", true)
          .order("order_index"),
        admin
          .from("student_pill_progress")
          .select("pill_id")
          .eq("user_id", userId),
      ]);
      const doneSet = new Set<string>(
        (donePillsRes.data ?? []).map((p: { pill_id: string }) => p.pill_id),
      );
      sessionPills = (sessionPillsRes.data ?? []).map((p: { id: string; title: string }) => ({
        title: p.title,
        done: doneSet.has(p.id),
      }));
    }

    const systemPrompt = buildSystemPrompt({
      trailTitle: trail.title,
      trailDescription: trail.description,
      pblPrompt: trail.pbl_prompt,
      currentModule: currentModule
        ? { number: currentModule.number, title: currentModule.title, objective: currentModule.objective }
        : null,
      completedModules,
      pillPrompt,
      pillTitle,
      sessionPills,
    });

    const history = (convRes.data?.messages ?? []) as ChatMessage[];
    const trimmedHistory = history.slice(-HISTORY_LIMIT);
    const existingTitle = (convRes.data as { title?: string | null } | null)?.title ?? null;

    // título curto a partir da primeira mensagem do aluno (gerado uma única vez)
    const buildTitle = (raw: string): string => {
      const clean = raw.replace(/\s+/g, " ").trim();
      if (clean.length <= 60) return clean || "conversa sem título";
      const cut = clean.slice(0, 60);
      const lastSpace = cut.lastIndexOf(" ");
      return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
    };
    const titleToPersist = existingTitle && existingTitle.trim().length > 0
      ? existingTitle
      : buildTitle(message);

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
      { role: "user", content: message },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messagesForAI,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "muitas perguntas em sequência, espera uns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "créditos da ia esgotados, avisa a equipe." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiRes.text();
      console.error("ai gateway:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ia falhou" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // proxy streaming + capturar texto pra persistir no fim
    const reader = aiRes.body!.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            controller.enqueue(value);

            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nl).replace(/\r$/, "");
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) assistantText += delta;
              } catch {
                // ignora JSON parcial
              }
            }
          }
        } finally {
          if (assistantText.trim()) {
            const newMessages: ChatMessage[] = [
              ...history,
              { role: "user", content: message },
              { role: "assistant", content: assistantText },
            ];
            // mantém histórico no banco enxuto (últimas 40 trocas)
            const trimmed = newMessages.slice(-80);
            const nowIso = new Date().toISOString();
            await admin.from("tutor_conversations").upsert(
              {
                user_id: userId,
                trail_id: trailId,
                messages: trimmed,
                title: titleToPersist,
                updated_at: nowIso,
              },
              { onConflict: "user_id,trail_id" },
            );
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tutor-trail-chat:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
