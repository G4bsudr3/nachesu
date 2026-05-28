import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, UserPlus, GraduationCap, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type Period = "7d" | "30d" | "all";

interface Course {
  id: string;
  title: string;
}

interface Stats {
  totalAlunos: number;
  pendentes: number;
  matriculas: number;
  modulosPublicados: number;
  modulosRascunho: number;
  porCurso: { id: string; title: string; matriculas: number }[];
}

interface CardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number;
  hint?: string;
  delay?: number;
  className?: string;
  to?: string;
  children?: React.ReactNode;
}

const Card = ({ icon: Icon, label, value, hint, delay = 0, className = "", to, children }: CardProps) => {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/80 backdrop-blur p-5 sm:p-6 flex flex-col gap-3 h-full ${to ? "hover:border-perestroika-preto/30 transition-colors" : ""} ${className}`}
    >
      <div className="flex items-center gap-2 text-perestroika-preto/60">
        <Icon className="h-4 w-4" />
        <span className="font-body text-xs uppercase tracking-wide">{label}</span>
      </div>
      {value !== undefined && (
        <div className="font-display text-5xl sm:text-6xl leading-none text-perestroika-preto">{value}</div>
      )}
      {hint && <p className="font-body text-xs text-perestroika-preto/60">{hint}</p>}
      {children}
    </motion.div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

const periodSinceISO = (p: Period): string | null => {
  if (p === "all") return null;
  const days = p === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
};

const PERIOD_LABEL: Record<Period, string> = {
  "7d": "últimos 7 dias",
  "30d": "últimos 30 dias",
  all: "desde sempre",
};

export const AdminStats = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title")
        .order("order_index", { ascending: true });
      setCourses(data ?? []);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const since = periodSinceISO(period);

    (async () => {
      try {
        // matrículas (filtradas por curso + período via created_at)
        let enrollQ = supabase.from("enrollments").select("user_id, course_id, created_at");
        if (courseId !== "all") enrollQ = enrollQ.eq("course_id", courseId);
        if (since) enrollQ = enrollQ.gte("created_at", since);

        // pendentes (período via created_at em profiles, sem filtro de curso)
        let pendQ = supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending");
        if (since) pendQ = pendQ.gte("created_at", since);

        // módulos publicados/rascunho (filtrados por curso via trails)
        let modPubQ = supabase.from("modules").select("id, trails!inner(course_id)", { count: "exact", head: true }).eq("published", true);
        let modDraftQ = supabase.from("modules").select("id, trails!inner(course_id)", { count: "exact", head: true }).eq("published", false);
        if (courseId !== "all") {
          modPubQ = modPubQ.eq("trails.course_id", courseId);
          modDraftQ = modDraftQ.eq("trails.course_id", courseId);
        }

        // estudantes ativos: enrollments status=active (filtrados por curso, sem período)
        let activeQ = supabase.from("enrollments").select("user_id, course_id").eq("status", "active");
        if (courseId !== "all") activeQ = activeQ.eq("course_id", courseId);

        const [enrollRes, pendRes, modPubRes, modDraftRes, activeRes, coursesRes] = await Promise.all([
          enrollQ,
          pendQ,
          modPubQ,
          modDraftQ,
          activeQ,
          supabase.from("courses").select("id, title"),
        ]);
        if (cancelled) return;

        const matriculas = (enrollRes.data ?? []).length;
        const activeRows = (activeRes.data ?? []) as { user_id: string; course_id: string }[];
        const totalAlunos = new Set(activeRows.map((r) => r.user_id)).size;

        const countsByCourse = new Map<string, number>();
        activeRows.forEach((r) => {
          countsByCourse.set(r.course_id, (countsByCourse.get(r.course_id) ?? 0) + 1);
        });
        const porCurso = (coursesRes.data ?? [])
          .map((c: { id: string; title: string }) => ({
            id: c.id,
            title: c.title,
            matriculas: countsByCourse.get(c.id) ?? 0,
          }))
          .sort((a, b) => b.matriculas - a.matriculas);

        setStats({
          totalAlunos,
          pendentes: pendRes.count ?? 0,
          matriculas,
          modulosPublicados: modPubRes.count ?? 0,
          modulosRascunho: modDraftRes.count ?? 0,
          porCurso,
        });
      } catch (e) {
        logger.error("[admin/stats] erro:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, period]);

  const courseLabel = useMemo(() => {
    if (courseId === "all") return "todas as eletivas";
    return courses.find((c) => c.id === courseId)?.title.toLowerCase() ?? "eletiva";
  }, [courseId, courses]);

  const selectCls =
    "rounded-full border border-perestroika-preto/15 bg-perestroika-bege/80 backdrop-blur px-4 py-2 font-body text-sm text-perestroika-preto focus:outline-none focus:border-perestroika-preto/40 cursor-pointer";

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={selectCls}>
          <option value="all">todas as eletivas</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title.toLowerCase()}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectCls}>
          <option value="7d">últimos 7 dias</option>
          <option value="30d">últimos 30 dias</option>
          <option value="all">desde sempre</option>
        </select>
        <span className="font-body text-xs text-perestroika-preto/50 ml-1">
          {courseLabel} · {PERIOD_LABEL[period]}
        </span>
      </div>

      {loading || !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/40 h-36 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            icon={UserPlus}
            label="matrículas no período"
            value={stats.matriculas}
            hint={period === "all" ? "total acumulado" : PERIOD_LABEL[period]}
            delay={0}
          />
          <Card
            icon={Users}
            label="estudantes ativos"
            value={stats.totalAlunos}
            hint={courseId === "all" ? "únicos em qualquer eletiva" : "matriculados nesta eletiva"}
            delay={0.05}
          />
          <Card
            icon={UserPlus}
            label="aguardando aprovação"
            value={stats.pendentes}
            hint={stats.pendentes > 0 ? "clica pra aprovar" : "ninguém na fila"}
            delay={0.1}
            to="/admin/pending"
            className={stats.pendentes > 0 ? "border-perestroika-preto/40 bg-perestroika-bege" : ""}
          />
          <Card
            icon={GraduationCap}
            label="módulos"
            value={stats.modulosPublicados}
            hint={`${stats.modulosRascunho} em rascunho`}
            delay={0.15}
            to="/admin/trilha"
          />
          {courseId === "all" && (
            <Card icon={BookMarked} label="estudantes por eletiva" delay={0.2} className="sm:col-span-2 lg:col-span-4">
              {stats.porCurso.length === 0 ? (
                <p className="font-body text-xs text-perestroika-preto/50">nenhuma eletiva ainda</p>
              ) : (
                <ul className="flex flex-col gap-1.5 mt-1">
                  {stats.porCurso.map((c) => (
                    <li key={c.id} className="flex items-baseline justify-between gap-2">
                      <button
                        onClick={() => setCourseId(c.id)}
                        className="font-body text-sm text-perestroika-preto truncate hover:underline text-left"
                      >
                        {c.title.toLowerCase()}
                      </button>
                      <span className="font-body text-xs tabular-nums text-perestroika-preto/60">
                        {c.matriculas} estudante{c.matriculas === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
