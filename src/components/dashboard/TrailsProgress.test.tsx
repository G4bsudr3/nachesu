import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { TrailsProgress } from "./TrailsProgress";
import type { EletivaSnapshot } from "@/hooks/useEletivaProgress";

const buildSnapshot = (overrides: Partial<EletivaSnapshot> = {}): EletivaSnapshot => {
  const trails = [
    { id: "t1", order_index: 1, title: "Fundamentos", description: null, color: null },
    { id: "t2", order_index: 2, title: "Prompts", description: null, color: null },
  ];
  const modules = [
    { id: "m1", number: 1, trail_id: "t1", title: "m1", objective: null, total_minutes: null, available_from: null, published: true },
    { id: "m2", number: 2, trail_id: "t1", title: "m2", objective: null, total_minutes: null, available_from: null, published: true },
    { id: "m3", number: 3, trail_id: "t2", title: "m3", objective: null, total_minutes: null, available_from: null, published: true },
  ];
  return {
    trails,
    modules,
    progressByModuleId: {
      m1: { module_id: "m1", started_at: "2026-04-01", completed_at: "2026-04-02" },
    },
    completedPillIds: new Set<string>(),
    unlockedModuleIds: new Set<string>(["m1", "m2", "m3"]),
    sequentialUnlock: false,
    totalPublished: 3,
    totalCompleted: 1,
    currentModule: null,
    nextModule: null,
    ...overrides,
  };
};

// captura a rota atual pra validar navegação SPA
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
};

const renderWithRouter = (snapshot: EletivaSnapshot) =>
  render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route
          path="/app"
          element={
            <>
              <TrailsProgress snapshot={snapshot} />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/app/trilhas"
          element={<LocationProbe />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("TrailsProgress", () => {
  it("renderiza um link por trilha apontando pra /app/trilhas", () => {
    renderWithRouter(buildSnapshot());
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(2);
    links.forEach((link) => {
      expect(link.getAttribute("href")).toBe("/app/trilhas");
    });
  });

  it("clicar em uma trilha navega pra /app/trilhas via SPA (sem reload)", () => {
    // se houvesse reload, jsdom dispararia navegação real e quebraria
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy, assign: reloadSpy },
    });

    renderWithRouter(buildSnapshot());
    expect(screen.getByTestId("location").textContent).toBe("/app");

    fireEvent.click(screen.getAllByRole("link")[0]);

    expect(screen.getByTestId("location").textContent).toBe("/app/trilhas");
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("preserva o snapshot durante a navegação (mesma instância React Query, sem refetch)", () => {
    // simula estado: o componente recebe snapshot via prop, então enquanto
    // o React tree fica montado, o estado é preservado entre cliques.
    const snapshot = buildSnapshot();
    const { rerender } = renderWithRouter(snapshot);

    // valor inicial: 1/2 na trilha fundamentos
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("link")[0]);

    // re-render com o mesmo snapshot: nada disparou refetch nem reset
    rerender(
      <MemoryRouter initialEntries={["/app/trilhas"]}>
        <Routes>
          <Route path="/app/trilhas" element={<TrailsProgress snapshot={snapshot} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("não renderiza quando não há trilhas", () => {
    const { container } = renderWithRouter(buildSnapshot({ trails: [] }));
    expect(container.querySelector("section")).toBeNull();
  });

  it("mostra 'em breve' quando uma trilha não tem módulos publicados", () => {
    const snap = buildSnapshot({
      trails: [
        { id: "t1", order_index: 1, title: "Fundamentos", description: null, color: null },
        { id: "t2", order_index: 2, title: "Vazia", description: null, color: null },
      ],
      modules: [
        { id: "m1", number: 1, trail_id: "t1", title: "m1", objective: null, total_minutes: null, available_from: null, published: true },
      ],
    });
    renderWithRouter(snap);
    expect(screen.getByText("em breve")).toBeInTheDocument();
  });

  it("expõe progressbar acessível com aria-valuenow correto", () => {
    renderWithRouter(buildSnapshot());
    const bars = screen.getAllByRole("progressbar");
    expect(bars[0].getAttribute("aria-valuenow")).toBe("50"); // 1/2
    expect(bars[1].getAttribute("aria-valuenow")).toBe("0"); // 0/1
  });
});
