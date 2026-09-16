import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { MigrationRequestSchema } from "./schema.ts";

Deno.test("aceita uma migração pequena e retomável", () => {
  const result = MigrationRequestSchema.safeParse({ bucket: "radar-evidences", cursor: "pasta/a.jpg", batch_size: 5 });
  assert(result.success);
  if (result.success) assertEquals(result.data.batch_size, 5);
});

Deno.test("rejeita bucket e lote inválidos", () => {
  assert(!MigrationRequestSchema.safeParse({ bucket: "../privado", batch_size: 100 }).success);
});