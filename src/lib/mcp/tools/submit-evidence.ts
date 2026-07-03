import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAsUser } from "../supabase-client";

export default defineTool({
  name: "submit_evidence",
  title: "Registrar evidência de módulo",
  description:
    "Envia o registro/síntese do PBL de um módulo em nome do estudante. Grava em `module_deliverables` respeitando RLS.",
  inputSchema: {
    module_id: z.string().uuid().describe("uuid do módulo (use list_modules pra descobrir)"),
    content: z
      .string()
      .min(10)
      .max(4000)
      .describe("texto da síntese/registro da entrega, 10 a 4000 caracteres"),
    link: z
      .string()
      .url()
      .nullable()
      .describe("link opcional do projeto/artefato. passe null se não tiver"),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ module_id, content, link }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "não autenticado" }], isError: true };
    }
    const supabase = supabaseAsUser(ctx);

    const { data, error } = await supabase
      .from("module_deliverables")
      .insert({
        module_id,
        user_id: ctx.getUserId(),
        content,
        link,
        status: "submitted",
      })
      .select()
      .single();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [
        { type: "text", text: `entrega registrada. id=${data.id}` },
      ],
      structuredContent: { deliverable: data },
    };
  },
});
