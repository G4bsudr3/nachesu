import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do NachesU. Roda contra uma baseURL configurável.
 * - Padrão: produção (https://sebrae.frattz.com) — só os testes públicos (GET, leitura).
 * - Local: PLAYWRIGHT_BASE_URL=http://localhost:5173 (com `npm run dev` do app rodando).
 *
 * Os testes autenticados só rodam se E2E_ACCESS_TOKEN estiver setado (ver README).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://sebrae.frattz.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
