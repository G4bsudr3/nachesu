import { z } from "npm:zod@4.1.12";

export const MigrationRequestSchema = z.object({
  bucket: z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  cursor: z.string().max(2048).optional(),
  batch_size: z.number().int().min(1).max(25).default(5),
});
