import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EntregaChecklist } from "../EntregaChecklist";

const items = [
  { id: "a", label: "seu pedido pra ia", done: true },
  { id: "b", label: "o que você aprendeu", done: false },
];

describe("EntregaChecklist", () => {
  it("lista o que já está pronto e o que falta", () => {
    render(
      <EntregaChecklist
        items={items}
        accent="#fe7b02"
        ctaLabel="entregar e seguir"
        completedLabel="exercício entregue"
        isCompleted={false}
        onComplete={() => {}}
      />,
    );
    expect(screen.getByText("1/2 prontos")).toBeInTheDocument();
    expect(screen.getByText(/falta 1 item pra entregar/i)).toBeInTheDocument();
  });

  it("nomeia o campo faltante ao tentar entregar incompleto e não entrega", () => {
    const onComplete = vi.fn();
    render(
      <EntregaChecklist
        items={items}
        accent="#fe7b02"
        ctaLabel="entregar e seguir"
        completedLabel="exercício entregue"
        isCompleted={false}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /entregar e seguir/i }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText(/ainda falta preencher: o que você aprendeu/i)).toBeInTheDocument();
  });

  it("entrega quando tudo está preenchido", () => {
    const onComplete = vi.fn();
    render(
      <EntregaChecklist
        items={items.map((i) => ({ ...i, done: true }))}
        accent="#fe7b02"
        ctaLabel="entregar e seguir"
        completedLabel="exercício entregue"
        isCompleted={false}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /entregar e seguir/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
