import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, UserPlus, GraduationCap, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface Stats {
  totalAlunos: number;
  pendentes: number;
  matriculas: number;
  modulosPublicados: number;
  modulosRascunho: number;
  porCurso: { title: string; matriculas: number }[];
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

export const AdminStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [
          { count: totalAlunos },
          { count: pendentes },
          { count: matriculas },
          { count: modulosPublicados },
          { count: modulosRascunho },
          coursesRes,
          enrollmentsRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("enrollments").select("*", { count: "exact", head: true }),
          supabase.from("modules").select("*", { count: "exact", head: true }).eq("published", true),
          supabase.from("modules").select("*", { count: "exact", head: true }).eq("published", false),
          supabase.from("courses").select("id, title"),
          supabase.from("enrollments").select("course_id"),
        ]);
        if (cancelled) return;

        const countsByCourse = new Map<string, number>();
        (enrollmentsRes.data ?? []).forEach((e: { course_id: string }) => {
          countsByCourse.set(e.course_id, (countsByCourse.get(e.course_id) ?? 0) + 1);
        });
        const porCurso = (coursesRes.data ?? [])
          .map((c: { id: string; title: string }) => ({
            title: c.title,
            matriculas: countsByCourse.get(c.id) ?? 0,
          }))
          .sort((a, b) => b.matriculas - a.matriculas);

        setStats({
          totalAlunos: totalAlunos ?? 0,
          pendentes: pendentes ?? 0,
          matriculas: matriculas ?? 0,
          modulosPublicados: modulosPublicados ?? 0,
          modulosRascunho: modulosRascunho ?? 0,
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
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/40 h-36 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card
        icon={Users}
        label="alunos ativos"
        value={stats.totalAlunos}
        hint={`${stats.matriculas} matrícula${stats.matriculas === 1 ? "" : "s"} no total`}
        delay={0}
      />
      <Card
        icon={UserPlus}
        label="aguardando aprovação"
        value={stats.pendentes}
        hint={stats.pendentes > 0 ? "clica pra aprovar" : "ninguém na fila"}
        delay={0.05}
        to="/admin/pending"
        className={stats.pendentes > 0 ? "border-perestroika-preto/40 bg-perestroika-bege" : ""}
      />
      <Card
        icon={GraduationCap}
        label="módulos publicados"
        value={stats.modulosPublicados}
        hint={`${stats.modulosRascunho} em rascunho`}
        delay={0.1}
        to="/admin/trilha"
      />
      <Card icon={BookMarked} label="por eletiva" delay={0.15}>
        {stats.porCurso.length === 0 ? (
          <p className="font-body text-xs text-perestroika-preto/50">nenhuma eletiva ainda</p>
        ) : (
          <ul className="flex flex-col gap-1.5 mt-1">
            {stats.porCurso.map((c) => (
              <li key={c.title} className="flex items-baseline justify-between gap-2">
                <span className="font-body text-sm text-perestroika-preto truncate">
                  {c.title.toLowerCase()}
                </span>
                <span className="font-body text-xs tabular-nums text-perestroika-preto/60">
                  {c.matriculas} aluno{c.matriculas === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
