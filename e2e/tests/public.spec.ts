import { test, expect } from "@playwright/test";

/**
 * Smoke tests públicos (sem login) — pegam white-screen, rota quebrada e
 * regressão das páginas legais que publicamos. Só GET/leitura; seguro contra prod.
 */

test.describe("páginas públicas", () => {
  test("landing / carrega e mostra a marca", async ({ page }) => {
    await page.goto("/");
    // marca aparece em algum lugar (rodapé/hero) — smoke anti white-screen
    await expect(page.locator("body")).toContainText(/naches/i);
  });

  test("/auth mostra o formulário e os links legais", async ({ page }) => {
    await page.goto("/auth");
    // campo de e-mail do login
    await expect(page.locator('input[type="email"], input[placeholder*="@"]').first()).toBeVisible();
    // links legais no rodapé (obrigatório pós-LGPD)
    await expect(page.getByRole("link", { name: /privacidade/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /termos/i })).toBeVisible();
  });

  test("/privacidade renderiza a Política completa", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(page.getByRole("heading", { name: /política de privacidade/i })).toBeVisible();
    // seções-chave do documento (não é página vazia)
    await expect(page.locator("body")).toContainText(/encarregado/i);
    await expect(page.locator("body")).toContainText(/melhor interesse do adolescente/i);
    await expect(page.locator("body")).toContainText(/vigente desde/i);
  });

  test("/termos renderiza os Termos de Uso", async ({ page }) => {
    await page.goto("/termos");
    await expect(page.getByRole("heading", { name: /termos de uso/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/tutor de i/i); // seção do tutor de IA
  });

  test("link 'privacidade' do rodapé navega", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("link", { name: /privacidade/i }).first().click();
    await expect(page).toHaveURL(/\/privacidade$/);
    await expect(page.getByRole("heading", { name: /política de privacidade/i })).toBeVisible();
  });

  test("rota inexistente não dá white-screen (404 renderiza)", async ({ page }) => {
    await page.goto("/rota-que-nao-existe-xyz-123");
    // não deve cair no app autenticado
    await expect(page).not.toHaveURL(/\/app(\/|$)/);
    // a página renderizou algo (body com texto), não tela branca
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
