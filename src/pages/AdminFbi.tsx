import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Cada aba é code-split: só o bundle da aba ativa é baixado.
const AdminPending = lazy(() => import("@/features/admin/AdminPending").then((m) => ({ default: m.AdminPending })));
const AdminMateriais = lazy(() => import("@/features/admin/AdminMateriais").then((m) => ({ default: m.AdminMateriais })));
const AdminEletivaSettings = lazy(() => import("@/features/admin/AdminEletivaSettings").then((m) => ({ default: m.AdminEletivaSettings })));
const AdminEletivas = lazy(() => import("@/features/admin/AdminEletivas").then((m) => ({ default: m.AdminEletivas })));
const AdminConvites = lazy(() => import("@/features/admin/AdminConvites").then((m) => ({ default: m.AdminConvites })));
const AdminEletivaReview = lazy(() => import("@/features/admin/AdminEletivaReview").then((m) => ({ default: m.AdminEletivaReview })));
const AdminTrilha = lazy(() => import("@/features/admin/AdminTrilha").then((m) => ({ default: m.AdminTrilha })));
const AdminTutorCommand = lazy(() => import("@/features/admin/AdminTutorCommand").then((m) => ({ default: m.AdminTutorCommand })));
const AdminFeedbackInbox = lazy(() => import("@/features/admin/AdminFeedbackInbox").then((m) => ({ default: m.AdminFeedbackInbox })));
const AdminNudgeTemplates = lazy(() => import("@/features/admin/AdminNudgeTemplates").then((m) => ({ default: m.AdminNudgeTemplates })));
const AdminRubrics = lazy(() => import("@/features/admin/AdminRubrics").then((m) => ({ default: m.AdminRubrics })));
const AdminCopyAudit = lazy(() => import("@/features/admin/AdminCopyAudit").then((m) => ({ default: m.AdminCopyAudit })));
const AdminAutosaveAudit = lazy(() => import("@/features/admin/AdminAutosaveAudit").then((m) => ({ default: m.AdminAutosaveAudit })));
const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminPublicacao = lazy(() => import("@/features/admin/AdminPublicacao").then((m) => ({ default: m.AdminPublicacao })));
const AdminAuditoria = lazy(() => import("@/features/admin/AdminAuditoria").then((m) => ({ default: m.AdminAuditoria })));

const VALID_TABS = ["publicacao", "auditoria", "eletivas", "convites", "review", "eletiva", "trilha", "tutor", "respostas", "feedback", "autosave", "copy-audit", "materiais", "pending", "usuarios", "nudges", "rubricas"] as const;
type AdminTab = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<AdminTab, string> = {
  publicacao: "publicação & visibilidade",
  auditoria: "auditoria",
  eletivas: "eletivas · cursos",
  convites: "convites · email",
  review: "eletivas · revisão",
  eletiva: "eletiva · settings",
  trilha: "eletiva · trilha",
  tutor: "eletiva · tutor IA",
  respostas: "respostas dos estudantes",
  feedback: "respostas dos estudantes",
  "copy-audit": "auditoria · copy",
  autosave: "auditoria · autosave",
  materiais: "materiais hub",
  pending: "pendentes",
  usuarios: "usuários",
  nudges: "nudges · evasão",
  rubricas: "rubricas",
};

const TabFallback = () => (
  <div className="py-12 text-center text-perestroika-preto/50 text-sm">
    carregando…
  </div>
);

const TAB_COMPONENTS: Record<AdminTab, React.ComponentType> = {
  publicacao: AdminPublicacao,
  auditoria: AdminAuditoria,
  eletivas: AdminEletivas,
  convites: AdminConvites,
  review: AdminEletivaReview,
  eletiva: AdminEletivaSettings,
  trilha: AdminTrilha,
  tutor: AdminTutorCommand,
  feedback: AdminFeedbackInbox,
  respostas: AdminFeedbackInbox,
  "copy-audit": AdminCopyAudit,
  autosave: AdminAutosaveAudit,
  materiais: AdminMateriais,
  pending: AdminPending,
  usuarios: AdminUsers,
  nudges: AdminNudgeTemplates,
  rubricas: AdminRubrics,
};

const AdminFbi = () => {
  useAuth();
  const navigate = useNavigate();
  const { tab: tabFromPath } = useParams<{ tab?: string }>();
  const [searchParams] = useSearchParams();
  const routePrefix = "/admin";
  const tabRaw = tabFromPath ?? searchParams.get("tab") ?? "";
  const currentTab: AdminTab = (VALID_TABS as readonly string[]).includes(tabRaw)
    ? (tabRaw as AdminTab)
    : "eletivas";

  // Mantém URL canônica: /admin/:tab (move ?tab= legacy pro path).
  useEffect(() => {
    if (!tabFromPath && searchParams.get("tab")) {
      const params = new URLSearchParams(searchParams);
      params.delete("tab");
      const qs = params.toString();
      navigate(`${routePrefix}/${currentTab}${qs ? `?${qs}` : ""}`, { replace: true });
    }
  }, [tabFromPath, searchParams, currentTab, navigate, routePrefix]);

  // alias: /admin/feedback → /admin/respostas
  useEffect(() => {
    if (currentTab === "feedback") {
      navigate(`${routePrefix}/respostas`, { replace: true });
    }
  }, [currentTab, navigate, routePrefix]);

  const ActiveTab = TAB_COMPONENTS[currentTab];

  return (
    <div className="text-perestroika-preto font-body">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <nav
              aria-label="breadcrumb"
              className="flex items-center gap-2 text-xs uppercase tracking-wide text-perestroika-preto/60"
            >
              <span>admin</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-perestroika-preto font-semibold">
                {TAB_LABELS[currentTab]}
              </span>
            </nav>
            <button
              type="button"
              aria-label="copiar url da aba"
              onClick={() => {
                const qs = searchParams.toString();
                const url = `${window.location.origin}${routePrefix}/${currentTab}${qs ? `?${qs}` : ""}`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success("link da aba copiado"),
                  () => toast.error("não consegui copiar"),
                );
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-perestroika-preto/40 hover:text-perestroika-preto hover:bg-perestroika-preto/5 transition-colors"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>

          <Suspense fallback={<TabFallback />}>
            <ActiveTab />
          </Suspense>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminFbi;
