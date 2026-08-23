import { describe, it, expect, vi } from "vitest";
import {
  completeModuleWithDeliverable,
  submitModuleDeliverable,
} from "../moduleCompletion";

type Row = { id: string; reviewed_at: string | null } | null;

function makeClient(opts: {
  deliverable: Row;
  updateReturns?: { id: string }[];
  updateError?: unknown;
}) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn();
  const client = {
    from: (table: string) => {
      if (table === "student_module_progress") return { upsert };
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.deliverable, error: null }),
            }),
          }),
        }),
        update: (patch: Record<string, unknown>) => {
          update(patch);
          return {
            eq: () => ({
              select: async () => ({
                data: opts.updateReturns ?? [{ id: "d1" }],
                error: opts.updateError ?? null,
              }),
            }),
          };
        },
      };
    },
  };
  return { client, upsert, update };
}

describe("submitModuleDeliverable", () => {
  it("limpa marcadores de revisão ao reenviar", async () => {
    const { client, update } = makeClient({
      deliverable: { id: "d1", reviewed_at: "2026-08-01T00:00:00Z" },
    });
    const res = await submitModuleDeliverable(client, "u1", "m1");
    expect(res.submitted).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "enviado", reviewed_at: null, reviewer_id: null }),
    );
  });

  it("não faz nada quando não existe entrega", async () => {
    const { client, update } = makeClient({ deliverable: null });
    const res = await submitModuleDeliverable(client, "u1", "m1");
    expect(res.submitted).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("falha quando o update casa 0 linhas", async () => {
    const { client } = makeClient({
      deliverable: { id: "d1", reviewed_at: null },
      updateReturns: [],
    });
    await expect(submitModuleDeliverable(client, "u1", "m1")).rejects.toThrow();
  });
});

describe("completeModuleWithDeliverable", () => {
  it("não grava completed_at se o envio da entrega falhar", async () => {
    const { client, upsert } = makeClient({
      deliverable: { id: "d1", reviewed_at: null },
      updateError: { message: "rls" },
    });
    await expect(
      completeModuleWithDeliverable(client, { userId: "u1", moduleId: "m1" }),
    ).rejects.toBeTruthy();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("grava completed_at quando a entrega é enviada", async () => {
    const { client, upsert } = makeClient({ deliverable: { id: "d1", reviewed_at: null } });
    await completeModuleWithDeliverable(client, {
      userId: "u1",
      moduleId: "m1",
      startedAt: "2026-08-01T00:00:00Z",
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", module_id: "m1", started_at: "2026-08-01T00:00:00Z" }),
      { onConflict: "user_id,module_id" },
    );
  });
});
