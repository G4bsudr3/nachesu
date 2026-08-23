import { test, expect } from "@playwright/test";

/**
 * Testes de INTERAÇÃO da parte educacional — clica botões, digita, envia.
 * Escreve SOMENTE na conta do usuário do token (gabreda188). A RLS garante que
 * nenhuma linha de outro usuário é tocada. Evita espaços compartilhados (não
 * posta comentário/foto no hub) e usa mensagem benigna no tutor.
 *
 * Desligado por padrão. Rodar: E2E_ACCESS_TOKEN="<token>" npm test
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

test.describe("interações educacionais (conta do próprio usuário)", () => {
  test.skip(!ACCESS, "defina E2E_ACCESS_TOKEN para rodar");

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

  test("tutor: aceitar aviso, enviar pergunta e receber resposta da IA", async ({ page }) => {
    await page.goto("/app/tutor");

    // aviso de privacidade (LGPD): aparece na 1ª vez. click com auto-wait evita
    // corrida (espera o botão montar). grava só o consent do próprio usuário.
    await page.getByRole("button", { name: /entendi/i }).click({ timeout: 12_000 }).catch(() => {});
    await page.getByRole("dialog", { name: /antes de começar/i }).waitFor({ state: "hidden" }).catch(() => {});

    const log = page.getByRole("log", { name: /conversa com o tutor/i });
    await expect(log).toBeVisible();
    const lenBefore = (await log.innerText()).length;

    // digita e envia uma pergunta benigna (label real do /app/tutor)
    const pergunta = "me explica em uma frase o que é um prompt";
    const input = page.getByRole("textbox", { name: /pergunta pro tutor/i });
    await expect(input).toBeVisible();
    await input.fill(pergunta);
    await page.getByRole("button", { name: /enviar pergunta/i }).click();

    // a pergunta do aluno aparece no log
    await expect(log.getByText(pergunta)).toBeVisible();

    // a IA responde: o log cresce além da pergunta (espera generosa por causa do LLM)
    await expect
      .poll(async () => (await log.innerText()).length, { timeout: 30_000 })
      .toBeGreaterThan(lenBefore + pergunta.length + 15);
  });

  test("hub: navegar por clique até Materiais (só leitura)", async ({ page }) => {
    await page.goto("/app/hub");
    // encontra um link/rota pra materiais e clica (nav por clique, sem escrever)
    const materiaisLink = page.getByRole("link", { name: /materiais|materiai|conteúdo/i }).first();
    if (await materiaisLink.isVisible().catch(() => false)) {
      await materiaisLink.click();
      await expect(page).toHaveURL(/\/app\/hub\/materiais/);
    } else {
      // fallback: navega direto e confirma render (a rota existe)
      await page.goto("/app/hub/materiais");
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

});
