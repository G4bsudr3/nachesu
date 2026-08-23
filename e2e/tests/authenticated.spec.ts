import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke autenticado tela-por-tela — SÓ LEITURA (não clica nada que escreva).
 * Abre cada tela num navegador real e confere: renderizou, não caiu no login,
 * e não houve erro de JS não tratado (crash / tela branca).
 *
 * Desligado por padrão. Para rodar (token expira em ~1h):
 *   E2E_ACCESS_TOKEN="<access_token>" npm test
 *
 * O token é de um usuário ADMIN (cobre também as telas de admin). Como pegar:
 * plataforma logada → F12 → Application → Local Storage →
 * chave `sb-jrzahsjrzaaktuelnsaw-auth-token` (campo access_token), ou o
 * Authorization de um "Copy as cURL". Slugs abaixo assumem os 2 cursos atuais.
 */

const SUPABASE_REF = process.env.E2E_SUPABASE_REF ?? "jrzahsjrzaaktuelnsaw";
const ACCESS = process.env.E2E_ACCESS_TOKEN ?? "";
const REFRESH = process.env.E2E_REFRESH_TOKEN ?? "e2e-no-refresh";
const COURSE_ID_IA = "c0a00000-0000-0000-0000-000000000001";

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    return {};
  }
}

// telas do aluno (rotas parametrizadas usam os slugs/curso atuais)
const STUDENT_ROUTES: Array<{ name: string; path: string }> = [
  { name: "dashboard", path: "/app" },
  { name: "minhas eletivas", path: "/app/eletivas" },
  { name: "eletiva home (IA)", path: "/app/eletiva/ia-na-pratica" },
  { name: "eletiva home (Econ)", path: "/app/eletiva/economia-circular" },
  { name: "trilhas", path: "/app/trilhas" },
  { name: "notificações", path: "/app/notificacoes" },
  { name: "glossário", path: "/app/glossario" },
  { name: "módulo 1 (IA)", path: "/app/eletiva/ia-na-pratica/modulo/1" },
  { name: "certificado (IA)", path: "/app/eletiva/ia-na-pratica/certificado" },
  { name: "conta", path: "/app/conta" },
  { name: "hub", path: "/app/hub" },
  { name: "hub materiais", path: "/app/hub/materiais" },
  { name: "tutor", path: "/app/tutor" },
];

// telas de admin (o token precisa ser de um admin)
const ADMIN_ROUTES: Array<{ name: string; path: string }> = [
  { name: "admin home", path: "/admin" },
  { name: "admin risco", path: "/admin/risco" },
  { name: "admin fluxo", path: "/admin/fluxo" },
  { name: "admin notificações", path: "/admin/notificacoes" },
  { name: "admin entregas", path: "/admin/entregas" },
  { name: "admin pulso", path: "/admin/pulso" },
  { name: "admin respostas", path: "/admin/respostas" },
  { name: "admin vídeos", path: "/admin/videos" },
  { name: "admin módulos (IA)", path: "/admin/eletiva/ia-na-pratica/modulos" },
  { name: "admin turma (IA)", path: `/admin/turma/${COURSE_ID_IA}` },
];

async function assertScreenOk(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});
  // sessão aceita: não foi chutado pro login
  await expect(page, `${path} redirecionou pro login`).not.toHaveURL(/\/auth(\/|$)/);
  // renderizou algo (anti tela-branca)
  await expect(page.locator("body"), `${path} veio vazio`).not.toBeEmpty();
  // nenhum erro de JS não tratado (crash)
  expect(errors, `${path} teve erro de JS: ${errors.join(" | ")}`).toHaveLength(0);
}

test.describe("todas as telas (autenticado, só leitura)", () => {
  test.skip(!ACCESS, "defina E2E_ACCESS_TOKEN (token de admin) para rodar");

  test.beforeEach(async ({ context }) => {
    const claims = decodeJwt(ACCESS);
    const session = {
      access_token: ACCESS,
      refresh_token: REFRESH,
      token_type: "bearer",
      expires_at: (claims.exp as number) ?? Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      user: { id: claims.sub, email: claims.email, aud: "authenticated", role: "authenticated" },
    };
    await context.addInitScript(
      ([ref, sess]) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess)),
      [SUPABASE_REF, session] as const,
    );
  });

  for (const r of STUDENT_ROUTES) {
    test(`aluno · ${r.name}`, async ({ page }) => {
      await assertScreenOk(page, r.path);
    });
  }

  for (const r of ADMIN_ROUTES) {
    test(`admin · ${r.name}`, async ({ page }) => {
      await assertScreenOk(page, r.path);
    });
  }
});
