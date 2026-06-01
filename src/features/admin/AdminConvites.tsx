import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, CheckCircle2, XCircle, Clock, Ban, AlertTriangle, RefreshCw, Activity } from "lucide-react";

type Course = { id: string; slug: string; title: string; order_index: number };

type Stats = {
  total_sends: number;
  sent: number;
  failed: number;
  suppressed: number;
  pending: number;
  complained: number;
  avg_processing_ms: number;
  median_processing_ms: number;
  total_invites: number;
  claimed: number;
  claim_rate: number;
};

type LogRow = {
  message_id: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
  processing_ms: number | null;
  course_id: string | null;
};

const RANGES = [
  { label: "24h", hours: 24 },
  { label: "7 dias", hours: 24 * 7 },
  { label: "30 dias", hours: 24 * 30 },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  sent: { label: "enviado", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  pending: { label: "na fila", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  failed: { label: "falhou", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  dlq: { label: "desistiu", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  bounced: { label: "bounce", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  suppressed: { label: "suprimido", className: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200" },
  complained: { label: "spam", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

const fmtMs = (ms: number | null | undefined) => {
  if (!ms || !Number.isFinite(ms)) return "–";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
};

const fmtTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export function AdminConvites() {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [hours, setHours] = useState<number>(24 * 7);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-convites-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("id, slug, title, order_index").order("order_index");
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  useEffect(() => {
    if (!selectedCourse && courses.length > 0) setSelectedCourse(courses[0].id);
  }, [courses, selectedCourse]);

  const since = useMemo(() => new Date(Date.now() - hours * 3600_000).toISOString(), [hours]);

  const { data: stats, refetch: refetchStats, isFetching: loadingStats } = useQuery({
    queryKey: ["course-invite-stats", selectedCourse, since],
    enabled: !!selectedCourse,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_course_invite_stats", {
        _course_id: selectedCourse, _since: since,
      });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const { data: log = [], refetch: refetchLog } = useQuery({
    queryKey: ["course-invite-log", selectedCourse, since],
    enabled: !!selectedCourse,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_course_invite_log", {
        _course_id: selectedCourse, _since: since, _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  // stats por todas as eletivas pra overview
  const { data: allStats = [] } = useQuery({
    queryKey: ["course-invite-stats-all", since],
    refetchInterval: 15_000,
    enabled: courses.length > 0,
    queryFn: async () => {
      const out: { course: Course; stats: Stats }[] = [];
      for (const c of courses) {
        const { data } = await supabase.rpc("get_course_invite_stats", {
          _course_id: c.id, _since: since,
        });
        out.push({ course: c, stats: (data ?? {}) as unknown as Stats });
      }
      return out;
    },
  });

  const filteredLog = useMemo(() => {
    if (statusFilter === "all") return log;
    if (statusFilter === "failed") return log.filter(l => ["failed", "dlq", "bounced"].includes(l.status));
    return log.filter(l => l.status === statusFilter);
  }, [log, statusFilter]);

  const refresh = () => { refetchStats(); refetchLog(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto/5 px-3 py-2 text-xs uppercase tracking-wide text-perestroika-preto/70 mb-3">
            <Mail className="h-4 w-4" /> observabilidade
          </div>
          <h2 className="font-display uppercase text-4xl sm:text-5xl leading-none">convites</h2>
          <p className="font-body text-sm text-perestroika-preto/60 mt-2">
            tempo real. atualiza a cada 10s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-perestroika-preto/15 overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.hours}
                onClick={() => setHours(r.hours)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                  hours === r.hours ? "bg-perestroika-preto text-perestroika-bege" : "hover:bg-perestroika-preto/5"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-perestroika-preto/15 px-3 py-1.5 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5"
            aria-label="atualizar agora"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} /> atualizar
          </button>
        </div>
      </div>

      {/* overview por eletiva */}
      <div className="grid gap-3 sm:grid-cols-2">
        {allStats.map(({ course, stats }) => {
          const active = course.id === selectedCourse;
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => setSelectedCourse(course.id)}
              className={`text-left p-4 rounded-xl border transition ${
                active
                  ? "border-perestroika-preto bg-perestroika-bege"
                  : "border-perestroika-preto/15 bg-white hover:bg-perestroika-bege/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-xl uppercase truncate">{course.title}</h3>
                  <p className="font-body text-xs text-perestroika-preto/55 mt-1">
                    {stats?.total_invites ?? 0} convidados · {stats?.claim_rate ?? 0}% logaram
                  </p>
                </div>
                {active && <Badge className="bg-perestroika-preto text-perestroika-bege">selecionada</Badge>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini icon={<CheckCircle2 className="h-3 w-3" />} label="enviados" value={stats?.sent ?? 0} tone="ok" />
                <Mini icon={<XCircle className="h-3 w-3" />} label="falharam" value={stats?.failed ?? 0} tone={(stats?.failed ?? 0) > 0 ? "bad" : "muted"} />
                <Mini icon={<Clock className="h-3 w-3" />} label="média" value={fmtMs(stats?.avg_processing_ms)} tone="muted" small />
              </div>
            </button>
          );
        })}
      </div>

      {/* stats da eletiva selecionada */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard icon={<Mail />} label="convites" value={stats.total_invites} />
          <StatCard icon={<CheckCircle2 />} label="enviados" value={stats.sent} tone="ok" />
          <StatCard icon={<XCircle />} label="falharam" value={stats.failed} tone={stats.failed > 0 ? "bad" : "muted"} />
          <StatCard icon={<Ban />} label="suprimidos" value={stats.suppressed} tone="muted" />
          <StatCard icon={<Clock />} label="na fila" value={stats.pending} tone={stats.pending > 0 ? "warn" : "muted"} />
          <StatCard icon={<Activity />} label="tempo médio" valueText={fmtMs(stats.avg_processing_ms)} tone="muted" />
        </div>
      )}

      {/* tabela */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display uppercase text-2xl">últimos envios</h3>
          <div className="inline-flex rounded-lg border border-perestroika-preto/15 overflow-hidden text-xs">
            {[
              { id: "all", label: "todos" },
              { id: "sent", label: "enviados" },
              { id: "failed", label: "falhas" },
              { id: "suppressed", label: "suprimidos" },
              { id: "pending", label: "na fila" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 uppercase tracking-wide transition-colors ${
                  statusFilter === f.id ? "bg-perestroika-preto text-perestroika-bege" : "hover:bg-perestroika-preto/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
                <TableHead className="uppercase text-xs tracking-wide">destinatário</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">tempo</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">quando</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLog.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-perestroika-preto/50 font-body text-sm">
                    nenhum envio nesse recorte.
                  </TableCell>
                </TableRow>
              )}
              {filteredLog.map(row => {
                const badge = STATUS_BADGE[row.status] ?? { label: row.status, className: "bg-zinc-200 text-zinc-700" };
                return (
                  <TableRow key={row.message_id}>
                    <TableCell className="font-body text-sm">{row.recipient_email}</TableCell>
                    <TableCell><Badge className={badge.className}>{badge.label}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{fmtMs(row.processing_ms)}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{fmtTime(row.created_at)}</TableCell>
                    <TableCell className="font-body text-xs text-red-700 max-w-xs truncate" title={row.error_message ?? ""}>
                      {row.error_message ?? ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, valueText, tone = "default",
}: {
  icon: React.ReactNode; label: string; value?: number; valueText?: string;
  tone?: "default" | "ok" | "bad" | "warn" | "muted";
}) {
  const toneClass = {
    default: "bg-white border-perestroika-preto/15",
    ok: "bg-green-50 border-green-200",
    bad: "bg-red-50 border-red-200",
    warn: "bg-amber-50 border-amber-200",
    muted: "bg-perestroika-preto/5 border-perestroika-preto/10",
  }[tone];
  return (
    <div className={`p-4 rounded-xl border ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-perestroika-preto/60 mb-2">
        <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span> {label}
      </div>
      <div className="font-display text-3xl leading-none">{valueText ?? value ?? 0}</div>
    </div>
  );
}

function Mini({
  icon, label, value, tone = "muted", small,
}: { icon: React.ReactNode; label: string; value: number | string; tone?: "ok" | "bad" | "muted"; small?: boolean }) {
  const toneClass = { ok: "text-green-700", bad: "text-red-700", muted: "text-perestroika-preto/70" }[tone];
  return (
    <div className="space-y-0.5">
      <div className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide ${toneClass}`}>
        {icon} {label}
      </div>
      <div className={`font-display ${small ? "text-base" : "text-xl"} leading-none`}>{value}</div>
    </div>
  );
}
