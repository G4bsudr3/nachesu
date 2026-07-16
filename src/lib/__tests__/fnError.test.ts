import { describe, it, expect } from "vitest";
import { fnErrorInfo, refSuffix } from "@/lib/fnError";

describe("fnErrorInfo", () => {
  it("extrai do corpo em data (resposta 2xx com { error })", async () => {
    const info = await fnErrorInfo(null, {
      error: "não consegui salvar",
      code: "save_failed",
      request_id: "abc12345",
    });
    expect(info).toEqual({
      message: "não consegui salvar",
      code: "save_failed",
      requestId: "abc12345",
    });
  });

  it("extrai do error.context (resposta 4xx/5xx do supabase-js)", async () => {
    const fakeError = {
      context: {
        json: async () => ({
          error: "forbidden",
          code: "forbidden_not_admin",
          request_id: "deadbeef",
        }),
      },
    };
    const info = await fnErrorInfo(fakeError);
    expect(info.message).toBe("forbidden");
    expect(info.code).toBe("forbidden_not_admin");
    expect(info.requestId).toBe("deadbeef");
  });

  it("prioriza o corpo em data sobre o error.context", async () => {
    const fakeError = { context: { json: async () => ({ error: "do context" }) } };
    const info = await fnErrorInfo(fakeError, { error: "do data", code: "x" });
    expect(info.message).toBe("do data");
  });

  it("retorna vazio quando não há corpo parseável (nunca lança)", async () => {
    expect(await fnErrorInfo(null, null)).toEqual({});
    expect(await fnErrorInfo(new Error("boom"))).toEqual({});
    // context.json que rejeita não deve derrubar
    const throwing = { context: { json: async () => { throw new Error("bad json"); } } };
    expect(await fnErrorInfo(throwing)).toEqual({});
  });
});

describe("refSuffix", () => {
  it("formata 'ref <id>' quando há request_id", () => {
    expect(refSuffix({ requestId: "abc12345" })).toBe("ref abc12345");
  });
  it("retorna undefined sem request_id", () => {
    expect(refSuffix({})).toBeUndefined();
    expect(refSuffix({ message: "x" })).toBeUndefined();
  });
});
