import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, Inbox, Loader2, RefreshCcw, Search, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useStudentRoster } from "@/hooks/useStudentRoster";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePendingDeliverables,
  type DeliverableInbox,
  type InboxFilter,
} from "./usePendingDeliverables";
import { FeedbackReviewDrawer } from "./FeedbackReviewDrawer";
import { useAiTriage, type TriageVerdict } from "./useAiTriage";
import { AiTriageBadge } from "./AiTriageBadge";

const timeAgo = (iso: string | null) => {
  if (!iso) return "–";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportCsv = (rows: DeliverableInbox[]) => {
  if (rows.length === 0) return;
  const header = [
    "estudante",
    "apelido",
    "user_id",
    "modulo_numero",
    "modulo_titulo",
    "status",
    "nota",
    "enviado_em",
    "revisado_em",
    "feedback",
  ];
  const lines = rows.map((d) =>
    [
      d.profile?.display_name ?? "",
      d.profile?.nickname ?? "",
      d.user_id,
      d.module?.number ?? "",
      d.module?.title ?? "",
      d.status,
      d.score ?? "",
      d.submitted_at ?? "",
      d.reviewed_at ?? "",
      (d.feedback ?? "").replace(/\n/g, " "),
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `nachesu-feedback-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** força re-render a cada minuto pra "há Xmin" não congelar */
const useNow = () => {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
};

export const AdminFeedbackInbox = ({
  title = "respostas dos estudantes",
  defaultStatus = "todos",
}: {
  title?: string;
  defaultStatus?: InboxFilter;
} = {}) => {
  useNow();
  const [statusFilter, setStatusFilter] = useState<InboxFilter>(defaultStatus);

  const [courseId, setCourseId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeliverableInbox | null>(null);
  const [search, setSearch] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
  const [verdictFilter, setVerdictFilter] = useState<TriageVerdict | "todos">("todos");
  const { lookupByCode } = useStudentRoster();
  const triage = useAiTriage({ courseId, moduleId });


  const { data: courses } = useQuery({
    queryKey: ["admin-feedback-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["admin-feedback-modules", courseId],
    queryFn: async () => {
      // se courseId, filtra via trails
      let trailIds: string[] | null = null;
      if (courseId) {
        const { data: trails } = await supabase
          .from("trails")
          .select("id")
          .eq("course_id", courseId);
        trailIds = (trails ?? []).map((t) => t.id);
        if (trailIds.length === 0) return [];
      }
      const q = supabase.from("modules").select("id, number, title").order("number");
      const { data, error } = trailIds ? await q.in("trail_id", trailIds) : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const {
    data,
    all,
    pendingCount,
    ajusteCount,
    rascunhoCount,
    rascunhoCompleteCount,
    revisadosCount,
    totalCount,
    testCount,
    isLoading,
    refetch,
  } = usePendingDeliverables({
    courseId,
    moduleId,
    status: statusFilter,
    includeTest,
  });

  const qc = useQueryClient();
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // candidatas a auto-envio: rascunhos completos respeitando filtros de curso/módulo
  // (não respeita o filtro de status — o admin quer agir em todas as elegíveis)
  const bulkCandidates = useMemo(
    () =>
      all.filter((d) => {
        const isDraft = d.submitted_at === null && d.status === "rascunho";
        if (!isDraft || !d.completeness.isComplete) return false;
        if (courseId && d.course_id !== courseId) return false;
        if (moduleId && d.module_id !== moduleId) return false;
        return true;
      }),
    [all, courseId, moduleId],
  );

  const bulkSubmitMutation = useMutation({
    mutationFn: async (rows: DeliverableInbox[]) => {
      let ok = 0;
      const errors: string[] = [];
      for (const d of rows) {
        const { error } = await supabase.rpc("admin_submit_deliverable", { p_id: d.id });
        if (error) {
          errors.push(
            `${d.profile?.display_name ?? d.user_id.slice(0, 8)} · ${error.message}`,
          );
        } else {
          ok += 1;
        }
      }
      return { ok, errors };
    },
    onSuccess: ({ ok, errors }) => {
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
      if (ok > 0) {
        toast.success(
          `${ok} rascunho${ok === 1 ? "" : "s"} marcado${ok === 1 ? "" : "s"} como enviado${ok === 1 ? "" : "s"}`,
        );
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} falharam. ex: ${errors[0]}`);
      }
      setBulkConfirmOpen(false);
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "falha ao processar lote");
    },
  });

  // realtime: refetch quando entrega muda
  useEffect(() => {
    const channel = supabase
      .channel("admin-feedback-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "module_deliverables" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const searchTerm = search.trim().toLowerCase();
  const aiReviews = triage.reviews;
  const filteredData = useMemo(() => {
    let list = data;
    if (verdictFilter !== "todos") {
      list = list.filter((d) => aiReviews.get(d.id)?.verdict === verdictFilter);
    }
    if (!searchTerm) return list;
    return list.filter((d) => {
      const roster = lookupByCode(d.profile?.nickname ?? d.profile?.display_name ?? null);
      const haystack = [
        d.profile?.display_name,
        d.profile?.nickname,
        roster?.full_name,
        roster?.ra,
        roster?.turma,
        d.module?.title,
        d.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [data, searchTerm, lookupByCode, verdictFilter, aiReviews]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            {title}

          </h1>
          <p className="mt-3 text-perestroika-preto/70 inline-flex items-center gap-3 flex-wrap">
            <Inbox className="w-4 h-4" />
            {isLoading
              ? "carregando…"
              : `${totalCount} respostas · ${pendingCount} pendentes · ${ajusteCount} em ajuste · ${rascunhoCompleteCount} rascunhos completos · ${rascunhoCount} em rascunho · ${revisadosCount} revisadas`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
              className="accent-perestroika-preto"
            />
            incluir teste{testCount > 0 ? ` (${testCount})` : ""}
          </label>
          <button
            type="button"
            onClick={() => triage.run(40)}
            disabled={triage.running || triage.pending === 0}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-rosa text-white px-4 py-2 text-xs uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            title="a ia lê as entregas pendentes e marca ok, revisar ou atenção. ela nunca aprova nada sozinha."
          >
            {triage.running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {triage.running && triage.progress
              ? `triando ${triage.progress.done}/${triage.progress.total}`
              : `triar com ia${triage.pending > 0 ? ` (${triage.pending})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => setBulkConfirmOpen(true)}
            disabled={bulkCandidates.length === 0 || bulkSubmitMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-azul text-white px-4 py-2 text-xs uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              bulkCandidates.length === 0
                ? "nenhum rascunho completo no escopo atual"
                : `marca como enviado os ${bulkCandidates.length} rascunhos completos`
            }
          >
            {bulkSubmitMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            enviar {bulkCandidates.length > 0 ? `(${bulkCandidates.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => exportCsv(filteredData)}
            disabled={filteredData.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-40 disabled:cursor-not-allowed"
            title="exporta a lista filtrada como csv"
          >
            <Download className="w-3.5 h-3.5" />
            csv
          </button>
          <button
            type="button"
            onClick={async () => {
              await refetch();
              toast.success("respostas atualizadas");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/10"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            atualizar
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Select
          value={courseId ?? "todos"}
          onValueChange={(v) => {
            setCourseId(v === "todos" ? null : v);
            setModuleId(null);
          }}
        >
          <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/15">
            <SelectValue placeholder="curso" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={6} className="max-h-[60vh] overflow-y-auto">
            <SelectItem value="todos">todos os cursos</SelectItem>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={moduleId ?? "todos"}
          onValueChange={(v) => setModuleId(v === "todos" ? null : v)}
        >
          <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/15">
            <SelectValue placeholder="módulo" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={6} className="max-h-[60vh] overflow-y-auto">
            <SelectItem value="todos">todos os módulos</SelectItem>
            {(modules ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {String(m.number).padStart(2, "0")} · {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InboxFilter)}>
          <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/15">
            <SelectValue placeholder="status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">pendentes</SelectItem>
            <SelectItem value="rascunho-completo">rascunho completo</SelectItem>
            <SelectItem value="rascunho">em rascunho</SelectItem>
            <SelectItem value="ajuste">em ajuste</SelectItem>
            <SelectItem value="revisados">revisados</SelectItem>
            <SelectItem value="todos">todos</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={verdictFilter}
          onValueChange={(v) => setVerdictFilter(v as TriageVerdict | "todos")}
        >
          <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/15">
            <SelectValue placeholder="triagem ia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">toda triagem ia</SelectItem>
            <SelectItem value="atencao">ia: atenção</SelectItem>
            <SelectItem value="revisar">ia: revisar</SelectItem>
            <SelectItem value="ok">ia: ok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/60 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar por nome ou apelido do estudante…"
          className="pl-9 bg-perestroika-bege/60 border-perestroika-preto/15"
        />
      </div>

      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
        {isLoading ? "carregando…" : `${filteredData.length} ${filteredData.length === 1 ? "entrega" : "entregas"} nesse recorte`}
      </p>
      <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">estudante</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">módulo</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">enviado</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
              <TableHead className="sticky right-0 bg-perestroika-bege shadow-[-8px_0_8px_-8px_rgba(9,9,9,0.15)]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-perestroika-preto/50">
                  carregando entregas…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-perestroika-preto/50">
                  {searchTerm
                    ? "nenhum estudante bate com essa busca."
                    : "nada por aqui. fila vazia é boa notícia."}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              filteredData.map((d) => {
                const code = d.profile?.nickname ?? d.profile?.display_name ?? null;
                const roster = lookupByCode(code);
                const name =
                  roster?.full_name ?? d.profile?.display_name ?? d.profile?.nickname ?? d.user_id.slice(0, 8);

                const isDraft = d.submitted_at === null && d.status === "rascunho";
                const waitingDays = d.submitted_at && !d.reviewed_at
                  ? Math.floor((Date.now() - new Date(d.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const sla: "ok" | "warn" | "late" =
                  waitingDays === null
                    ? "ok"
                    : waitingDays >= 7
                      ? "late"
                      : waitingDays >= 3
                        ? "warn"
                        : "ok";
                return (
                  <TableRow key={d.id} className="hover:bg-perestroika-preto/5">
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/aluno/${d.user_id}`}
                        className="hover:underline"
                      >
                        {name}
                      </Link>
                      {roster && code && (
                        <span className="block text-[11px] font-normal uppercase tracking-wide text-perestroika-preto/50">
                          {[code, roster.turma].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">

                      {d.module
                        ? `${String(d.module.number).padStart(2, "0")} · ${d.module.title}`
                        : "–"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {isDraft ? (
                        <span
                          className="text-perestroika-preto/55 italic"
                          title="rascunho ainda não enviado pro educador"
                        >
                          rascunho há {timeAgo(d.updated_at)}
                        </span>
                      ) : (
                        <span
                          className={
                            sla === "late"
                              ? "text-perestroika-vermelho font-medium"
                              : sla === "warn"
                                ? "text-perestroika-laranja font-medium"
                                : "text-perestroika-preto/70"
                          }
                          title={sla === "late" ? "passou de 7 dias" : sla === "warn" ? "passou de 3 dias" : undefined}
                        >
                          há {timeAgo(d.submitted_at)}
                          {sla !== "ok" && " ⚠"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isDraft && d.completeness.isComplete ? (
                        <div className="flex flex-col gap-1">
                          <Badge
                            className="bg-perestroika-azul text-white uppercase text-[10px] w-fit"
                            title="estudante preencheu tudo, só falta apertar enviar"
                          >
                            rascunho completo
                          </Badge>
                          <span className="text-[10px] text-perestroika-azul/80 tabular-nums">
                            {d.completeness.requiredAnswered}/
                            {d.completeness.requiredTotal} obrigatórias
                          </span>
                        </div>
                      ) : isDraft ? (
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <Badge
                            variant="outline"
                            className="uppercase text-[10px] border-perestroika-preto/30 text-perestroika-preto/60 w-fit"
                            title={
                              d.completeness.requiredTotal > 0
                                ? `${d.completeness.requiredAnswered}/${d.completeness.requiredTotal} obrigatórias respondidas; faltam ${d.completeness.missing.length}`
                                : "rascunho sem pílulas obrigatórias mapeadas"
                            }
                          >
                            rascunho
                          </Badge>
                          {d.completeness.requiredTotal > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1 flex-1 rounded-full bg-perestroika-preto/10 overflow-hidden">
                                <div
                                  className="h-full bg-perestroika-laranja"
                                  style={{
                                    width: `${Math.round(
                                      (d.completeness.requiredAnswered /
                                        d.completeness.requiredTotal) *
                                        100,
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-perestroika-preto/55 tabular-nums shrink-0">
                                {d.completeness.requiredAnswered}/
                                {d.completeness.requiredTotal}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : d.status === "ajuste" ? (
                        <Badge className="bg-[#fd4644] text-white uppercase text-[10px]">
                          ajuste
                        </Badge>
                      ) : d.reviewed_at ? (
                        <Badge variant="outline" className="uppercase text-[10px]">
                          revisado
                        </Badge>
                      ) : (
                        <Badge className="bg-perestroika-laranja text-white uppercase text-[10px]">
                          pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-perestroika-bege shadow-[-8px_0_8px_-8px_rgba(9,9,9,0.15)]">
                      <button
                        type="button"
                        onClick={() => setSelected(d)}
                        className="text-xs uppercase tracking-wide underline hover:no-underline min-h-11 px-3 touch-manipulation"
                      >
                        {isDraft ? "ver rascunho" : "revisar"}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <FeedbackReviewDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        deliverable={selected}
        position={
          selected
            ? {
                index: filteredData.findIndex((d) => d.id === selected.id),
                total: filteredData.length,
              }
            : undefined
        }
        onPrev={(() => {
          if (!selected) return undefined;
          const i = filteredData.findIndex((d) => d.id === selected.id);
          if (i <= 0) return undefined;
          return () => setSelected(filteredData[i - 1]);
        })()}
        onNext={(() => {
          if (!selected) return undefined;
          const i = filteredData.findIndex((d) => d.id === selected.id);
          if (i < 0 || i >= filteredData.length - 1) return undefined;
          return () => setSelected(filteredData[i + 1]);
        })()}
      />

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              marcar {bulkCandidates.length} rascunho{bulkCandidates.length === 1 ? "" : "s"} como enviado{bulkCandidates.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  isso muda o status dessas entregas pra <strong>enviado</strong>{" "}
                  em nome dos estudantes. cada uma vai pra fila de revisão e o
                  estudante recebe a mensagem automática "rascunho marcado como
                  enviado pelo educador". não dá pra desfazer em lote — só
                  reabrindo uma a uma.
                </p>
                {(courseId || moduleId) && (
                  <p className="text-xs text-perestroika-preto/60">
                    aplica só ao escopo selecionado (curso/módulo nos filtros).
                  </p>
                )}
                {bulkCandidates.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-perestroika-preto/15 bg-perestroika-preto/[0.03] p-2">
                    <ul className="text-xs space-y-1">
                      {bulkCandidates.slice(0, 20).map((d) => (
                        <li key={d.id} className="flex justify-between gap-3">
                          <span className="truncate">
                            {d.profile?.display_name ?? d.profile?.nickname ?? d.user_id.slice(0, 8)}
                          </span>
                          <span className="text-perestroika-preto/55 shrink-0">
                            mód {d.module ? String(d.module.number).padStart(2, "0") : "–"}
                          </span>
                        </li>
                      ))}
                      {bulkCandidates.length > 20 && (
                        <li className="text-perestroika-preto/55 italic">
                          e mais {bulkCandidates.length - 20}…
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSubmitMutation.isPending}>
              cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkSubmitMutation.isPending || bulkCandidates.length === 0}
              onClick={(e) => {
                e.preventDefault();
                bulkSubmitMutation.mutate(bulkCandidates);
              }}
            >
              {bulkSubmitMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  processando…
                </>
              ) : (
                `sim, marcar ${bulkCandidates.length} como enviado${bulkCandidates.length === 1 ? "" : "s"}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
