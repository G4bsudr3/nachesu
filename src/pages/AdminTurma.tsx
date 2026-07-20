import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ClipboardCheck, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

interface CourseRow {
  id: string;
  title: string;
  professor_name: string;
  slug: string;
}

interface RiskRow {
  user_id: string;
  course_id: string;
  days_inactive: number;
  risk_level: "low" | "medium" | "high" | "lost" | "caught_up";
  last_activity_at: string;
}

interface ProgressRow {
  user_id: string;
  module_id: string;
  started_at: string;
  completed_at: string | null;
  modules: {
    id: string;
    title: string;
    number: number;
    order_index: number;
    trail_id: string;
    trails: { course_id: string | null; title: string; order_index: number } | null;
  } | null;
}

interface DeliverableRow {
  id: string;
  user_id: string;
  module_id: string;
  submitted_at: string | null;
  modules: { title: string; number: number; trails: { course_id: string | null } | null } | null;
}

interface ProfileRow {
  id: string;
  nickname: string | null;
  full_name: string | null;
}

interface ModuleAggregate {
  module_id: string;
  number: number;
  title: string;
  trail_title: string;
  trail_order: number;
  module_order: number;
  started: number;
  completed: number;
  avg_hours: number | null;
}

const LEVEL_LABEL: Record<RiskRow["risk_level"], string> = {
  low: "ok",
  medium: "7+ dias",
  high: "14+ dias",
  lost: "21+ dias",
  caught_up: "em dia",
};

const LEVEL_STYLE: Record<RiskRow["risk_level"], string> = {
  low: "bg-perestroika-preto/10 text-perestroika-preto",
  medium: "bg-perestroika-laranja/25 text-perestroika-preto",
  high: "bg-perestroika-vermelho/25 text-perestroika-preto",
  lost: "bg-perestroika-vermelho text-white",
  caught_up: "bg-emerald-100 text-emerald-900",
};

const AdminTurma = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [courseRes, enrollRes, riskRes, progRes, delivRes] = await Promise.all([
        supabase.from("courses").select("id, title, professor_name, slug").eq("id", courseId).maybeSingle(),
        supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("status", "active"),
        supabase
          .from("student_engagement_risk")
          .select("user_id, course_id, days_inactive, risk_level, last_activity_at")
          .eq("course_id", courseId)
          .in("risk_level", ["medium", "high", "lost"])
          .order("days_inactive", { ascending: false }),
        supabase
          .from("student_module_progress")
          .select(
            "user_id, module_id, started_at, completed_at, modules!inner(id, title, number, order_index, trail_id, trails!inner(course_id, title, order_index))",
          )
          .eq("modules.trails.course_id", courseId),
        supabase
          .from("module_deliverables")
          .select(
            "id, user_id, module_id, submitted_at, modules!inner(title, number, trails!inner(course_id))",
          )
          .eq("status", "enviado")
          .eq("modules.trails.course_id", courseId)
          .order("submitted_at", { ascending: true })
          .limit(10),
      ]);

      if (cancelled) return;

      setCourse((courseRes.data ?? null) as CourseRow | null);
      setEnrolledCount(enrollRes.count ?? 0);
      const riskRows = (riskRes.data ?? []) as RiskRow[];
      setRisks(riskRows);
      setProgress((progRes.data ?? []) as unknown as ProgressRow[]);
      const deliverableRows = (delivRes.data ?? []) as unknown as DeliverableRow[];
      setDeliverables(deliverableRows);

      const userIds = [
        ...new Set([
          ...riskRows.map((r) => r.user_id),
          ...deliverableRows.map((d) => d.user_id),
        ]),
      ];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .in("id", userIds);
        const map: Record<string, ProfileRow> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p; });
        if (!cancelled) setProfiles(map);
      }

      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [courseId]);

  const moduleAgg: ModuleAggregate[] = useMemo(() => {
    const map = new Map<string, ModuleAggregate>();
    for (const row of progress) {
      if (!row.modules) continue;
      const mid = row.module_id;
      const existing = map.get(mid) ?? {
        module_id: mid,
        number: row.modules.number,
        title: row.modules.title,
        trail_title: row.modules.trails?.title ?? "",
        trail_order: row.modules.trails?.order_index ?? 0,
        module_order: row.modules.order_index,
        started: 0,
        completed: 0,
        avg_hours: null as number | null,
        _durations: [] as number[],
      } as ModuleAggregate & { _durations: number[] };
      existing.started += 1;
      if (row.completed_at) {
        existing.completed += 1;
        const ms = new Date(row.completed_at).getTime() - new Date(row.started_at).getTime();
        if (ms > 0) (existing as any)._durations.push(ms / 3_600_000);
      }
      map.set(mid, existing);
    }
    const list = Array.from(map.values()).map((m: any) => {
      const ds: number[] = m._durations;
      m.avg_hours = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
      delete m._durations;
      return m as ModuleAggregate;
    });
    list.sort((a, b) =>
      a.trail_order - b.trail_order ||
      a.module_order - b.module_order ||
      a.number - b.number,
    );
    return list;
  }, [progress]);

  const avgAll = useMemo(() => {
    const vals = moduleAgg.map((m) => m.avg_hours).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [moduleAgg]);

  const totalRisks = risks.length;

  const fmtHours = (h: number | null) => {
    if (h === null || !Number.isFinite(h)) return "–";
    if (h < 1) return `${Math.round(h * 60)}min`;
    return `${h.toFixed(1)}h`;
  };

  return (
    <PageShell>
      <PageHeader back={{ to: "/admin", label: "voltar" }} actions={<AuthedHeaderActions />} />

      <main className="container max-w-5xl pb-20 pt-4">
        <header className="mb-6">
          <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/55 mb-1">
            dashboard da turma
          </p>
          <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight text-perestroika-preto">
            {course?.title ?? "carregando..."}
          </h1>
          {course && (
            <p className="font-body text-sm text-perestroika-preto/65 mt-1">
              com {course.professor_name.toLowerCase()}
            </p>
          )}
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8">
          <Kpi icon={<Users className="h-4 w-4" />} label="matriculados" value={enrolledCount} tone="bege" />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="em risco"
            value={totalRisks}
            tone={totalRisks > 0 ? "vermelho" : "bege"}
          />
          <Kpi
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="aguardam revisão"
            value={deliverables.length}
            tone={deliverables.length > 0 ? "laranja" : "bege"}
          />
          <Kpi
            icon={<Clock className="h-4 w-4" />}
            label="tempo médio módulo"
            value={fmtHours(avgAll)}
            tone="bege"
          />
        </div>

        <section className="mb-10">
          <h2 className="font-display text-2xl uppercase text-perestroika-preto mb-3">
            ritmo dos módulos
          </h2>
          {loading ? (
            <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
          ) : moduleAgg.length === 0 ? (
            <EmptyBlock title="ninguém começou ainda" sub="quando estudantes abrirem os módulos, o ritmo aparece aqui." />
          ) : (
            <div className="rounded-2xl border border-perestroika-preto/10 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-perestroika-bege/60">
                  <tr className="text-left font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65">
                    <th className="px-4 py-3">módulo</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">iniciados</th>
                    <th className="px-4 py-3 text-center">concluídos</th>
                    <th className="px-4 py-3 text-center">tempo médio</th>
                    <th className="px-4 py-3 w-[30%] hidden md:table-cell">conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-perestroika-preto/10">
                  {moduleAgg.map((m) => {
                    const pct = m.started > 0 ? Math.round((m.completed / m.started) * 100) : 0;
                    return (
                      <tr key={m.module_id} className="font-body text-sm">
                        <td className="px-4 py-3">
                          <p className="text-perestroika-preto">
                            <span className="text-perestroika-preto/45 mr-2">#{m.number}</span>
                            {m.title}
                          </p>
                          {m.trail_title && (
                            <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/45 mt-0.5">
                              {m.trail_title}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-perestroika-preto/70 hidden sm:table-cell">
                          {m.started}
                        </td>
                        <td className="px-4 py-3 text-center text-perestroika-preto">
                          <span className="font-display text-xl">{m.completed}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-perestroika-preto/70">
                          {fmtHours(m.avg_hours)}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="h-1.5 rounded-full bg-perestroika-preto/10 overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-perestroika-preto/55 mt-1">{pct}%</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="flex items-end justify-between mb-3">
            <h2 className="font-display text-2xl uppercase text-perestroika-preto">
              estudantes em risco
            </h2>
            {risks.length > 0 && (
              <Link
                to="/admin/risco"
                className="font-body text-xs uppercase tracking-wide text-perestroika-preto/65 hover:text-perestroika-preto"
              >
                ver todos
              </Link>
            )}
          </div>
          {loading ? (
            <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
          ) : risks.length === 0 ? (
            <EmptyBlock title="turma respirando" sub="ninguém parado há mais de 7 dias por aqui." />
          ) : (
            <div className="rounded-2xl border border-perestroika-preto/10 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-perestroika-preto/10">
                  {risks.slice(0, 10).map((r) => {
                    const p = profiles[r.user_id];
                    const name = p?.nickname || p?.full_name || r.user_id.slice(0, 8);
                    return (
                      <tr key={r.user_id} className="font-body text-sm">
                        <td className="px-4 py-3 text-perestroika-preto">{name}</td>
                        <td className="px-4 py-3 text-perestroika-preto/70">
                          {r.days_inactive}d
                          <span className="block text-[11px] text-perestroika-preto/45">
                            {formatDistanceToNow(new Date(r.last_activity_at), { locale: ptBR })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-semibold",
                              LEVEL_STYLE[r.risk_level],
                            )}
                          >
                            {LEVEL_LABEL[r.risk_level]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl uppercase text-perestroika-preto mb-3">
            aguardando sua revisão
          </h2>
          {loading ? (
            <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
          ) : deliverables.length === 0 ? (
            <EmptyBlock title="fila vazia" sub="nenhuma entrega esperando feedback agora." />
          ) : (
            <div className="rounded-2xl border border-perestroika-preto/10 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-perestroika-preto/10">
                  {deliverables.map((d) => {
                    const p = profiles[d.user_id];
                    const name = p?.nickname || p?.full_name || d.user_id.slice(0, 8);
                    const num = d.modules?.number;
                    return (
                      <tr key={d.id} className="font-body text-sm">
                        <td className="px-4 py-3 text-perestroika-preto">
                          {name}
                          <span className="block text-[11px] text-perestroika-preto/45">
                            módulo {num ?? "?"} · {d.modules?.title ?? ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-perestroika-preto/70 text-right">
                          {d.submitted_at && (
                            <span className="text-[11px]">
                              enviado {formatDistanceToNow(new Date(d.submitted_at), { locale: ptBR })}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {num != null && (
                            <Link
                              to={`/admin/aula/${num}`}
                              className="font-body text-xs uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                            >
                              abrir
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
};

const KPI_TONE: Record<string, string> = {
  bege: "bg-perestroika-bege/60 text-perestroika-preto",
  laranja: "bg-perestroika-laranja/20 text-perestroika-preto",
  vermelho: "bg-perestroika-vermelho/20 text-perestroika-preto",
};

const Kpi = ({
  icon,
  label,
  value,
  tone = "bege",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "bege" | "laranja" | "vermelho";
}) => (
  <div className={cn("rounded-2xl p-4", KPI_TONE[tone])}>
    <div className="flex items-center gap-1.5 text-perestroika-preto/60">
      {icon}
      <span className="font-body text-[10px] uppercase tracking-wide">{label}</span>
    </div>
    <p className="font-display text-3xl mt-1">{value}</p>
  </div>
);

const EmptyBlock = ({ title, sub }: { title: string; sub: string }) => (
  <div className="rounded-2xl border border-dashed border-perestroika-preto/20 bg-white/40 p-8 text-center">
    <p className="font-display text-xl uppercase text-perestroika-preto mb-1">{title}</p>
    <p className="font-body text-sm text-perestroika-preto/65">{sub}</p>
  </div>
);

export default AdminTurma;
