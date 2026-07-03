import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { isAdmin, supabaseAsUser } from "../supabase-client";

export default defineTool({
  name: "admin_list_at_risk",
  title: "Admin: estudantes em risco",
  description:
    "Só admin. Lista alertas ativos de evasão / ativação pendente. Usa `student_alerts` respeitando has_role(admin).",
  inputSchema: {
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "não autenticado" }], isError: true };
    }
    if (!(await isAdmin(ctx))) {
      return {
        content: [{ type: "text", text: "acesso negado: essa ferramenta é só pra admin" }],
        isError: true,
      };
    }

    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("student_alerts")
      .select("id, user_id, alert_type, severity, reason, created_at, resolved_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
