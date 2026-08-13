// painel-escola: endpoint único (service role) que alimenta a página pública
// /acompanhamento, protegida por senha simples (secret PAINEL_ESCOLA_SENHA).
//
// Regras duras:
// - somente leitura, nenhum dado é alterado
// - nunca devolve e-mail, user_id, telefone ou conteúdo de entrega
// - rate limit por IP via RPC check_rate_limit (tabela rate_limit_counters)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, clientIp, tooManyRequests } from "../_shared/rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SENHA = Deno.env.get("PAINEL_ESCOLA_SENHA") ?? "";

const COURSES = [
  { id: "c0a00000-0000-0000-0000-000000000002", slug: "economia-circular" },
  { id: "c0a00000-0000-0000-0000-000000000001", slug: "ia-na-pratica" },
];

const json = (cors: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** comparação de tempo constante (evita timing attack na senha) */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  const len = Math.max(x.length, y.length, 1);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

type Client = ReturnType<typeof createClient>;

/** pagina resultados pra passar do limite padrão de 1000 linhas do PostgREST */
async function fetchAll<T = Record<string, unknown>>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const page = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build(from, from + page - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

const maxDate = (...vals: (string | null | undefined)[]) => {
  let best: string | null = null;
  for (const v of vals) {
    if (!v) continue;
    if (!best || v > best) best = v;
  }
  return best;
};

const DAY = 24 * 60 * 60 * 1000;

async function buildCourse(admin: Client, courseId: string) {
  // trilhas -> módulos -> pílulas do curso
  const trails = await fetchAll<{ id: string }>((f, t) =>
    admin.from("trails").select("id").eq("course_id", courseId).range(f, t),
  );
  const trailIds = trails.map((r) => r.id);

  const allModules = trailIds.length
    ? await fetchAll<{ id: string; number: number; published: boolean }>((f, t) =>
        admin.from("modules").select("id, number, published").in("trail_id", trailIds).range(f, t),
      )
    : [];
  // só módulo publicado entra na conta: é o que o estudante realmente consegue fazer
  const modules = allModules.filter((m) => m.published);
  const moduleIds = modules.map((m) => m.id);
  const moduleNumber = new Map(modules.map((m) => [m.id, m.number]));
  const publishedCount = modules.length;

  const pills = moduleIds.length
    ? await fetchAll<{ id: string }>((f, t) =>
        admin.from("module_pills").select("id").in("module_id", moduleIds).range(f, t),
      )
    : [];
  const pillIds = new Set(pills.map((p) => p.id));
  const pillsTotal = pillIds.size;


  // lista base: convites do curso (inclui quem nunca entrou)
  const invites = await fetchAll<{
    email_normalized: string;
    claimed_at: string | null;
    claimed_by: string | null;
  }>((f, t) =>
    admin
      .from("course_invites")
      .select("email_normalized, claimed_at, claimed_by")
      .eq("course_id", courseId)
      .range(f, t),
  );

  const roster = await fetchAll<{
    email_normalized: string;
    full_name: string | null;
    turma: string | null;
  }>((f, t) =>
    admin.from("student_roster").select("email_normalized, full_name, turma").range(f, t),
  );
  const rosterByEmail = new Map(roster.map((r) => [r.email_normalized.toLowerCase(), r]));

  const userIds = [...new Set(invites.map((i) => i.claimed_by).filter(Boolean))] as string[];

  const profiles = userIds.length
    ? await fetchAll<{ user_id: string; display_name: string | null; is_test: boolean }>((f, t) =>
        admin
          .from("profiles")
          .select("user_id, display_name, is_test")
          .in("user_id", userIds)
          .range(f, t),
      )
    : [];
  const profileByUser = new Map(profiles.map((p) => [p.user_id, p]));

  const chunk = <T,>(arr: T[], n = 200) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  const modProgress: {
    user_id: string;
    module_id: string;
    started_at: string | null;
    completed_at: string | null;
  }[] = [];
  const pillProgress: { user_id: string; pill_id: string; completed_at: string | null }[] = [];
  const deliverables: {
    user_id: string;
    module_id: string;
    submitted_at: string | null;
    updated_at: string | null;
  }[] = [];
  const access: { user_id: string; last_seen_at: string }[] = [];

  for (const ids of chunk(moduleIds)) {
    modProgress.push(
      ...(await fetchAll<(typeof modProgress)[number]>((f, t) =>
        admin
          .from("student_module_progress")
          .select("user_id, module_id, started_at, completed_at")
          .in("module_id", ids)
          .range(f, t),
      )),
    );
    deliverables.push(
      ...(await fetchAll<(typeof deliverables)[number]>((f, t) =>
        admin
          .from("module_deliverables")
          .select("user_id, module_id, submitted_at, updated_at")
          .in("module_id", ids)
          .range(f, t),
      )),
    );
  }

  for (const ids of chunk([...pillIds])) {
    pillProgress.push(
      ...(await fetchAll<(typeof pillProgress)[number]>((f, t) =>
        admin
          .from("student_pill_progress")
          .select("user_id, pill_id, completed_at")
          .in("pill_id", ids)
          .range(f, t),
      )),
    );
  }

  for (const ids of chunk(userIds)) {
    access.push(
      ...(await fetchAll<(typeof access)[number]>((f, t) =>
        admin
          .from("user_access_log")
          .select("user_id, last_seen_at")
          .in("user_id", ids)
          .range(f, t),
      )),
    );
  }

  type Agg = {
    concluidos: number;
    ultimoModulo: number | null;
    pilulas: number;
    entregas: number;
    ultimo: string | null;
  };
  const agg = new Map<string, Agg>();
  const get = (uid: string): Agg => {
    let a = agg.get(uid);
    if (!a) {
      a = { concluidos: 0, ultimoModulo: null, pilulas: 0, entregas: 0, ultimo: null };
      agg.set(uid, a);
    }
    return a;
  };

  for (const r of modProgress) {
    const a = get(r.user_id);
    if (r.completed_at) a.concluidos += 1;
    const n = moduleNumber.get(r.module_id) ?? null;
    if (n !== null && (a.ultimoModulo === null || n > a.ultimoModulo)) a.ultimoModulo = n;
    a.ultimo = maxDate(a.ultimo, r.completed_at, r.started_at);
  }
  for (const r of pillProgress) {
    if (!r.completed_at) continue;
    const a = get(r.user_id);
    a.pilulas += 1;
    a.ultimo = maxDate(a.ultimo, r.completed_at);
  }

  for (const r of deliverables) {
    const a = get(r.user_id);
    if (r.submitted_at) a.entregas += 1;
    a.ultimo = maxDate(a.ultimo, r.updated_at);
  }
  for (const r of access) {
    const a = get(r.user_id);
    a.ultimo = maxDate(a.ultimo, r.last_seen_at);
  }

  const now = Date.now();
  const alunos = invites
    .map((inv) => {
      const email = (inv.email_normalized ?? "").toLowerCase();
      const rost = rosterByEmail.get(email);
      const prof = inv.claimed_by ? profileByUser.get(inv.claimed_by) : null;
      if (prof?.is_test) return null;

      // convite sem estudante identificável (fora do cadastro da escola e sem perfil
      // com nome) não entra no relatório da coordenação: seria linha fantasma
      const nome = rost?.full_name?.trim() || prof?.display_name?.trim() || "";
      if (!nome) return null;


      const a = inv.claimed_by ? agg.get(inv.claimed_by) : undefined;
      const concluidos = Math.min(a?.concluidos ?? 0, publishedCount || (a?.concluidos ?? 0));
      const pilulas = Math.min(a?.pilulas ?? 0, pillsTotal || (a?.pilulas ?? 0));
      const ultimo = a?.ultimo ?? null;
      const entrou = !!inv.claimed_at;
      const ativo7d = !!ultimo && now - new Date(ultimo).getTime() <= 7 * DAY;

      let status:
        | "nao_entrou"
        | "entrou_sem_comecar"
        | "em_andamento"
        | "parado"
        | "concluiu";
      if (!entrou) status = "nao_entrou";
      else if (concluidos === 0 && pilulas === 0) status = "entrou_sem_comecar";
      else if (publishedCount > 0 && concluidos >= publishedCount) status = "concluiu";
      else if (ultimo && now - new Date(ultimo).getTime() > 14 * DAY) status = "parado";
      else status = "em_andamento";

      return {
        nome,
        turma: rost?.turma ?? null,
        entrou,
        modulos_concluidos: concluidos,
        pct: publishedCount > 0 ? Math.round((concluidos / publishedCount) * 100) : 0,
        ultimo_modulo: a?.ultimoModulo ?? null,
        pilulas_concluidas: pilulas,
        entregas_enviadas: a?.entregas ?? 0,
        ultimo_acesso: ultimo,
        ativo_7d: ativo7d,
        status,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const count = (s: string) => alunos.filter((a) => a.status === s).length;
  const turmas = new Map<
    string,
    {
      turma: string;
      total: number;
      entraram: number;
      nao_entraram: number;
      em_andamento: number;
      parados: number;
      ativos_7d: number;
      media_modulos: number;
    }
  >();
  for (const al of alunos) {
    const key = (al.turma as string) || "sem turma";
    let t = turmas.get(key);
    if (!t) {
      t = {
        turma: key,
        total: 0,
        entraram: 0,
        nao_entraram: 0,
        em_andamento: 0,
        parados: 0,
        ativos_7d: 0,
        media_modulos: 0,
      };
      turmas.set(key, t);
    }
    t.total += 1;
    if (al.entrou) t.entraram += 1;
    else t.nao_entraram += 1;
    if (al.status === "em_andamento") t.em_andamento += 1;
    if (al.status === "parado") t.parados += 1;
    if (al.ativo_7d) t.ativos_7d += 1;
    t.media_modulos += al.modulos_concluidos as number;
  }
  for (const t of turmas.values()) {
    t.media_modulos = t.total ? Number((t.media_modulos / t.total).toFixed(1)) : 0;
  }

  const somaConcluidos = alunos.reduce((s, a) => s + (a.modulos_concluidos as number), 0);

  return {
    alunos,
    resumo: {
      convidados: alunos.length,
      entraram: alunos.filter((a) => a.entrou).length,
      nunca_entraram: count("nao_entrou"),
      entrou_sem_comecar: count("entrou_sem_comecar"),
      em_andamento: count("em_andamento"),
      parados: count("parado"),
      concluiram: count("concluiu"),
      ativos_7d: alunos.filter((a) => a.ativo_7d).length,
      media_modulos: alunos.length ? Number((somaConcluidos / alunos.length).toFixed(1)) : 0,
      modulos_publicados: publishedCount,
      pilulas_publicadas: pillsTotal,
      por_turma: [...turmas.values()].sort((a, b) => a.turma.localeCompare(b.turma)),
    },
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(cors, { error: "método não permitido" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const ok = await checkRateLimit(admin, `painel-escola:${clientIp(req)}`, 10, 600);
    if (!ok) return tooManyRequests(cors);

    const body = await req.json().catch(() => ({}));
    const senha = typeof body?.senha === "string" ? body.senha : "";

    if (!SENHA || !safeEqual(senha, SENHA)) {
      return json(cors, { error: "senha inválida" }, 401);
    }

    const [ia, ec] = await Promise.all([
      buildCourse(admin, COURSES[0].id),
      buildCourse(admin, COURSES[1].id),
    ]);

    return json(cors, {
      gerado_em: new Date().toISOString(),
      eletivas: [
        {
          slug: "economia-circular",
          titulo: "Economia Circular & Negócios Regenerativos",
          professor: 'Eduardo "Dudu" Obregon',
          ...ec,
        },
        {
          slug: "ia-na-pratica",
          titulo: "IA na Prática",
          professor: "frattz",
          ...ia,
        },
      ],
    });
  } catch (e) {
    console.error("[painel-escola]", e);
    return json(cors, { error: "erro ao montar o painel" }, 500);
  }
});
