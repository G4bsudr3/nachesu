import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, AlertTriangle, Clock, Eye, EyeOff, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseBySlug } from "@/hooks/useCourses";
import { cn } from "@/lib/utils";

type TrailRow = {
  id: string;
  order_index: number;
  title: string;
  color: string | null;
  course_id: string | null;
};
type ModuleRow = {
  id: string;
  trail_id: string;
  number: number;
  title: string;
  published: boolean;
  total_minutes: number | null;
};
type PillRow = {
  id: string;
  module_id: string;
  duration_min_low: number | null;
  duration_min_high: number | null;
  interaction_schema: Record<string, unknown> | null;
};
type DelivRow = {
  module_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
};

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#8A85BF",
};

const AdminEletivaModulos = () => {
  const { slug } = useParams<{ slug: string }>();
  const course = useCourseBySlug(slug);

  const courseId = course.data?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-course-tree", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const [{ data: trails }, { data: modules }] = await Promise.all([
        supabase
          .from("trails")
          .select("id, order_index, title, color, course_id")
          .eq("course_id", courseId!)
          .order("order_index"),
        supabase
          .from("modules")
          .select("id, trail_id, number, title, published, total_minutes")
          .order("number"),
      ]);
      const trailList = (trails ?? []) as TrailRow[];
      const trailIds = new Set(trailList.map((t) => t.id));
      const modList = ((modules ?? []) as ModuleRow[]).filter((m) => trailIds.has(m.trail_id));
      const modIds = modList.map((m) => m.id);
      const [{ data: pills }, { data: delivs }] = await Promise.all([
        modIds.length
          ? supabase
              .from("module_pills")
              .select("id, module_id, duration_min_low, duration_min_high, interaction_schema")
              .in("module_id", modIds)
              .eq("published", true)
          : Promise.resolve({ data: [] as PillRow[] }),
        modIds.length
          ? supabase
              .from("module_deliverables")
              .select("module_id, status, submitted_at, reviewed_at")
              .in("module_id", modIds)
          : Promise.resolve({ data: [] as DelivRow[] }),
      ]);
      return {
        trails: trailList,
        modules: modList,
        pills: (pills ?? []) as PillRow[],
        delivs: (delivs ?? []) as DelivRow[],
      };
    },
  });

  const byTrail = useMemo(() => {
    if (!data) return [];
    return data.trails.map((t) => ({
      trail: t,
      color: trailColorByOrder[t.order_index] ?? t.color ?? "#090909",
      modules: data.modules
        .filter((m) => m.trail_id === t.id)
        .map((m) => {
          const pills = data.pills.filter((p) => p.module_id === m.id);
          const withSchema = pills.filter((p) => p.interaction_schema).length;
          const dur = pills.reduce(
            (acc, p) => acc + (p.duration_min_low ?? 0) + (p.duration_min_high ?? 0),
            0,
          );
          const delivs = data.delivs.filter((d) => d.module_id === m.id);
          const rascunho = delivs.filter((d) => d.status === "rascunho").length;
          const enviado = delivs.filter(
            (d) => d.status === "enviado" && d.reviewed_at === null,
          ).length;
          const revisado = delivs.filter((d) => d.reviewed_at !== null).length;
          return {
            m,
            pillCount: pills.length,
            withSchema,
            missingSchema: pills.length - withSchema,
            duration: dur,
            rascunho,
            enviado,
            revisado,
          };
        }),
    }));
  }, [data]);

  if (course.isLoading || isLoading) {
    return <div className="p-8 text-perestroika-preto/50">carregando…</div>;
  }
  if (!course.data) return <Navigate to="/admin" replace />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/eletivas" className="hover:text-perestroika-preto">eletivas</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">{course.data.title}</span>
      </nav>

      <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.9] mb-1">
        {course.data.title}
      </h1>
      <p className="text-sm text-perestroika-preto/60 mb-8">
        índice das 4 trilhas e 20 módulos. cada card mostra o estado da turma e do conteúdo.
      </p>

      <div className="space-y-8">
        {byTrail.map(({ trail, color, modules }) => (
          <section key={trail.id}>
            <div className="flex items-center gap-3 mb-3">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: color }}
              />
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                trilha {trail.order_index}
              </p>
              <h2 className="font-display uppercase text-2xl leading-none">{trail.title}</h2>
              <span className="ml-auto text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {modules.map(
                ({ m, pillCount, withSchema, missingSchema, duration, rascunho, enviado, revisado }) => {
                  const hasIssue = missingSchema > 0;
                  return (
                    <Link
                      key={m.id}
                      to={`/admin/eletiva/${slug}/modulo/${m.number}`}
                      className={cn(
                        "group rounded-2xl border-2 bg-white p-4 flex flex-col gap-3 hover:shadow-sm transition-all",
                        hasIssue
                          ? "border-rose-400/70"
                          : "border-perestroika-preto/15 hover:border-perestroika-preto/30",
                      )}
                      style={{ borderTopColor: color, borderTopWidth: 4 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="font-display uppercase text-3xl leading-none tabular-nums"
                          style={{ color }}
                        >
                          {String(m.number).padStart(2, "0")}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5",
                            m.published
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-perestroika-preto/10 text-perestroika-preto/60",
                          )}
                        >
                          {m.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {m.published ? "publicado" : "rascunho"}
                        </span>
                      </div>

                      <p className="font-body text-sm text-perestroika-preto leading-snug line-clamp-2">
                        {m.title}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-perestroika-preto/60 tabular-nums">
                        <span>{pillCount} pílulas</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {duration || m.total_minutes || 0} min
                        </span>
                      </div>

                      {hasIssue && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 rounded px-2 py-1">
                          <FileWarning className="w-3 h-3" />
                          {missingSchema} sem interaction_schema
                        </div>
                      )}

                      <div className="mt-auto pt-2 border-t border-perestroika-preto/15 grid grid-cols-3 gap-1 text-center">
                        <StatMini label="rascunho" value={rascunho} />
                        <StatMini label="aguarda" value={enviado} highlight={enviado > 0} />
                        <StatMini label="revisado" value={revisado} />
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const StatMini = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) => (
  <div>
    <p
      className={cn(
        "font-display text-lg leading-none tabular-nums",
        highlight ? "text-rose-600" : "text-perestroika-preto",
      )}
    >
      {value}
    </p>
    <p className="text-[9px] uppercase tracking-wide text-perestroika-preto/50">{label}</p>
  </div>
);

export default AdminEletivaModulos;
