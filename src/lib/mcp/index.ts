import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProgress from "./tools/get-my-progress";
import listModules from "./tools/list-modules";
import submitEvidence from "./tools/submit-evidence";
import adminListAtRisk from "./tools/admin-list-at-risk";

// issuer DIRETO do supabase (nunca o proxy .lovable.cloud). mcp-js
// rejeita token cujo issuer configurado difere do publicado no discovery.
// vite inlineia VITE_SUPABASE_PROJECT_ID em build time, então segue import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nachesu-mcp",
  title: "NachesU",
  version: "0.1.0",
  instructions:
    "Ferramentas da NachesU pra assistentes de IA. Use `get_my_progress` pra ver as eletivas do estudante logado, `list_modules` pra listar módulos liberados de uma eletiva, `submit_evidence` pra registrar entregas em nome do estudante (requer aprovação) e `admin_list_at_risk` (só admin) pra listar alertas ativos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProgress, listModules, submitEvidence, adminListAtRisk],
});
