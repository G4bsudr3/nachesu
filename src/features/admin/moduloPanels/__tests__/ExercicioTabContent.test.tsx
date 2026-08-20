import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExercicioTabContent } from "../ExercicioTabContent";

const EC = "economia-circular";
const IA = "ia-na-pratica";

const emptyStateText = /painéis do exercício são feitos sob medida/i;

describe("ExercicioTabContent", () => {
  it("mostra o estado vazio quando o registry não tem entrada (ia na prática)", () => {
    render(<ExercicioTabContent slug={IA} number={5} />);
    expect(screen.getByText("sem painel específico")).toBeInTheDocument();
    expect(screen.getByText(emptyStateText)).toBeInTheDocument();
  });

  it("mostra o estado vazio no módulo 1 da economia circular", () => {
    render(<ExercicioTabContent slug={EC} number={1} />);
    expect(screen.getByText(emptyStateText)).toBeInTheDocument();
  });

  it("mostra o skeleton (e não o estado vazio) quando há painel registrado", () => {
    render(<ExercicioTabContent slug={EC} number={2} />);
    expect(screen.queryByText(emptyStateText)).not.toBeInTheDocument();
    expect(screen.getByText("carregando painel do exercício")).toBeInTheDocument();
  });

  it("é consistente entre as duas eletivas: mesmo componente decide os dois casos", () => {
    const { unmount } = render(<ExercicioTabContent slug={EC} number={10} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    unmount();

    render(<ExercicioTabContent slug={IA} number={10} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(emptyStateText)).toBeInTheDocument();
  });

  it("não quebra sem slug ou número", () => {
    render(<ExercicioTabContent slug={undefined} number={undefined} />);
    expect(screen.getByText(emptyStateText)).toBeInTheDocument();
  });
});
