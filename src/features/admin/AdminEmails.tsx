import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: unknown;
  created_at: string;
};

const RANGE_OPTS = [
  { value: "24h", label: "últimas 24h", hours: 24 },
  { value: "7d", label: "últimos 7 dias", hours: 24 * 7 },
  { value: "30d", label: "últimos 30 dias", hours: 24 * 30 },
  { value: "all", label: "tudo", hours: null as number | null },
];

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  dlq: "bg-perestroika-vermelho/15 text-perestroika-vermelho border-perestroika-vermelho/30",
  failed: "bg-perestroika-vermelho/15 text-perestroika-vermelho border-perestroika-vermelho/30",
  bounced: "bg-perestroika-vermelho/15 text-perestroika-vermelho border-perestroika-vermelho/30",
  complained: "bg-perestroika-rosa/15 text-perestroika-rosa border-perestroika-rosa/30",
  suppressed: "bg-perestroika-preto/10 text-perestroika-preto/70 border-perestroika-preto/20",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const AdminEmails = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const opt = RANGE_OPTS.find((o) => o.value === range);
    const since =
      opt?.hours != null
        ? new Date(Date.now() - opt.hours * 3600 * 1000).toISOString()
        : null;

    let q = supabase
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (since) q = q.gte("created_at", since);

    q.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        logger.error("[admin/emails] erro:", error);
        toast.error("não foi possível carregar o log de emails");
      } else {
        setRows((data ?? []) as LogRow[]);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  // dedup por message_id (mantém a entrada mais recente)
  const dedup = useMemo(() => {
    const seen = new Map<string, LogRow>();
    const noKey: LogRow[] = [];
    for (const r of rows) {
      if (!r.message_id) {
        noKey.push(r);
        continue;
      }
      const prev = seen.get(r.message_id);
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) {
        seen.set(r.message_id, r);
      }
    }
    return [...Array.from(seen.values()), ...noKey].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
  }, [rows]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    dedup.forEach((r) => set.add(r.template_name));
    return Array.from(set).sort();
  }, [dedup]);

  const filtered = useMemo(() => {
    return dedup.filter((r) => {
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [dedup, templateFilter, statusFilter]);

  const stats = useMemo(() => {
    const base = templateFilter === "all" ? dedup : dedup.filter((r) => r.template_name === templateFilter);
    const total = base.length;
    const count = (s: string) => base.filter((r) => r.status === s).length;
    const sent = count("sent");
    const failed = count("dlq") + count("failed") + count("bounced");
    const suppressed = count("suppressed") + count("complained");
    const pending = count("pending");
    return { total, sent, failed, suppressed, pending };
  }, [dedup, templateFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            emails · log
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${filtered.length} de ${dedup.length} emails únicos`}
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          atualizar
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="total" value={stats.total} />
        <StatCard label="enviados" value={stats.sent} tone="emerald" />
        <StatCard label="pendentes" value={stats.pending} tone="amber" />
        <StatCard label="falhas" value={stats.failed} tone="vermelho" />
        <StatCard label="suprimidos" value={stats.suppressed} />
      </div>

      {/* filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue placeholder="template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">todos os templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue placeholder="status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">todos os status</SelectItem>
            <SelectItem value="sent">enviado</SelectItem>
            <SelectItem value="pending">pendente</SelectItem>
            <SelectItem value="dlq">falha (dlq)</SelectItem>
            <SelectItem value="failed">falhou</SelectItem>
            <SelectItem value="bounced">bounce</SelectItem>
            <SelectItem value="complained">reclamação</SelectItem>
            <SelectItem value="suppressed">suprimido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* tabela */}
      <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">quando</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">template</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">destinatário</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-perestroika-preto/50">
                  carregando…
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-perestroika-preto/50">
                  nenhum email com esses filtros.
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
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap text-xs">
                    {r.template_name}
                  </TableCell>
                  <TableCell className="text-perestroika-preto/80 whitespace-nowrap text-xs">
                    {r.recipient_email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs whitespace-nowrap ${STATUS_COLORS[r.status] ?? ""}`}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-perestroika-vermelho/90 max-w-[300px] truncate">
                    {r.error_message ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* dialog detalhes */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-perestroika-bege">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-3xl break-all">
              {selected?.template_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2 text-sm">
              <DetailRow label="destinatário" value={selected.recipient_email} />
              <DetailRow label="status" value={selected.status} />
              <DetailRow label="quando" value={formatDate(selected.created_at)} />
              <DetailRow label="message_id" value={selected.message_id ?? "—"} />
              {selected.error_message && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-perestroika-preto/60 mb-1">
                    erro
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-all bg-perestroika-vermelho/10 border border-perestroika-vermelho/30 text-perestroika-vermelho rounded-md p-3">
                    {selected.error_message}
                  </pre>
                </div>
              )}
              {selected.metadata != null && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-perestroika-preto/60 mb-1">
                    metadata
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-all bg-perestroika-preto/5 rounded-md p-3">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {/* histórico completo deste message_id */}
              {selected.message_id && (
                <HistoryForMessage messageId={selected.message_id} all={rows} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "vermelho";
}) => {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "vermelho"
          ? "text-perestroika-vermelho"
          : "text-perestroika-preto";
  return (
    <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 p-4">
      <div className="text-xs uppercase tracking-wide text-perestroika-preto/60">
        {label}
      </div>
      <div className={`font-display text-4xl mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs uppercase tracking-wide text-perestroika-preto/60">{label}</div>
    <div className="text-perestroika-preto break-all">{value ?? "—"}</div>
  </div>
);

const HistoryForMessage = ({ messageId, all }: { messageId: string; all: LogRow[] }) => {
  const history = all
    .filter((r) => r.message_id === messageId)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  if (history.length <= 1) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-perestroika-preto/60 mb-2">
        histórico ({history.length} tentativas)
      </div>
      <div className="space-y-2">
        {history.map((h) => (
          <div
            key={h.id}
            className="flex items-start justify-between gap-3 text-xs bg-perestroika-preto/5 rounded-md p-2"
          >
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${STATUS_COLORS[h.status] ?? ""}`}
                >
                  {h.status}
                </Badge>
                <span className="text-perestroika-preto/60">{formatDate(h.created_at)}</span>
              </div>
              {h.error_message && (
                <div className="text-perestroika-vermelho break-all">{h.error_message}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
