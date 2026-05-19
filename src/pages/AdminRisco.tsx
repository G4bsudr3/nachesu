import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RiskRow {
  user_id: string;
  course_id: string;
  days_inactive: number;
  risk_level: "low" | "medium" | "high" | "lost" | "caught_up";
  last_activity_at: string;
}

interface CourseRow {
  id: string;
  title: string;
  slug: string;
}

interface ProfileRow {
  id: string;
  nickname: string | null;
  full_name: string | null;
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

const AdminRisco = () => {
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [risksRes, coursesRes] = await Promise.all([
      supabase
        .from("student_engagement_risk")
        .select("user_id, course_id, days_inactive, risk_level, last_activity_at")
        .in("risk_level", ["medium", "high", "lost"])
        .order("days_inactive", { ascending: false }),
      supabase.from("courses").select("id, title, slug").order("order_index"),
    ]);

    const riskData = (risksRes.data ?? []) as RiskRow[];
    setRows(riskData);
    setCourses((coursesRes.data ?? []) as CourseRow[]);

    const userIds = [...new Set(riskData.map((r) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nickname, full_name")
        .in("id", userIds);
      const map: Record<string, ProfileRow> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runJob = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("check-student-evasion", {
        body: {},
      });
      if (error) throw error;
      toast.success("job executado", { description: "estudantes em risco foram notificados." });
      await load();
    } catch (e: any) {
      toast.error("falhou", { description: e?.message ?? "tenta de novo" });
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo(() => {
    if (courseFilter === "all") return rows;
    return rows.filter((r) => r.course_id === courseFilter);
  }, [rows, courseFilter]);

  const totals = useMemo(() => {
    const byLevel = { medium: 0, high: 0, lost: 0 };
    for (const r of filtered) {
      if (r.risk_level in byLevel) byLevel[r.risk_level as keyof typeof byLevel]++;
    }
    return byLevel;
  }, [filtered]);

  return (
    <PageShell>
      <PageHeader back={{ to: "/admin", label: "admin" }} />

      <main className="container max-w-5xl pb-20 pt-4">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-perestroika-vermelho" />
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight text-perestroika-preto">
              alunos em risco
            </h1>
          </div>
          <p className="font-body text-sm text-perestroika-preto/65">
            quem parou de aparecer na eletiva. cutucada automática roda todo dia 10h.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[260px] bg-white">
              <SelectValue placeholder="filtrar eletiva" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">todas as eletivas</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button onClick={load} variant="outline" size="sm" className="font-body text-xs uppercase">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> atualizar
            </Button>
            <Button onClick={runJob} disabled={running} size="sm" className="font-body text-xs uppercase">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              {running ? "rodando..." : "cutucar agora"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <div className="rounded-2xl bg-perestroika-laranja/15 p-4 text-center">
            <p className="font-display text-3xl text-perestroika-preto">{totals.medium}</p>
            <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65 mt-1">
              7+ dias
            </p>
          </div>
          <div className="rounded-2xl bg-perestroika-vermelho/15 p-4 text-center">
            <p className="font-display text-3xl text-perestroika-preto">{totals.high}</p>
            <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65 mt-1">
              14+ dias
            </p>
          </div>
          <div className="rounded-2xl bg-perestroika-vermelho p-4 text-center text-white">
            <p className="font-display text-3xl">{totals.lost}</p>
            <p className="font-body text-[11px] uppercase tracking-wide opacity-80 mt-1">
              21+ dias
            </p>
          </div>
        </div>

        {loading ? (
          <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-white/40 p-12 text-center">
            <p className="font-display text-2xl uppercase text-perestroika-preto mb-2">
              todo mundo respirando
            </p>
            <p className="font-body text-sm text-perestroika-preto/65">
              ninguém em risco de evasão agora.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-perestroika-preto/10 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-perestroika-bege/60">
                <tr className="text-left font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65">
                  <th className="px-4 py-3">estudante</th>
                  <th className="px-4 py-3 hidden sm:table-cell">eletiva</th>
                  <th className="px-4 py-3">parado</th>
                  <th className="px-4 py-3">nível</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-perestroika-preto/10">
                {filtered.map((r) => {
                  const profile = profiles[r.user_id];
                  const course = courses.find((c) => c.id === r.course_id);
                  const name = profile?.nickname || profile?.full_name || r.user_id.slice(0, 8);
                  return (
                    <tr key={`${r.user_id}-${r.course_id}`} className="font-body text-sm">
                      <td className="px-4 py-3 text-perestroika-preto">{name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-perestroika-preto/70">
                        {course?.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-perestroika-preto/70">
                        {r.days_inactive}d
                        <span className="block text-[11px] text-perestroika-preto/45">
                          {formatDistanceToNow(new Date(r.last_activity_at), { locale: ptBR })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-semibold",
                          LEVEL_STYLE[r.risk_level],
                        )}>
                          {LEVEL_LABEL[r.risk_level]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/users?u=${r.user_id}`}
                          className="text-xs font-body uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                        >
                          abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default AdminRisco;
