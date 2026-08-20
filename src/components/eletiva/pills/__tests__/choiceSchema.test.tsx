import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normOptions, correctValues, wrongFeedback, minChars } from "../choiceSchema";
import { PillConteudoCurado } from "../PillConteudoCurado";


// schema real do módulo 16 de economia circular (formato novo: id + correct + feedback_incorrect)
const schemaM16 = {
  type: "curated_content_with_questions" as const,
  cards: [],
  questions: [
    {
      id: "q1-metodo",
      type: "single_choice" as const,
      label: 'qual método MELHOR testa a suposição?',
      options: [
        { id: "a", label: "construir o app completo" },
        { id: "b", label: "landing page falsa", correct: true },
        { id: "c", label: "pesquisa múltipla escolha" },
      ],
      feedback_correct: "sacou.",
      feedback_incorrect: "pensa de novo.",
    },
    { id: "q3", type: "long_text" as const, label: "o que aprendeu?", min_length: 80 },
  ],
};

describe("normalização de alternativas", () => {
  it("aceita opt.id e opt.value", () => {
    expect(normOptions([{ id: "b", label: "x" }])[0].value).toBe("b");
    expect(normOptions([{ value: "b", label: "x" }])[0].value).toBe("b");
  });

  it("lê corretas de option.correct e de q.correct", () => {
    expect(correctValues(schemaM16.questions[0] as never)).toEqual(["b"]);
    expect(correctValues({ id: "q", correct: ["a"] })).toEqual(["a"]);
  });

  it("opção sem value/id: correta usa índice do array completo (não inverte)", () => {
    const q = { id: "q", options: [{ label: "errada" }, { label: "certa", correct: true }] };
    // normOptions numera pelo array completo: errada="0", certa="1"
    expect(normOptions(q.options)).toEqual([
      { value: "0", label: "errada" },
      { value: "1", label: "certa" },
    ]);
    // a correta é a 2ª -> deve ser "1" (antes retornava "0", invertendo o feedback)
    expect(correctValues(q as never)).toEqual(["1"]);
  });

  it("lê feedback e mínimo nas duas chaves", () => {
    expect(wrongFeedback({ id: "q", feedback_incorrect: "n" })).toBe("n");
    expect(wrongFeedback({ id: "q", feedback_wrong: "n" })).toBe("n");
    expect(minChars({ min_length: 80 })).toBe(80);
    expect(minChars({ min_chars: 40 })).toBe(40);
  });
});

describe("PillConteudoCurado com schema novo", () => {
  it("marca a alternativa clicada e salva o valor", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <PillConteudoCurado
          title="método > opinião"
          bodyMd={null}
          schema={schemaM16 as never}
          accent="#8A85BF"
          initial={{}}
          save={save}
          onComplete={() => {}}
          isCompleted={false}
        />
      </QueryClientProvider>,
    );

    const radio = screen.getByRole("radio", { name: /landing page falsa/i }) as HTMLInputElement;
    fireEvent.click(radio);
    expect(radio.checked).toBe(true);
    expect(await screen.findByText(/sacou/i)).toBeTruthy();
  });
});
