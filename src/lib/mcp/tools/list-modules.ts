import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAsUser } from "../supabase-client";

export default defineTool({
  name: "list_modules",
  title: "Listar módulos liberados",
  description:
    "Lista módulos + pílulas de uma eletiva. Respeita `module_releases`: só retorna módulos que já foram liberados pela turma.",
  inputSchema: {
    course_slug: z
      .string()
      .min(1)
      .describe("slug da eletiva, ex: 'ia-na-pratica' ou 'economia-circular'"),
    include_pills: z
      .boolean()
      .default(false)
      .describe("se true, inclui as pílulas de cada módulo"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ course_slug, include_pills }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "não autenticado" }], isError: true };
    }
    const supabase = supabaseAsUser(ctx);

    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, slug, title, description")
      .eq("slug", course_slug)
      .maybeSingle();
    if (courseErr || !course) {
      return {
        content: [{ type: "text", text: `eletiva '${course_slug}' não encontrada` }],
        isError: true,
      };
    }

    const select = include_pills
      ? "id, number, title, summary, trail_id, module_pills(id, kind, title, duration_min, order_index)"
      : "id, number, title, summary, trail_id";

    const { data: modules, error } = await supabase
      .from("modules")
      .select(select)
      .eq("course_id", course.id)
      .order("number");

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const payload = { course, modules: modules ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
