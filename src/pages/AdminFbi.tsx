import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useMatch } from "react-router-dom";
import { useUrlState } from "@/hooks/useUrlState";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Copy, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdminStats } from "@/features/admin/AdminStats";
import { AdminPrework } from "@/features/admin/AdminPrework";
import { AdminMissions } from "@/features/admin/AdminMissions";
import { AdminPending } from "@/features/admin/AdminPending";
import { AdminCards } from "@/features/admin/AdminCards";
import { AdminArtworks } from "@/features/admin/AdminArtworks";
import { AdminEmails } from "@/features/admin/AdminEmails";
import { AdminConvidados } from "@/features/admin/AdminConvidados";
import { AdminMateriais } from "@/features/admin/AdminMateriais";
import { AdminFeedbackDia1 } from "@/features/admin/AdminFeedbackDia1";
import { AdminFeedbackFinal } from "@/features/admin/AdminFeedbackFinal";
import { AdminFutureLetters } from "@/features/admin/AdminFutureLetters";
import { AdminVotacaoProjetos } from "@/features/admin/AdminVotacaoProjetos";
import { AdminChoraBot } from "@/features/admin/AdminChoraBot";
import { AdminEletivaSettings } from "@/features/admin/AdminEletivaSettings";
import { AdminEletivas } from "@/features/admin/AdminEletivas";
import { AdminEletivaReview } from "@/features/admin/AdminEletivaReview";
import { AdminTrilha } from "@/features/admin/AdminTrilha";
import { AdminTutor } from "@/features/admin/AdminTutor";
import { AdminFeedbackInbox } from "@/features/admin/AdminFeedbackInbox";
import { AdminNudgeTemplates } from "@/features/admin/AdminNudgeTemplates";
import { AdminRubrics } from "@/features/admin/AdminRubrics";
import AdminUsers from "./AdminUsers";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type FbiRow = Database["public"]["Tables"]["fbi_responses"]["Row"];

const EXPERIENCIA_OPTS = ["nunca-usei", "ja-mexi", "ja-publiquei", "uso-diario"];

const EXPERIENCIA_LABEL: Record<string, string> = {
  "nunca-usei": "nunca usei",
  "ja-mexi": "já mexi",
  "ja-publiquei": "já publiquei",
  "uso-diario": "uso diário",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeCsv = (val: unknown) => {
  if (val === null || val === undefined) return "";
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
};

const VALID_TABS = ["eletivas", "review", "eletiva", "trilha", "tutor", "feedback", "fbi", "prework", "missoes", "cartas", "artworks", "materiais", "pending", "usuarios", "convidados", "emails", "feedback-d1", "feedback-final", "carta-futuro", "votacao-projetos", "chora-bot"] as const;
type AdminTab = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<AdminTab, string> = {
  eletivas: "eletivas · cursos",
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
  convidados: "convidados",
  emails: "emails · log",
  "feedback-d1": "feedback dia 1",
  "feedback-final": "pesquisa final",
  "carta-futuro": "carta pro futuro",
  "votacao-projetos": "votação · projetos",
  "chora-bot": "chora bot",
};

const AdminFbi = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { tab: tabFromPath } = useParams<{ tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
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


  const [rows, setRows] = useState<FbiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useUrlState("fbi_q", "");
  const [cidadeFilter, setCidadeFilter] = useUrlState("fbi_cidade", "todas");
  const [expFilter, setExpFilter] = useUrlState("fbi_exp", "todos");
  const [selected, setSelected] = useState<FbiRow | null>(null);
  const LEGACY_TABS = ["fbi","prework","missoes","cartas","artworks","convidados","emails","feedback-d1","feedback-final","carta-futuro","votacao-projetos","chora-bot"];
  const [showLegacy, setShowLegacy] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("admin_show_legacy");
    if (stored !== null) return stored === "true";
    return LEGACY_TABS.includes(currentTab);
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_show_legacy", String(showLegacy));
    }
  }, [showLegacy]);
  // se navegar pra aba legado via URL, abre a seção
  useEffect(() => {
    if (LEGACY_TABS.includes(currentTab) && !showLegacy) setShowLegacy(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("fbi_responses")
      .select("*")
      .eq("submitted", true)
      .order("submitted_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          logger.error("[admin/fbi] erro:", error);
          toast.error("não foi possível carregar as respostas");
        } else {
          setRows(data ?? []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cidades = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.cidade) set.add(r.cidade.trim().toLowerCase());
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (cidadeFilter !== "todas" && r.cidade?.trim().toLowerCase() !== cidadeFilter) {
        return false;
      }
      if (expFilter !== "todos" && r.experiencia_lovable !== expFilter) {
        return false;
      }
      if (q) {
        const haystack = [r.nome, r.nickname, r.trabalho, r.cidade, r.instagram]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, cidadeFilter, expFilter]);

  const handleExportCsv = () => {
    const headers = [
      "submitted_at",
      "nome",
      "nickname",
      "whatsapp",
      "idade",
      "instagram",
      "linkedin",
      "trabalho",
      "cidade",
      "ja_fez_perestroika",
      "quais_cursos_perestroika",
      "restricao_alimentar",
      "locomocao",
      "expectativa_chora",
      "maior_desafio",
      "experiencia_lovable",
      "ultima_criacao_orgulho",
      "ideia_gaveta",
      "perde_nocao_tempo",
      "algo_mais",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      lines.push(headers.map((h) => escapeCsv((r as Record<string, unknown>)[h])).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fbi-respostas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`csv exportado (${filtered.length} respostas)`);
  };

  return (
    <div className="text-perestroika-preto font-body">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AdminStats />

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
                const url = `${window.location.origin}/admin/${currentTab}${qs ? `?${qs}` : ""}`;
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

          <Tabs
            value={currentTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            {/* operação NachesU (sempre visível, ordem por frequência de uso) */}
            <TabsList className="bg-perestroika-preto/5 mb-3 inline-flex flex-wrap h-auto">
              <TabsTrigger value="eletivas" className="uppercase tracking-wide text-xs">eletivas</TabsTrigger>
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

            <TabsContent value="fbi">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                  <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
                    fbi · respostas
                  </h1>
                  <p className="mt-3 text-perestroika-preto/70">
                    {loading ? "carregando…" : `${filtered.length} de ${rows.length} respostas enviadas`}
                  </p>
                </div>
                <button
                  onClick={handleExportCsv}
                  disabled={filtered.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                >
                  <Download className="w-4 h-4" />
                  exportar csv
                </button>
              </div>

              {/* filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/50" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="buscar por nome, apelido, trabalho, cidade…"
                    className="pl-9 bg-white/60 border-perestroika-preto/20"
                  />
                </div>
                <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
                  <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
                    <SelectValue placeholder="cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">todas as cidades</SelectItem>
                    {cidades.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={expFilter} onValueChange={setExpFilter}>
                  <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
                    <SelectValue placeholder="experiência lovable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">todas as experiências</SelectItem>
                    {EXPERIENCIA_OPTS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {EXPERIENCIA_LABEL[n] ?? n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* tabela */}
              <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
                      <TableHead className="uppercase text-xs tracking-wide">enviado</TableHead>
                      <TableHead className="uppercase text-xs tracking-wide">nome</TableHead>
                      <TableHead className="uppercase text-xs tracking-wide">cidade</TableHead>
                      <TableHead className="uppercase text-xs tracking-wide">trabalho</TableHead>
                      <TableHead className="uppercase text-xs tracking-wide">lovable</TableHead>
                      <TableHead className="uppercase text-xs tracking-wide">idade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                          carregando respostas…
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                          nenhuma resposta com esses filtros.
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      filtered.map((r) => (
                        <TableRow
                          key={r.id}
                          onClick={() => setSelected(r)}
                          className="cursor-pointer hover:bg-perestroika-preto/5"
                        >
                          <TableCell className="text-xs text-perestroika-preto/70 whitespace-nowrap">
                            {formatDate(r.submitted_at)}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{r.nome ?? "—"}</TableCell>
                          <TableCell className="text-perestroika-preto/80 whitespace-nowrap">{r.cidade ?? "—"}</TableCell>
                          <TableCell className="text-perestroika-preto/80">{r.trabalho ?? "—"}</TableCell>
                          <TableCell>
                            {r.experiencia_lovable ? (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {EXPERIENCIA_LABEL[r.experiencia_lovable] ?? r.experiencia_lovable}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-perestroika-preto/80">{r.idade ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="prework">
              <AdminPrework />
            </TabsContent>

            <TabsContent value="missoes">
              <AdminMissions />
            </TabsContent>

            <TabsContent value="cartas">
              <AdminCards />
            </TabsContent>

            <TabsContent value="artworks">
              <AdminArtworks />
            </TabsContent>

            <TabsContent value="materiais">
              <AdminMateriais />
            </TabsContent>

            <TabsContent value="pending">
              <AdminPending />
            </TabsContent>

            <TabsContent value="usuarios">
              <AdminUsers />
            </TabsContent>

            <TabsContent value="convidados">
              <AdminConvidados />
            </TabsContent>

            <TabsContent value="emails">
              <AdminEmails />
            </TabsContent>

            <TabsContent value="feedback-d1">
              <AdminFeedbackDia1 />
            </TabsContent>

            <TabsContent value="feedback-final">
              <AdminFeedbackFinal />
            </TabsContent>

            <TabsContent value="carta-futuro">
              <AdminFutureLetters />
            </TabsContent>

            <TabsContent value="votacao-projetos">
              <AdminVotacaoProjetos />
            </TabsContent>

            <TabsContent value="chora-bot">
              <AdminChoraBot />
            </TabsContent>

            <TabsContent value="eletivas">
              <AdminEletivas />
            </TabsContent>

            <TabsContent value="review">
              <AdminEletivaReview />
            </TabsContent>

            <TabsContent value="eletiva">
              <AdminEletivaSettings />
            </TabsContent>

            <TabsContent value="nudges">
              <AdminNudgeTemplates />
            </TabsContent>

            <TabsContent value="rubricas">
              <AdminRubrics />
            </TabsContent>

            <TabsContent value="trilha">
              <AdminTrilha />
            </TabsContent>

            <TabsContent value="tutor">
              <AdminTutor />
            </TabsContent>

            <TabsContent value="feedback">
              <AdminFeedbackInbox />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* dialog detalhes */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-perestroika-bege">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-3xl">
              {selected?.nome ?? "resposta fbi"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2 text-sm">
              <DetailRow label="apelido" value={selected.nickname} />
              <DetailRow label="whatsapp" value={selected.whatsapp} />
              <DetailRow label="idade" value={selected.idade?.toString() ?? null} />
              <DetailRow label="instagram" value={selected.instagram} />
              <DetailRow label="linkedin" value={selected.linkedin} link />
              <DetailRow label="trabalho" value={selected.trabalho} />
              <DetailRow label="cidade" value={selected.cidade} />
              <DetailRow
                label="já fez perestroika?"
                value={selected.ja_fez_perestroika === "sim" ? "sim" : selected.ja_fez_perestroika === "nao" ? "não" : null}
              />
              <DetailRow label="quais cursos" value={selected.quais_cursos_perestroika} multiline />
              <DetailRow label="restrição alimentar" value={selected.restricao_alimentar} multiline />
              <DetailRow label="locomoção" value={selected.locomocao} multiline />
              <DetailRow label="expectativa da eletiva" value={selected.expectativa_chora} multiline />
              <DetailRow label="maior desafio" value={selected.maior_desafio} multiline />
              <DetailRow
                label="experiência lovable"
                value={selected.experiencia_lovable ? EXPERIENCIA_LABEL[selected.experiencia_lovable] ?? selected.experiencia_lovable : null}
              />
              <DetailRow label="última criação orgulho" value={selected.ultima_criacao_orgulho} multiline />
              <DetailRow label="ideia na gaveta" value={selected.ideia_gaveta} multiline />
              <DetailRow label="perde noção do tempo" value={selected.perde_nocao_tempo} multiline />
              <DetailRow label="algo mais" value={selected.algo_mais} multiline />
              <div className="pt-3 border-t border-perestroika-preto/10 text-xs text-perestroika-preto/50">
                enviado em {formatDate(selected.submitted_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  multiline,
  link,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  link?: boolean;
}) => (
  <div>
    <div className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-1">{label}</div>
    {value ? (
      link ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-perestroika-preto underline hover:opacity-70 break-all"
        >
          {value}
        </a>
      ) : (
        <div className={`text-perestroika-preto ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</div>
      )
    ) : (
      <div className="text-perestroika-preto/30">—</div>
    )}
  </div>
);

export default AdminFbi;
