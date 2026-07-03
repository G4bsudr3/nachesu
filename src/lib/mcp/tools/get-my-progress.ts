import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAsUser } from "../supabase-client";

export default defineTool({
  name: "get_my_progress",
  title: "Meu progresso na NachesU",
  description:
    "Lista as eletivas em que o estudante está matriculado, módulos concluídos, próximo módulo e progresso por trilha.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "não autenticado" }], isError: true };
    }
    const supabase = supabaseAsUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: enrollments }, { data: progress }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, course_id, status, created_at, courses(id, slug, title)")
        .eq("user_id", userId),
      supabase
        .from("student_module_progress")
        .select("module_id, status, updated_at")
        .eq("user_id", userId),
    ]);

    const payload = {
      email: ctx.getUserEmail(),
      enrollments: enrollments ?? [],
      module_progress: progress ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
