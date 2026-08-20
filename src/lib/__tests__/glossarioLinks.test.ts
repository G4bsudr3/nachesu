import { describe, it, expect } from "vitest";
import { linkifyGlossario } from "@/lib/glossarioLinks";

describe("linkifyGlossario", () => {
  it("linka só a primeira aparição do termo", () => {
    const out = linkifyGlossario("o prompt importa. outro prompt também.");
    expect(out).toBe(
      "o [prompt](/app/glossario?q=prompt) importa. outro prompt também.",
    );
  });

  it("ignora acento e caixa", () => {
    const out = linkifyGlossario("um Prototipo rápido");
    expect(out).toContain("[Prototipo](/app/glossario?q=prot%C3%B3tipo)");
  });

  it("prefere o termo mais longo", () => {
    const out = linkifyGlossario("isso é economia circular na veia");
    expect(out).toContain("[economia circular](/app/glossario?q=economia%20circular)");
  });

  it("não mexe em link, código ou url existente", () => {
    const md = "[prompt](https://x.com) e `prompt` e https://a.com/prompt";
    expect(linkifyGlossario(md)).toBe(md);
  });

  it("não linka dentro de palavra", () => {
    expect(linkifyGlossario("prompts")).toBe("prompts");
  });

  it("pula título e citação", () => {
    expect(linkifyGlossario("## prompt\n> prompt")).toBe("## prompt\n> prompt");
  });

  it("reaproveita o set entre chamadas", () => {
    const usadas = new Set<string>();
    linkifyGlossario("prompt", usadas);
    expect(linkifyGlossario("prompt de novo", usadas)).toBe("prompt de novo");
  });
});
