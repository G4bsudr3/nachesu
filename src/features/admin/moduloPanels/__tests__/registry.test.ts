import { describe, it, expect } from "vitest";
import { moduloPanelRegistry, getModuloPanel } from "../registry";

const EC = "economia-circular";
const IA = "ia-na-pratica";

describe("moduloPanelRegistry", () => {
  it("cobre os módulos 2 a 20 da economia circular", () => {
    for (let n = 2; n <= 20; n++) {
      expect(getModuloPanel(EC, n), `esperava painel para ${EC}:${n}`).toBeTruthy();
    }
  });

  it("não tem painel para o módulo 1 da economia circular", () => {
    expect(getModuloPanel(EC, 1)).toBeNull();
  });

  it("não registra painel específico para nenhum módulo de ia na prática", () => {
    for (let n = 1; n <= 20; n++) {
      expect(getModuloPanel(IA, n), `não deveria haver painel para ${IA}:${n}`).toBeNull();
    }
  });

  it("devolve null para slug ou número ausente", () => {
    expect(getModuloPanel(undefined, 2)).toBeNull();
    expect(getModuloPanel(EC, undefined)).toBeNull();
    expect(getModuloPanel("curso-inexistente", 2)).toBeNull();
  });

  it("usa chaves no formato curso:número", () => {
    for (const key of Object.keys(moduloPanelRegistry)) {
      expect(key).toMatch(/^[a-z0-9-]+:\d+$/);
    }
  });
});
