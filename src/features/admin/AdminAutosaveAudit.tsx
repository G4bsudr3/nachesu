import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw, Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePendingDeliverables } from "./usePendingDeliverables";
import {
  subscribeAutosaveEvents,
  clearAutosaveEvents,
  type AutosaveEvent,
} from "@/components/eletiva/pills/autosaveTelemetry";

const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const fmtClock = (ms: number) =>
  new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const contentSize = (c: unknown) => {
  if (!c || typeof c !== "object") return 0;
  try {
    return JSON.stringify(c).length;
  } catch {
    return 0;
  }
};

export function AdminAutosaveAudit() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string | "all">("all");

  // mesma fonte do inbox: rascunhos + enviados
  const { all, rascunhoCount, pendingCount, isLoading, refetch } = usePendingDeliverables({
    status: "todos",
  });

  // lista de cursos pra filtro
  const { data: courses } = useQuery({
    queryKey: ["admin-autosave-audit-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug")
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  // contagem de matriculados ativos por curso
  const { data: enrollments } = useQuery({
    queryKey: ["admin-autosave-audit-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, user_id, status")
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });

  // telemetria local de autosave (eventos do próprio admin enquanto navega
  // como estudante de teste, ou de qualquer estudante na mesma máquina)
  const [events, setEvents] = useState<AutosaveEvent[]>([]);
  useEffect(() => subscribeAutosaveEvents(setEvents), []);

  // panorama por curso
  const courseStats = useMemo(() => {
    const list = (courses ?? []).map((c) => {
      const enrolled = (enrollments ?? []).filter((e) => e.course_id === c.id).length;
      const rows = all.filter((d) => d.course_id === c.id);
      const drafts = rows.filter((d) => d.submitted_at === null);
      const submitted = rows.filter((d) => d.submitted_at !== null);
      const reviewed = rows.filter((d) => d.reviewed_at !== null);
      const startersIds = new Set(rows.map((r) => r.user_id));
      return {
        course: c,
        enrolled,
        started: startersIds.size,
        drafts: drafts.length,
        submitted: submitted.length,
        reviewed: reviewed.length,
      };
    });
    return list;
  }, [courses, enrollments, all]);

  // tabela por estudante
  const studentRows = useMemo(() => {
    type Row = {
      userId: string;
      name: string;
      courseId: string | null;
      moduleNumber: number | null;
      moduleTitle: string;
      status: string;
      contentBytes: number;
      updatedAt: string | null;
      submittedAt: string | null;
    };
    const filtered = courseId === "all" ? all : all.filter((d) => d.course_id === courseId);
    const rows: Row[] = filtered.map((d) => ({
      userId: d.user_id,
      name: d.profile?.display_name ?? d.profile?.nickname ?? d.user_id.slice(0, 8),
      courseId: d.course_id,
      moduleNumber: d.module?.number ?? null,
      moduleTitle: d.module?.title ?? "–",
      status: d.submitted_at ? d.status : "rascunho",
      contentBytes: contentSize(d.content),
      updatedAt: d.updated_at ?? null,
      submittedAt: d.submitted_at,
    }));
    rows.sort((a, b) => {
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    });
    return rows;
  }, [all, courseId]);

  const handleResync = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
    await qc.invalidateQueries({ queryKey: ["admin-autosave-audit-enrollments"] });
    await qc.invalidateQueries({ queryKey: ["admin-autosave-audit-courses"] });
    await refetch();
    toast.success("re-sincronizado com o banco agora.");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-perestroika-preto">auditoria de autosave</h2>
          <p className="font-body text-sm text-perestroika-preto/60">
            mesma fonte do inbox. compara matrícula, rascunho e envio por curso e por estudante.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={courseId} onValueChange={(v) => setCourseId(v as typeof courseId)}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">todos os cursos</SelectItem>
              {(courses ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleResync}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/15 bg-perestroika-bege px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto hover:bg-perestroika-bege/70"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            re-sincronizar
          </button>
        </div>
      </header>

      {/* contagens globais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="rascunhos com conteúdo" value={rascunhoCount} />
        <StatCard label="aguardando revisão" value={pendingCount} />
        <StatCard
          label="total na fila"
          value={all.length}
          hint={isLoading ? "carregando…" : undefined}
        />
        <StatCard label="eventos locais de autosave" value={events.length} />
      </div>

      {/* panorama por curso */}
      <section className="space-y-2">
        <h3 className="font-body text-xs uppercase tracking-wider text-perestroika-preto/55">
          panorama por curso
        </h3>
        <div className="overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>curso</TableHead>
                <TableHead className="text-right">matriculados</TableHead>
                <TableHead className="text-right">começaram</TableHead>
                <TableHead className="text-right">rascunho</TableHead>
                <TableHead className="text-right">enviou</TableHead>
                <TableHead className="text-right">revisado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseStats.map((s) => (
                <TableRow key={s.course.id}>
                  <TableCell className="font-body text-sm">{s.course.title}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.enrolled}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.started}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.drafts}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.submitted}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.reviewed}</TableCell>
                </TableRow>
              ))}
              {courseStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-perestroika-preto/50">
                    {isLoading ? "carregando…" : "nenhum curso encontrado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* tabela por estudante */}
      <section className="space-y-2">
        <h3 className="font-body text-xs uppercase tracking-wider text-perestroika-preto/55">
          status por estudante ({studentRows.length})
        </h3>
        <div className="overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>estudante</TableHead>
                <TableHead>módulo</TableHead>
                <TableHead>status</TableHead>
                <TableHead className="text-right">bytes</TableHead>
                <TableHead>último save</TableHead>
                <TableHead>enviado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentRows.map((r, i) => (
                <TableRow key={`${r.userId}-${i}`}>
                  <TableCell className="font-body text-sm">{r.name}</TableCell>
                  <TableCell className="text-sm">
                    {r.moduleNumber ? `m${r.moduleNumber} · ` : ""}
                    <span className="text-perestroika-preto/60">{r.moduleTitle}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.status === "rascunho"
                          ? "border-perestroika-preto/15 text-perestroika-preto/60"
                          : "border-emerald-500/40 text-emerald-700"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{r.contentBytes}</TableCell>
                  <TableCell className="text-sm text-perestroika-preto/70">
                    {timeAgo(r.updatedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-perestroika-preto/70">
                    {r.submittedAt ? timeAgo(r.submittedAt) : "–"}
                  </TableCell>
                </TableRow>
              ))}
              {studentRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-perestroika-preto/50">
                    {isLoading ? "carregando…" : "nenhum estudante com atividade."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* logs locais de autosave (esta sessão / este navegador) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-wider text-perestroika-preto/55">
            <Activity className="h-3.5 w-3.5" />
            logs de autosave (esta sessão)
          </h3>
          <button
            type="button"
            onClick={() => {
              clearAutosaveEvents();
              toast.success("logs locais limpos.");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/15 px-3 py-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/70 hover:bg-perestroika-bege"
          >
            <Trash2 className="h-3 w-3" /> limpar
          </button>
        </div>
        <div className="max-h-80 overflow-auto rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/95 p-3 font-mono text-[11px] leading-relaxed text-white/90">
          {events.length === 0 ? (
            <p className="text-white/40">
              nenhum evento ainda. tentativas e falhas de autosave aparecem aqui em tempo real.
            </p>
          ) : (
            <ul className="space-y-1">
              {events
                .slice()
                .reverse()
                .map((ev) => (
                  <li key={ev.id} className="flex flex-wrap items-baseline gap-2">
                    <span className="text-white/40">{fmtClock(ev.at)}</span>
                    <span
                      className={
                        ev.state === "error"
                          ? "text-red-300"
                          : ev.state === "retry"
                          ? "text-amber-300"
                          : ev.state === "saved"
                          ? "text-emerald-300"
                          : "text-white/70"
                      }
                    >
                      {ev.state}
                    </span>
                    <span className="text-white/60">
                      tentativa {ev.attempt} · {ev.field} · mod {ev.moduleId.slice(0, 8)} · user{" "}
                      {ev.userId.slice(0, 8)}
                    </span>
                    {ev.error && <span className="text-red-200">— {ev.error}</span>}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/40 p-4">
      <div className="font-display text-3xl text-perestroika-preto tabular-nums">{value}</div>
      <div className="mt-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
        {label}
      </div>
      {hint && (
        <div className="mt-0.5 font-body text-[10px] text-perestroika-preto/60">{hint}</div>
      )}
    </div>
  );
}
