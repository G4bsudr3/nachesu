import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { AdminPillsEditor } from "@/features/admin/AdminPillsEditor";

/**
 * /admin/aula/:n
 *
 * 3 abas pra gerir uma aula da eletiva:
 *  - conteúdo: edita as 5 pílulas via AdminPillsEditor existente
 *  - métricas: chama compute_module_metrics (rpc, security definer, só admin)
 *  - entregas: lista module_deliverables enviados + export csv filtrado
 */
export default function AdminAula() {
  const params = useParams<{ n: string }>();
  const number = Number(params.n);

  if (!Number.isFinite(number) || number < 1) {
    return <Navigate to="/admin" replace />;
  }

  return <AdminAulaInner number={number} />;
}

type ModuleRow = {
  id: string;
  number: number;
  title: string;
  trail_id: string;
  cover_color: string | null;
};

type Metrics = {
  total_students: number;
  started_count: number;
  completed_count: number;
  completion_rate: number;
  median_items: number;
  submitted_count: number;
  diversity_rate: number;
  avg_minutes: number;
  flow_distribution: Record<string, number>;
};

type DeliverableRow = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  content: unknown;
  profile?: { display_name: string | null; nickname: string | null } | null;
  email?: string | null;
};

function AdminAulaInner({ number }: { number: number }) {
  const [tab, setTab] = useState("conteudo");
  const [statusFilter, setStatusFilter] = useState<"todos" | "submitted" | "draft">("todos");

  // 1. carrega módulo pelo número
  const moduleQuery = useQuery({
    queryKey: ["admin-aula", "module", number],
    queryFn: async (): Promise<ModuleRow | null> => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, number, title, trail_id, cover_color")
        .eq("number", number)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const moduleId = moduleQuery.data?.id ?? null;
  const accent = moduleQuery.data?.cover_color || "#F25E3D";

  // 2. métricas (rpc)
  const metricsQuery = useQuery({
    queryKey: ["admin-aula", "metrics", moduleId],
    enabled: !!moduleId && tab === "metricas",
    queryFn: async (): Promise<Metrics> => {
      const { data, error } = await supabase.rpc("compute_module_metrics", {
        _module_id: moduleId!,
      });
      if (error) throw error;
      return (data ?? {}) as Metrics;
    },
  });

  // 3. entregas + perfis
  const deliverablesQuery = useQuery({
    queryKey: ["admin-aula", "deliverables", moduleId, statusFilter],
    enabled: !!moduleId && tab === "entregas",
    queryFn: async (): Promise<DeliverableRow[]> => {
      let q = supabase
        .from("module_deliverables")
        .select("id, user_id, status, submitted_at, updated_at, content")
        .eq("module_id", moduleId!)
        .order("updated_at", { ascending: false });

      if (statusFilter === "submitted") q = q.not("submitted_at", "is", null);
      if (statusFilter === "draft") q = q.is("submitted_at", null);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as DeliverableRow[];
      if (rows.length === 0) return rows;

      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, nickname")
        .in("user_id", userIds);
      const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return rows.map((r) => ({
        ...r,
        profile: byId.get(r.user_id) ?? null,
      }));
    },
  });

  if (moduleQuery.isLoading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-perestroika-bege">
        <Loader2 className="h-6 w-6 animate-spin text-perestroika-preto/50" />
      </div>
    );
  }

  if (!moduleQuery.data) {
    return (
      <div className="min-h-dvh grid place-items-center bg-perestroika-bege px-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-perestroika-vermelho" />
          <p className="font-display text-2xl mb-2">aula {number} não encontrada</p>
          <p className="font-body text-sm text-perestroika-preto/70 mb-4">
            crie o módulo número {number} na trilha primeiro.
          </p>
          <Button asChild variant="outline">
            <Link to="/admin/trilha">voltar pra trilhas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const mod = moduleQuery.data;

  return (
    <div className="min-h-dvh bg-perestroika-bege">
      {/* header */}
      <header
        className="border-b-2 border-perestroika-preto/10 px-4 sm:px-8 py-5"
        style={{ backgroundColor: `${accent}10` }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4 mr-1" />
                admin
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/50">
                aula {mod.number}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl truncate">{mod.title}</h1>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-2 font-body text-[11px]"
            style={{ borderColor: accent, color: accent }}
          >
            módulo id {mod.id.slice(0, 8)}
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="conteudo">conteúdo</TabsTrigger>
            <TabsTrigger value="metricas">métricas</TabsTrigger>
            <TabsTrigger value="entregas">entregas</TabsTrigger>
          </TabsList>

          <TabsContent value="conteudo" className="mt-0">
            <ConteudoTab module={mod} accent={accent} />
          </TabsContent>

          <TabsContent value="metricas" className="mt-0">
            <MetricsPanel
              query={metricsQuery}
              accent={accent}
              onRefresh={() => metricsQuery.refetch()}
            />
          </TabsContent>

          <TabsContent value="entregas" className="mt-0">
            <DeliverablesPanel
              rows={deliverablesQuery.data ?? []}
              isLoading={deliverablesQuery.isLoading}
              statusFilter={statusFilter}
              onFilter={setStatusFilter}
              onExport={() =>
                exportDeliverablesCsv(deliverablesQuery.data ?? [], mod.number)
              }
              onRefresh={() => deliverablesQuery.refetch()}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============== métricas ==============

function MetricsPanel({
  query,
  accent,
  onRefresh,
}: {
  query: ReturnType<typeof useQuery<Metrics>>;
  accent: string;
  onRefresh: () => void;
}) {
  if (query.isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-perestroika-preto/50" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-2xl border-2 border-perestroika-vermelho/30 bg-perestroika-vermelho/5 p-6 text-center">
        <p className="font-body text-sm text-perestroika-vermelho">
          erro ao carregar métricas:{" "}
          {query.error instanceof Error ? query.error.message : "desconhecido"}
        </p>
        <Button variant="outline" className="mt-3" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          tentar de novo
        </Button>
      </div>
    );
  }

  const m = query.data;
  if (!m) return null;

  const cards = [
    {
      label: "alunos no curso",
      value: m.total_students,
      hint: "perfis aprovados (não admin)",
    },
    {
      label: "iniciaram",
      value: m.started_count,
      hint: `${pct(m.started_count, m.total_students)}% do total`,
    },
    {
      label: "concluíram",
      value: m.completed_count,
      hint: `${m.completion_rate}% de conclusão`,
    },
    {
      label: "entregas",
      value: m.submitted_count,
      hint: "radares submetidos",
    },
    {
      label: "mediana de itens",
      value: m.median_items,
      hint: "no radar",
    },
    {
      label: "diversidade ≥ 2 fluxos",
      value: `${m.diversity_rate}%`,
      hint: "das entregas",
    },
    {
      label: "tempo médio",
      value: `${m.avg_minutes}min`,
      hint: "do início ao fim",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">como tá rolando</h2>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border-2 border-perestroika-preto/10 bg-white p-4"
          >
            <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55">
              {c.label}
            </p>
            <p className="font-display text-3xl mt-1" style={{ color: accent }}>
              {c.value}
            </p>
            <p className="font-body text-[11px] text-perestroika-preto/50 mt-1">
              {c.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-perestroika-preto/10 bg-white p-5">
        <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3">
          distribuição por fluxo
        </p>
        {Object.keys(m.flow_distribution ?? {}).length === 0 ? (
          <p className="font-body text-sm text-perestroika-preto/55">
            nenhum item registrado ainda.
          </p>
        ) : (
          <FlowBars data={m.flow_distribution} accent={accent} />
        )}
      </div>
    </div>
  );
}

function FlowBars({ data, accent }: { data: Record<string, number>; accent: string }) {
  const entries = useMemo(
    () =>
      Object.entries(data).sort((a, b) => b[1] - a[1]),
    [data],
  );
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([flow, count]) => {
        const pctW = (count / max) * 100;
        return (
          <div key={flow} className="flex items-center gap-3">
            <span className="font-body text-xs w-24 truncate">{flow}</span>
            <div className="flex-1 h-3 rounded-full bg-perestroika-preto/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pctW}%`, backgroundColor: accent }}
              />
            </div>
            <span className="font-body text-xs tabular-nums w-10 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const pct = (n: number, total: number) =>
  total > 0 ? Math.round((n / total) * 100) : 0;

// ============== entregas ==============

function DeliverablesPanel({
  rows,
  isLoading,
  statusFilter,
  onFilter,
  onExport,
  onRefresh,
}: {
  rows: DeliverableRow[];
  isLoading: boolean;
  statusFilter: "todos" | "submitted" | "draft";
  onFilter: (v: "todos" | "submitted" | "draft") => void;
  onExport: () => void;
  onRefresh: () => void;
}) {
  const filters: Array<{ id: typeof statusFilter; label: string }> = [
    { id: "todos", label: "todos" },
    { id: "submitted", label: "enviados" },
    { id: "draft", label: "rascunhos" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className={`rounded-full border-2 px-3 py-1.5 font-body text-xs transition-colors ${
                statusFilter === f.id
                  ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
                  : "border-perestroika-preto/20 hover:border-perestroika-preto/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            atualizar
          </Button>
          <Button
            size="sm"
            onClick={onExport}
            disabled={rows.length === 0}
            className="bg-perestroika-preto text-perestroika-bege hover:bg-perestroika-preto/85"
          >
            <Download className="h-4 w-4 mr-2" />
            csv
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-perestroika-preto/50" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/15 p-10 text-center">
          <p className="font-body text-sm text-perestroika-preto/55">
            nenhuma entrega ainda neste filtro.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-perestroika-preto/10 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>aluno</TableHead>
                <TableHead>itens</TableHead>
                <TableHead>fluxos</TableHead>
                <TableHead>status</TableHead>
                <TableHead>enviado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const stats = countRadar(r.content);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-body text-sm">
                      {r.profile?.display_name ?? r.profile?.nickname ?? r.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-body text-sm tabular-nums">
                      {stats.items}
                    </TableCell>
                    <TableCell className="font-body text-sm tabular-nums">
                      {stats.flows}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-body text-[11px]"
                        style={{
                          borderColor: r.submitted_at ? "#75BF9C" : "#fe7b02",
                          color: r.submitted_at ? "#3a8a64" : "#fe7b02",
                        }}
                      >
                        {r.submitted_at ? "enviado" : "rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-body text-xs text-perestroika-preto/65">
                      {r.submitted_at
                        ? new Date(r.submitted_at).toLocaleString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function countRadar(content: unknown): { items: number; flows: number } {
  const c = (content ?? {}) as { items?: Array<{ fluxo?: string }> };
  const items = Array.isArray(c.items) ? c.items : [];
  const flows = new Set(items.map((i) => i.fluxo).filter(Boolean));
  return { items: items.length, flows: flows.size };
}

// ============== csv export ==============

function exportDeliverablesCsv(rows: DeliverableRow[], moduleNumber: number) {
  if (rows.length === 0) {
    toast.error("nada pra exportar com esse filtro.");
    return;
  }
  const header = [
    "aluno",
    "user_id",
    "status",
    "enviado_em",
    "atualizado_em",
    "qtd_itens",
    "qtd_fluxos",
    "fluxos",
    "itens_resumo",
  ];
  const lines = [header.map(csvCell).join(",")];

  for (const r of rows) {
    const c = (r.content ?? {}) as { items?: Array<Record<string, unknown>> };
    const items = Array.isArray(c.items) ? c.items : [];
    const flowsSet = new Set(
      items.map((i) => String(i.fluxo ?? "")).filter(Boolean),
    );
    const resumo = items
      .map((i) => `${i.fluxo ?? "?"}:${i.titulo ?? i.descricao ?? "?"}`)
      .join(" | ");
    lines.push(
      [
        r.profile?.display_name ?? r.profile?.nickname ?? "",
        r.user_id,
        r.submitted_at ? "enviado" : "rascunho",
        r.submitted_at ?? "",
        r.updated_at,
        String(items.length),
        String(flowsSet.size),
        Array.from(flowsSet).join(";"),
        resumo,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\n"); // bom pra excel ler utf-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aula-${moduleNumber}-entregas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logger.info("admin-aula: exported csv", { rows: rows.length, moduleNumber });
  toast.success(`csv com ${rows.length} entrega(s) baixado.`);
}

function csvCell(v: string) {
  const s = String(v ?? "");
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
