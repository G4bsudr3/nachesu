import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, useMatch } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Cada aba é code-split: só o bundle da aba ativa é baixado.
const AdminPrework = lazy(() => import("@/features/admin/AdminPrework").then((m) => ({ default: m.AdminPrework })));
const AdminMissions = lazy(() => import("@/features/admin/AdminMissions").then((m) => ({ default: m.AdminMissions })));
const AdminPending = lazy(() => import("@/features/admin/AdminPending").then((m) => ({ default: m.AdminPending })));
const AdminCards = lazy(() => import("@/features/admin/AdminCards").then((m) => ({ default: m.AdminCards })));
const AdminArtworks = lazy(() => import("@/features/admin/AdminArtworks").then((m) => ({ default: m.AdminArtworks })));
const AdminEmails = lazy(() => import("@/features/admin/AdminEmails").then((m) => ({ default: m.AdminEmails })));
const AdminConvidados = lazy(() => import("@/features/admin/AdminConvidados").then((m) => ({ default: m.AdminConvidados })));
const AdminMateriais = lazy(() => import("@/features/admin/AdminMateriais").then((m) => ({ default: m.AdminMateriais })));
const AdminFeedbackDia1 = lazy(() => import("@/features/admin/AdminFeedbackDia1").then((m) => ({ default: m.AdminFeedbackDia1 })));
const AdminFeedbackFinal = lazy(() => import("@/features/admin/AdminFeedbackFinal").then((m) => ({ default: m.AdminFeedbackFinal })));
const AdminFutureLetters = lazy(() => import("@/features/admin/AdminFutureLetters").then((m) => ({ default: m.AdminFutureLetters })));
const AdminVotacaoProjetos = lazy(() => import("@/features/admin/AdminVotacaoProjetos").then((m) => ({ default: m.AdminVotacaoProjetos })));
const AdminChoraBot = lazy(() => import("@/features/admin/AdminChoraBot").then((m) => ({ default: m.AdminChoraBot })));
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
const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminFbiResponses = lazy(() => import("@/features/admin/AdminFbiResponses"));

const VALID_TABS = ["eletivas", "convites", "review", "eletiva", "trilha", "tutor", "feedback", "copy-audit", "fbi", "prework", "missoes", "cartas", "artworks", "materiais", "pending", "usuarios", "nudges", "rubricas", "convidados", "emails", "feedback-d1", "feedback-final", "carta-futuro", "votacao-projetos", "chora-bot"] as const;
type AdminTab = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<AdminTab, string> = {
  eletivas: "eletivas · cursos",
  convites: "convites · email",
  review: "eletivas · revisão",
  eletiva: "eletiva · settings",
  trilha: "eletiva · trilha",
  tutor: "eletiva · tutor IA",
  feedback: "feedback · inbox",
  fbi: "fbi · respostas",
  prework: "pré-work",
  missoes: "missões",
  cartas: "cartas",
  artworks: "artworks",
  materiais: "materiais hub",
  pending: "pendentes",
  usuarios: "usuários",
  nudges: "nudges · evasão",
  rubricas: "rubricas",
  convidados: "convidados",
  emails: "emails · log",
  "feedback-d1": "feedback dia 1",
  "feedback-final": "pesquisa final",
  "carta-futuro": "carta pro futuro",
  "votacao-projetos": "votação · projetos",
  "chora-bot": "chora bot",
};

const LEGACY_TABS: AdminTab[] = ["fbi","prework","missoes","cartas","artworks","convidados","emails","feedback-d1","feedback-final","carta-futuro","votacao-projetos","chora-bot"];

const TabFallback = () => (
  <div className="py-12 text-center text-perestroika-preto/50 text-sm">
    carregando…
  </div>
);

// Map estático aba → componente. Só o componente da aba ativa é renderizado/baixado.
const TAB_COMPONENTS: Record<AdminTab, React.ComponentType> = {
  eletivas: AdminEletivas,
  convites: AdminConvites,
  review: AdminEletivaReview,
  eletiva: AdminEletivaSettings,
  trilha: AdminTrilha,
  tutor: AdminTutorCommand,
  feedback: AdminFeedbackInbox,
  materiais: AdminMateriais,
  pending: AdminPending,
  usuarios: AdminUsers,
  nudges: AdminNudgeTemplates,
  rubricas: AdminRubrics,
  fbi: AdminFbiResponses,
  prework: AdminPrework,
  missoes: AdminMissions,
  cartas: AdminCards,
  artworks: AdminArtworks,
  convidados: AdminConvidados,
  emails: AdminEmails,
  "feedback-d1": AdminFeedbackDia1,
  "feedback-final": AdminFeedbackFinal,
  "carta-futuro": AdminFutureLetters,
  "votacao-projetos": AdminVotacaoProjetos,
  "chora-bot": AdminChoraBot,
};

const AdminFbi = () => {
  useAuth();
  const navigate = useNavigate();
  const { tab: tabFromPath } = useParams<{ tab?: string }>();
  const [searchParams] = useSearchParams();
  const inLegado = !!useMatch("/admin/legado/*");
  const routePrefix = inLegado ? "/admin/legado" : "/admin";
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

  const handleTabChange = (v: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete("tab");
    const qs = params.toString();
    navigate(`${routePrefix}/${v}${qs ? `?${qs}` : ""}`, { replace: true });
  };

  const [showLegacy, setShowLegacy] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("admin_show_legacy");
    if (stored !== null) return stored === "true";
    return (LEGACY_TABS as string[]).includes(currentTab);
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_show_legacy", String(showLegacy));
    }
  }, [showLegacy]);
  useEffect(() => {
    if ((LEGACY_TABS as string[]).includes(currentTab) && !showLegacy) setShowLegacy(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

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
              onClick={() => {
                const qs = searchParams.toString();
                const url = `${window.location.origin}${routePrefix}/${currentTab}${qs ? `?${qs}` : ""}`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success("link da aba copiado"),
                  () => toast.error("não consegui copiar"),
                );
              }}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/50 hover:text-perestroika-preto transition-colors"
            >
              <Copy className="w-3 h-3" />
              copiar link
            </button>
          </div>

          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            {/* operação NachesU */}
            <TabsList className="bg-perestroika-preto/5 mb-3 inline-flex flex-wrap h-auto">
              <TabsTrigger value="eletivas" className="uppercase tracking-wide text-xs">eletivas</TabsTrigger>
              <TabsTrigger value="convites" className="uppercase tracking-wide text-xs">convites</TabsTrigger>
              <TabsTrigger value="review" className="uppercase tracking-wide text-xs">revisão</TabsTrigger>
              <TabsTrigger value="trilha" className="uppercase tracking-wide text-xs">trilha</TabsTrigger>
              <TabsTrigger value="tutor" className="uppercase tracking-wide text-xs">tutor IA</TabsTrigger>
              <TabsTrigger value="feedback" className="uppercase tracking-wide text-xs">feedback</TabsTrigger>
              <TabsTrigger value="materiais" className="uppercase tracking-wide text-xs">materiais</TabsTrigger>
              <TabsTrigger value="pending" className="uppercase tracking-wide text-xs">pendentes</TabsTrigger>
              <TabsTrigger value="usuarios" className="uppercase tracking-wide text-xs">usuários</TabsTrigger>
              <TabsTrigger value="nudges" className="uppercase tracking-wide text-xs">nudges</TabsTrigger>
              <TabsTrigger value="rubricas" className="uppercase tracking-wide text-xs">rubricas</TabsTrigger>
              <TabsTrigger value="eletiva" className="uppercase tracking-wide text-xs">settings</TabsTrigger>
            </TabsList>

            <div className="mt-2 border-t border-dashed border-perestroika-preto/15 pt-3">
              <button
                type="button"
                onClick={() => setShowLegacy((v) => !v)}
                className="mb-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/40 hover:text-perestroika-preto transition-colors"
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showLegacy ? "" : "-rotate-90"}`}
                />
                ferramentas Chŏra (legado)
              </button>
            </div>

            {showLegacy && (
              <TabsList className="bg-perestroika-preto/[0.03] border border-dashed border-perestroika-preto/15 mb-6 inline-flex flex-wrap h-auto">
                <TabsTrigger value="fbi" className="uppercase tracking-wide text-xs">fbi</TabsTrigger>
                <TabsTrigger value="prework" className="uppercase tracking-wide text-xs">pré-work</TabsTrigger>
                <TabsTrigger value="missoes" className="uppercase tracking-wide text-xs">missões</TabsTrigger>
                <TabsTrigger value="cartas" className="uppercase tracking-wide text-xs">cartas</TabsTrigger>
                <TabsTrigger value="artworks" className="uppercase tracking-wide text-xs">artworks</TabsTrigger>
                <TabsTrigger value="convidados" className="uppercase tracking-wide text-xs">convidados</TabsTrigger>
                <TabsTrigger value="emails" className="uppercase tracking-wide text-xs">emails</TabsTrigger>
                <TabsTrigger value="feedback-d1" className="uppercase tracking-wide text-xs">feedback dia 1</TabsTrigger>
                <TabsTrigger value="feedback-final" className="uppercase tracking-wide text-xs">pesquisa final</TabsTrigger>
                <TabsTrigger value="carta-futuro" className="uppercase tracking-wide text-xs">carta futuro</TabsTrigger>
                <TabsTrigger value="votacao-projetos" className="uppercase tracking-wide text-xs">votação projetos</TabsTrigger>
                <TabsTrigger value="chora-bot" className="uppercase tracking-wide text-xs">chora bot</TabsTrigger>
              </TabsList>
            )}
            {!showLegacy && <div className="mb-3" />}

            {/* Só monta o conteúdo da aba ativa. Os demais TabsContent ficam ausentes,
                então React/Vite nem importa os outros módulos. */}
            <TabsContent value={currentTab} forceMount>
              <Suspense fallback={<TabFallback />}>
                <ActiveTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminFbi;
