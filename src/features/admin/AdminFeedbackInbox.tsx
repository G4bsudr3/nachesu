import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, Inbox, RefreshCcw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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
  usePendingDeliverables,
  type DeliverableInbox,
  type InboxFilter,
} from "./usePendingDeliverables";
import { FeedbackReviewDrawer } from "./FeedbackReviewDrawer";

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

export const AdminFeedbackInbox = () => {
  useNow();
  const [statusFilter, setStatusFilter] = useState<InboxFilter>("pendentes");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeliverableInbox | null>(null);
  const [search, setSearch] = useState("");

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

  const { data, all, pendingCount, ajusteCount, isLoading, refetch } = usePendingDeliverables({
    courseId,
    moduleId,
    status: statusFilter,
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

  const revisadosCount = useMemo(
    () => all.filter((d) => d.reviewed_at !== null && d.status !== "ajuste").length,
    [all],
  );

  const searchTerm = search.trim().toLowerCase();
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((d) => {
      const haystack = [
        d.profile?.display_name,
        d.profile?.nickname,
        d.module?.title,
        d.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [data, searchTerm]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            feedback · inbox
          </h1>
          <p className="mt-3 text-perestroika-preto/70 inline-flex items-center gap-3 flex-wrap">
            <Inbox className="w-4 h-4" />
            {isLoading
              ? "carregando…"
              : `${pendingCount} pendentes · ${ajusteCount} em ajuste · ${revisadosCount} revisados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/10"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Select
          value={courseId ?? "todos"}
          onValueChange={(v) => {
            setCourseId(v === "todos" ? null : v);
            setModuleId(null);
          }}
        >
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue placeholder="curso" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue placeholder="módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">todos os módulos</SelectItem>
            {(modules ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {String(m.number).padStart(2, "0")} · {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InboxFilter)}>
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue placeholder="status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">pendentes</SelectItem>
            <SelectItem value="ajuste">em ajuste</SelectItem>
            <SelectItem value="revisados">revisados</SelectItem>
            <SelectItem value="todos">todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/40 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar por nome ou apelido do estudante…"
          className="pl-9 bg-white/60 border-perestroika-preto/20"
        />
      </div>

      <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">estudante</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">módulo</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">enviado</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
              <TableHead />
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
                const name =
                  d.profile?.display_name ?? d.profile?.nickname ?? d.user_id.slice(0, 8);
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
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.module
                        ? `${String(d.module.number).padStart(2, "0")} · ${d.module.title}`
                        : "–"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
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
                    </TableCell>
                    <TableCell>
                      {d.status === "ajuste" ? (
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
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(d)}
                        className="text-xs uppercase tracking-wide underline hover:no-underline min-h-[36px] px-2"
                      >
                        revisar
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
    </div>
  );
};
