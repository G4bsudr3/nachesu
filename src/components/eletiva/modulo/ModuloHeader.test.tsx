import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModuloHeader } from "./ModuloHeader";
import { scopeModuleNavigation } from "@/lib/moduleNavigation";

/**
 * Invariante visual: o cabeçalho do módulo sempre lê o número da eletiva
 * atual com zero-padding ("01", "12") e nunca expõe o total agregado de
 * duas matrículas (40). O total da eletiva aparece só no bloco de
 * progresso, escopado por curso.
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

  it('renderiza "01" para o primeiro módulo da eletiva', () => {
    render(<ModuloHeader {...baseProps} moduleNumber={1} totalModules={20} />);
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("preserva o zero-padding em módulos de dois dígitos", () => {
    render(<ModuloHeader {...baseProps} moduleNumber={12} totalModules={20} />);
    expect(screen.getByText("12")).toBeInTheDocument();
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

    expect(totalModules).toBe(20);
    render(<ModuloHeader {...baseProps} moduleNumber={1} totalModules={totalModules} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.queryByText(/\/40/)).toBeNull();
  });
});

