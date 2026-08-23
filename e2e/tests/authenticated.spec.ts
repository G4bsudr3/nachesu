import { test, expect } from "@playwright/test";

/**
 * Smoke autenticado — SÓ LEITURA (não clica nada que escreva no banco).
 * Desligado por padrão. Para rodar:
 *   1. Abra a plataforma logada, F12 → Application → Local Storage →
 *      copie o valor da chave `sb-jrzahsjrzaaktuelnsaw-auth-token`
 *      (ou pegue o access_token de um Copy-as-cURL).
 *   2. E2E_ACCESS_TOKEN="<access_token>" [E2E_REFRESH_TOKEN="<refresh>"] npm test
 *
 * Sem o token, todos os testes deste arquivo são pulados.
 */

const SUPABASE_REF = process.env.E2E_SUPABASE_REF ?? "jrzahsjrzaaktuelnsaw";
const ACCESS = process.env.E2E_ACCESS_TOKEN ?? "";
const REFRESH = process.env.E2E_REFRESH_TOKEN ?? "e2e-no-refresh";

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    return {};
  }
}

test.describe("fluxo autenticado (só leitura)", () => {
  test.skip(!ACCESS, "defina E2E_ACCESS_TOKEN para rodar os testes autenticados");

  test.beforeEach(async ({ context, baseURL }) => {
    const claims = decodeJwt(ACCESS);
    const session = {
      access_token: ACCESS,
      refresh_token: REFRESH,
      token_type: "bearer",
      expires_at: (claims.exp as number) ?? Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      user: {
        id: claims.sub,
        email: claims.email,
        aud: "authenticated",
        role: "authenticated",
      },
    };
    // injeta a sessão do supabase-js no localStorage antes do app carregar
    await context.addInitScript(
      ([ref, sess]) => {
        localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
      },
      [SUPABASE_REF, session] as const,
    );
    void baseURL;
  });

  test("dashboard /app carrega logado (não redireciona pro login)", async ({ page }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    // se a sessão foi aceita, não volta pra /auth
    await expect(page).not.toHaveURL(/\/auth(\/|$)/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("minhas eletivas /app/eletivas renderiza", async ({ page }) => {
    await page.goto("/app/eletivas");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/auth(\/|$)/);
  });

  test("conta /app/conta renderiza campos de perfil", async ({ page }) => {
    await page.goto("/app/conta");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/auth(\/|$)/);
    await expect(page.locator("body")).toContainText(/conta|sair|senha/i);
  });
});
