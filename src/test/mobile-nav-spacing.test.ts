import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * defesa em profundidade: garante que toda página/componente que renderiza
 * <MobileNav /> também reserva espaço inferior via --mobile-nav-h, pra que
 * conteúdo + ChoraBotFab não fiquem escondidos atrás da nav fixa.
 *
 * arquivos isentos: o próprio MobileNav e o HubLayout (que aplica o padding
 * no Outlet, cobrindo todas as páginas filhas).
 */

const SRC = path.resolve(__dirname, "..");
const ALLOWLIST = new Set([
  path.join(SRC, "components/layout/MobileNav.tsx"),
  path.join(SRC, "components/layout/HubLayout.tsx"),
]);

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
};

const rendersMobileNav = (src: string) =>
  /<MobileNav\b/.test(src) && /from\s+["'][^"']*MobileNav["']/.test(src);

const reservesMobileNavSpace = (src: string) =>
  src.includes("--mobile-nav-h");

describe("layout: páginas com MobileNav reservam --mobile-nav-h", () => {
  it("toda página/componente que renderiza <MobileNav /> também usa --mobile-nav-h (direto ou via HubLayout)", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (ALLOWLIST.has(file)) continue;
      const src = readFileSync(file, "utf8");
      if (rendersMobileNav(src) && !reservesMobileNavSpace(src)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(
      offenders,
      `arquivos renderizam <MobileNav /> sem reservar var(--mobile-nav-h):\n  - ${offenders.join("\n  - ")}\n\nadicione paddingBottom: var(--mobile-nav-h, 0px) no container raiz, ou envolva a rota em HubLayout.`,
    ).toEqual([]);
  });
});

describe("layout: primitives de modal/overlay respeitam --mobile-nav-h", () => {
  // garante que se alguém substituir/regenerar shadcn primitives, não perdemos
  // o tratamento de MobileNav. dialog/alert-dialog limitam max-h, sheet aplica
  // padding-bottom — todos referenciando a mesma var.
  const PRIMITIVES = [
    "components/ui/dialog.tsx",
    "components/ui/alert-dialog.tsx",
    "components/ui/sheet.tsx",
  ];

  it.each(PRIMITIVES)("%s referencia var(--mobile-nav-h)", (rel) => {
    const src = readFileSync(path.join(SRC, rel), "utf8");
    expect(
      src.includes("--mobile-nav-h"),
      `${rel} precisa reservar espaço da MobileNav (max-height ou padding-bottom usando var(--mobile-nav-h)).`,
    ).toBe(true);
  });
});
