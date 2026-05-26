import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModuloHeader } from "./ModuloHeader";
import { scopeModuleNavigation } from "@/lib/moduleNavigation";

/**
 * Invariante visual: o badge do cabeçalho do módulo sempre lê
 * "módulo NN/MM", onde MM é o total da eletiva atual (20, nunca 40).
 *
 * Esse teste fecha o loop com moduleNavigation.test.ts e com Modulo.tsx,
 * garantindo que o output combinado (escopo + formatação) renderiza
 * "módulo 01/20" mesmo para aluno com 2 matrículas.
 */
describe("ModuloHeader — header de progresso do aluno", () => {
  const baseProps = {
    trailTitle: "fundamentos & ia",
    trailColor: "#fe7b02",
    title: "o que ia faz hoje",
    objective: null,
    totalMinutes: 50,
    isCompleted: false,
  };

  it('renderiza "módulo 01/20" para o primeiro módulo da eletiva', () => {
    render(<ModuloHeader {...baseProps} moduleNumber={1} totalModules={20} />);
    expect(screen.getByText("módulo 01/20")).toBeInTheDocument();
  });

  it('renderiza "módulo 12/20" preservando o zero-padding', () => {
    render(<ModuloHeader {...baseProps} moduleNumber={12} totalModules={20} />);
    expect(screen.getByText("módulo 12/20")).toBeInTheDocument();
  });

  it("aluno em 2 eletivas: o total fica 20 (a eletiva atual), não 40 (agregado)", () => {
    // simula a snapshot agregada e prova que o pipeline (scope → header) preserva /20
    const { totalModules } = scopeModuleNavigation({
      trails: [
        { id: "a1", course_id: "course-a" },
        { id: "b1", course_id: "course-b" },
      ],
      modules: [
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `a-${i + 1}`,
          number: i + 1,
          trail_id: "a1",
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `b-${i + 1}`,
          number: i + 1,
          trail_id: "b1",
        })),
      ],
      currentTrail: { id: "a1", course_id: "course-a" },
      moduleNumber: 1,
    });

    render(<ModuloHeader {...baseProps} moduleNumber={1} totalModules={totalModules} />);
    expect(screen.getByText("módulo 01/20")).toBeInTheDocument();
    expect(screen.queryByText(/\/40/)).toBeNull();
  });
});
