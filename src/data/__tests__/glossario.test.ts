import { describe, expect, it } from "vitest";
import { GLOSSARIO, filtrarGlossario, inicial, normalize } from "@/data/glossario";

describe("glossario", () => {
  it("não tem termo duplicado", () => {
    const nomes = GLOSSARIO.map((t) => normalize(t.termo));
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("todo termo tem pelo menos uma eletiva", () => {
    for (const t of GLOSSARIO) expect(t.tags.length).toBeGreaterThan(0);
  });

  it("busca ignora acento e caixa", () => {
    const r = filtrarGlossario(GLOSSARIO, "PROTOTIPO", "todas");
    expect(r.some((t) => t.termo === "protótipo")).toBe(true);
  });

  it("busca casa sinônimo", () => {
    const r = filtrarGlossario(GLOSSARIO, "business model canvas", "todas");
    expect(r.some((t) => t.termo === "canvas")).toBe(true);
  });

  it("busca casa trecho da definição", () => {
    const r = filtrarGlossario(GLOSSARIO, "instrução que você dá", "todas");
    expect(r.some((t) => t.termo === "prompt")).toBe(true);
  });

  it("filtro por eletiva mantém os termos comuns", () => {
    const r = filtrarGlossario(GLOSSARIO, "", "circular");
    expect(r.every((t) => t.tags.includes("circular"))).toBe(true);
    expect(r.some((t) => t.termo === "pbl")).toBe(true);
    expect(r.some((t) => t.termo === "prompt")).toBe(false);
  });

  it("busca vazia devolve tudo", () => {
    expect(filtrarGlossario(GLOSSARIO, "", "todas")).toHaveLength(GLOSSARIO.length);
  });

  it("agrupa pela letra sem acento", () => {
    expect(inicial("órbita")).toBe("O");
    expect(inicial("6 r's")).toBe("#");
  });

  it("copy segue o padrão: sem travessão e sem caixa alta no começo", () => {
    for (const t of GLOSSARIO) {
      expect(t.termo).not.toMatch(/—/);
      expect(t.definicao).not.toMatch(/—/);
      expect(t.termo[0]).toBe(t.termo[0].toLowerCase());
    }
  });
});
