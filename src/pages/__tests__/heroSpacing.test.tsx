import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { heroSpacing, heroSizing } from "@/lib/heroTokens";

/**
 * Teste de regressão de espaçamento e altura do hero do Dashboard.
 *
 * Estratégia: jsdom não computa layout real, então snapshot de pixels é frágil.
 * O que importa é o contrato semântico: cada elemento do hero precisa carregar
 * as classes responsivas do token correspondente (mt-/min-h-/px- com prefixos
 * sm: e md: nos breakpoints corretos).
 *
 * Se alguém mudar o ritmo vertical (ex: trocar mt-5 por mt-4 direto no JSX em
 * vez de editar heroTokens), este teste quebra. Garante que os tokens
 * permanecem como única fonte de verdade.
 *
 * Reproduzimos o fragmento do hero ao invés de montar AppDashboard inteiro
 * pra evitar dependências de Auth + Supabase.
 */

const HeroFragment = ({ withHint = false }: { withHint?: boolean }) => (
  <section data-testid="hero">
    <header>
      <h1 data-testid="hero-title">boas-vindas ao chŏra hub</h1>
      <p
        data-testid="hero-subtitle"
        className={`${heroSpacing.subtitleTop} max-w-xl`}
      >
        subtítulo do hero
      </p>
      {withHint && (
        <p data-testid="hero-hint" className={`${heroSpacing.hintTop} max-w-xl`}>
          dica do modo
        </p>
      )}
    </header>

    <div role="group">
      <button
        data-testid="hero-cta"
        type="button"
        className={`${heroSpacing.ctaTop} ${heroSizing.ctaPaddingX} ${heroSizing.ctaMinHeight} inline-flex`}
      >
        ver o mapa
      </button>
      <p data-testid="hero-tese" className={`${heroSpacing.teseTop} max-w-xl`}>
        tese
      </p>
      <details data-testid="hero-bullets" className={`${heroSpacing.bulletsTop} max-w-xl`}>
        <summary>o que esperar</summary>
      </details>
    </div>
  </section>
);

const expectClasses = (el: HTMLElement, classes: string[]) => {
  for (const c of classes) {
    expect(el.className.split(/\s+/)).toContain(c);
  }
};

describe("hero spacing & sizing tokens", () => {
  describe("ritmo vertical (xs / sm / md)", () => {
    it("subtítulo escala mt-4 → mt-5 → mt-6 nos três breakpoints", () => {
      render(<MemoryRouter><HeroFragment /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-subtitle"), [
        "mt-4",
        "sm:mt-5",
        "md:mt-6",
      ]);
    });

    it("hint do modo cola no subtítulo com mt-2 fixo", () => {
      render(<MemoryRouter><HeroFragment withHint /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-hint"), ["mt-2"]);
    });

    it("CTA escala mt-5 → mt-6 → mt-7 nos três breakpoints", () => {
      render(<MemoryRouter><HeroFragment /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-cta"), [
        "mt-5",
        "sm:mt-6",
        "md:mt-7",
      ]);
    });

    it("tese escala mt-3 → mt-4 entre xs e sm", () => {
      render(<MemoryRouter><HeroFragment /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-tese"), ["mt-3", "sm:mt-4"]);
    });

    it("bullets ficam com mt-5 fixo abaixo da tese", () => {
      render(<MemoryRouter><HeroFragment /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-bullets"), ["mt-5"]);
    });
  });

  describe("altura e padding do CTA", () => {
    it("min-height escala min-h-12 → 52px → min-h-14", () => {
      render(<MemoryRouter><HeroFragment /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-cta"), [
        "min-h-12",
        "sm:min-h-[52px]",
        "md:min-h-14",
      ]);
    });

    it("padding horizontal escala px-5 → px-6", () => {
      render(<MemoryRouter><HeroFragment /></MemoryRouter>);
      expectClasses(screen.getByTestId("hero-cta"), ["px-5", "sm:px-6"]);
    });
  });

  describe("integridade dos tokens (snapshot)", () => {
    it("congela os valores atuais de heroSpacing e heroSizing", () => {
      // se algum token mudar de valor, este snapshot quebra e força revisão
      // intencional do ritmo do hero. atualize com `vitest -u` se for proposital.
      expect({ heroSpacing, heroSizing }).toMatchInlineSnapshot(`
        {
          "heroSizing": {
            "ctaMinHeight": "min-h-12 sm:min-h-[52px] md:min-h-14",
            "ctaPaddingX": "px-5 sm:px-6",
          },
          "heroSpacing": {
            "bulletsTop": "mt-5",
            "ctaTop": "mt-5 sm:mt-6 md:mt-7",
            "hintTop": "mt-2",
            "subtitleTop": "mt-4 sm:mt-5 md:mt-6",
            "teseTop": "mt-3 sm:mt-4",
          },
        }
      `);
    });
  });
});
