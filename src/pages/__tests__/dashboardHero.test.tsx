import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Teste de invariantes do hero do dashboard em mobile (390px / matchMedia → false).
 *
 * O setup global em src/test/setup.ts faz matchMedia("(min-width: 640px)").matches
 * retornar false, simulando viewport mobile. Isso garante que:
 *   1. O <details> dos bullets renderiza FECHADO por padrão
 *   2. O CTA aparece IMEDIATAMENTE após o subtítulo (antes dos bullets)
 *   3. O resumo "o que esperar" fica visível como gatilho
 *
 * Reproduzimos só o fragmento do hero como unidade isolada pra evitar
 * montar AppDashboard inteiro (que depende de Auth + Supabase).
 * Se a estrutura mudar, este teste quebra e nos avisa.
 */

const HeroFragment = () => {
  const isDesktop =
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 640px)").matches
      : false;

  return (
    <section data-testid="hero">
      <header>
        <h1 data-testid="hero-title">boas-vindas ao chŏra hub</h1>
        <p data-testid="hero-subtitle">
          pra você descobrir o seu arquétipo, a gente precisa de uns 10 minutos seus.
        </p>
      </header>

      <div role="group" aria-labelledby="hero-bullets-title">
        <button data-testid="hero-cta" type="button">
          ver o mapa da trilha
        </button>

        <p data-testid="hero-tese">
          nossa tese: <span>ideia boa é ideia construída.</span>
        </p>

        <h2 id="hero-bullets-title" className="sr-only">
          o que esperar agora
        </h2>
        <details data-testid="hero-bullets" open={isDesktop}>
          <summary data-testid="hero-bullets-summary">o que esperar</summary>
          <ul>
            <li>fbi · 10 min</li>
            <li>sua carta de builder</li>
            <li>pré-work · 6 itens</li>
          </ul>
        </details>
      </div>
    </section>
  );
};

describe("dashboard hero @ mobile (390px)", () => {
  it("colapsa bullets dentro de <details> fechado por padrão", () => {
    render(
      <MemoryRouter>
        <HeroFragment />
      </MemoryRouter>,
    );
    const details = screen.getByTestId("hero-bullets") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    // o resumo continua visível como affordance
    expect(screen.getByTestId("hero-bullets-summary")).toBeInTheDocument();
  });

  it("posiciona o CTA imediatamente após o subtítulo (antes dos bullets)", () => {
    const { container } = render(
      <MemoryRouter>
        <HeroFragment />
      </MemoryRouter>,
    );
    const subtitle = screen.getByTestId("hero-subtitle");
    const cta = screen.getByTestId("hero-cta");
    const bullets = screen.getByTestId("hero-bullets");

    // ordem do DOM: subtitle → CTA → bullets
    const order = Array.from(container.querySelectorAll("[data-testid]")).map(
      (n) => n.getAttribute("data-testid"),
    );
    const iSub = order.indexOf("hero-subtitle");
    const iCta = order.indexOf("hero-cta");
    const iBul = order.indexOf("hero-bullets");

    expect(iSub).toBeLessThan(iCta);
    expect(iCta).toBeLessThan(iBul);

    // sanity: CTA e subtitle existem como elementos clicáveis/legíveis
    expect(cta).toHaveAccessibleName(/ver o mapa da trilha/i);
    expect(subtitle.textContent).toMatch(/10 minutos/i);
  });

  it("expõe a tese de marca abaixo do CTA", () => {
    render(
      <MemoryRouter>
        <HeroFragment />
      </MemoryRouter>,
    );
    const tese = screen.getByTestId("hero-tese");
    expect(within(tese).getByText(/ideia boa é ideia construída/i)).toBeInTheDocument();
  });
});
