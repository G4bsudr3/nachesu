// testes de contrato + esquema da função draft-deliverable-feedback
// foco: garantir que a busca da entrega usa colunas que existem de verdade
// em `modules` (regressão do erro 42703 "column modules_1.summary does not exist")
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/draft-deliverable-feedback`;

const SOURCE = await Deno.readTextFile(
  new URL("./index.ts", import.meta.url),
);

// o select que a função usa pra buscar a entrega, extraído da própria fonte
function extractDeliverableSelect(): string {
  const match = SOURCE.match(
    /from\('module_deliverables'\)\s*\n\s*\.select\('([^']+)'\)/,
  );
  assert(match, "não encontrei o select de module_deliverables na função");
  return match[1];
}

async function restSelect(select: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/module_deliverables?select=${
      encodeURIComponent(select)
    }&limit=1`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
  );
  const body = await res.text();
  return { status: res.status, body };
}

Deno.test("o select da entrega não referencia modules.summary", () => {
  const select = extractDeliverableSelect();
  assert(
    !/\bsummary\b/.test(select),
    `select ainda pede uma coluna inexistente: ${select}`,
  );
  assertStringIncludes(select, "module:modules(");
  assertStringIncludes(select, "objective");
  assertStringIncludes(select, "deliverable_description");
  assertStringIncludes(select, "rubric_id");
});

Deno.test("o select da entrega é válido contra o esquema real do banco", async () => {
  const select = extractDeliverableSelect();
  const { status, body } = await restSelect(select);
  // rls pode devolver zero linhas para anônimo, mas coluna inexistente vira 42703/400
  assert(
    status !== 400,
    `postgrest rejeitou o select da função: ${body}`,
  );
  assert(!body.includes("42703"), `coluna inexistente no select: ${body}`);
});

Deno.test("campo ausente no esquema é detectado (guarda do próprio teste)", async () => {
  const { status, body } = await restSelect(
    "id, module:modules(id, summary)",
  );
  assertEquals(status, 400);
  assertStringIncludes(body, "42703");
});

Deno.test("chamada sem autenticação é recusada com 401", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ deliverable_id: crypto.randomUUID() }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  assertStringIncludes(body, "unauthorized");
});

Deno.test("a função valida deliverable_id antes de chamar o modelo", () => {
  assertStringIncludes(SOURCE, "deliverable_id obrigatório");
  assertStringIncludes(SOURCE, "entrega não encontrada");
});
