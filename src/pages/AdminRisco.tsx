import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Mail, RefreshCw, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RiskRow {
  user_id: string;
  course_id: string;
  days_inactive: number;
  risk_level: "low" | "medium" | "high" | "lost" | "caught_up";
  last_activity_at: string;
}

interface ActivationRow {
  user_id: string;
  course_id: string;
  enrolled_at: string;
  days_since_enroll: number;
}

interface CourseRow { id: string; title: string; slug: string }
interface ProfileRow {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
  is_test: boolean | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") === "ativacao" ? "ativacao" : "evasao") as
    | "evasao"
    | "ativacao";

  const [rows, setRows] = useState<RiskRow[]>([]);
  const [activation, setActivation] = useState<ActivationRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [includeTest, setIncludeTest] = useState(false);

  const load = async () => {
    setLoading(true);
    const [risksRes, coursesRes, activationRes] = await Promise.all([
      supabase
        .from("student_engagement_risk")
        .select("user_id, course_id, days_inactive, risk_level, last_activity_at")
        .in("risk_level", ["medium", "high", "lost"])
        .order("days_inactive", { ascending: false }),
      supabase.from("courses").select("id, title, slug").order("order_index"),
      supabase
        .from("student_activation_pending" as never)
        .select("user_id, course_id, enrolled_at, days_since_enroll")
        .order("days_since_enroll", { ascending: false }),
    ]);

    const riskData = (risksRes.data ?? []) as RiskRow[];
    const actData = (activationRes.data ?? []) as ActivationRow[];
    setRows(riskData);
    setActivation(actData);
    setCourses((coursesRes.data ?? []) as CourseRow[]);

    const userIds = [...new Set([...riskData.map((r) => r.user_id), ...actData.map((a) => a.user_id)])];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, nickname, display_name, is_test")
        .in("user_id", userIds);
      const map: Record<string, ProfileRow> = {};
      (profs ?? []).forEach((p: ProfileRow) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runJob = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("check-student-evasion", { body: {} });
      if (error) throw error;
      toast.success("job executado", { description: "estudantes em risco foram notificados." });
      await load();
    } catch (e: any) {
      toast.error("falhou", { description: e?.message ?? "tenta de novo" });
    } finally {
      setRunning(false);
    }
  };

  const filteredRisk = useMemo(() => {
    return rows.filter((r) => {
      if (courseFilter !== "all" && r.course_id !== courseFilter) return false;
      if (!includeTest && profiles[r.user_id]?.is_test) return false;
      return true;
    });
  }, [rows, courseFilter, profiles, includeTest]);

  const filteredActivation = useMemo(() => {
    return activation.filter((a) => {
      if (courseFilter !== "all" && a.course_id !== courseFilter) return false;
      if (!includeTest && profiles[a.user_id]?.is_test) return false;
      return true;
    });
  }, [activation, courseFilter, profiles, includeTest]);

  const totals = useMemo(() => {
    const byLevel = { medium: 0, high: 0, lost: 0 };
    for (const r of filteredRisk) {
      if (r.risk_level in byLevel) byLevel[r.risk_level as keyof typeof byLevel]++;
    }
    return byLevel;
  }, [filteredRisk]);

  return (
    <PageShell>
      <PageHeader back={{ to: "/admin", label: "voltar" }} actions={<AuthedHeaderActions />} />

      <main className="container max-w-5xl pb-20 pt-4 space-y-6">
        <header className="">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-perestroika-vermelho" />
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight text-perestroika-preto">
              acompanhamento de turma
            </h1>
          </div>
          <p className="font-body text-sm text-perestroika-preto/65">
            evasão = quem começou e parou. ativação = quem matriculou e ainda não entrou. cutucada automática roda todo dia 10h.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[260px] bg-perestroika-bege">
              <SelectValue placeholder="filtrar eletiva" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">todas as eletivas</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/65 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
              className="h-4 w-4 rounded border-perestroika-preto/30"
            />
            incluir contas de teste
          </label>

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

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const sp = new URLSearchParams(searchParams);
            if (v === "ativacao") sp.set("tab", "ativacao");
            else sp.delete("tab");
            setSearchParams(sp, { replace: true });
          }}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="evasao">
              evasão ({filteredRisk.length})
            </TabsTrigger>
            <TabsTrigger value="ativacao">
              ativação pendente ({filteredActivation.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evasao" className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl bg-perestroika-laranja/15 p-4 text-center">
                <p className="font-display text-3xl text-perestroika-preto">{totals.medium}</p>
                <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65 mt-1">7+ dias</p>
              </div>
              <div className="rounded-2xl bg-perestroika-vermelho/15 p-4 text-center">
                <p className="font-display text-3xl text-perestroika-preto">{totals.high}</p>
                <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65 mt-1">14+ dias</p>
              </div>
              <div className="rounded-2xl bg-perestroika-vermelho p-4 text-center text-white">
                <p className="font-display text-3xl">{totals.lost}</p>
                <p className="font-body text-[11px] uppercase tracking-wide opacity-80 mt-1">21+ dias</p>
              </div>
            </div>

            {loading ? (
              <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
            ) : filteredRisk.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-perestroika-preto/15 bg-perestroika-bege/40 p-12 text-center space-y-2">
                <p className="font-display text-2xl uppercase text-perestroika-preto">todo mundo respirando</p>
                <p className="font-body text-sm text-perestroika-preto/65">
                  ninguém que começou está em risco de evasão agora.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-perestroika-preto/5 text-[10px] uppercase tracking-wide text-perestroika-preto/60">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">estudante</th>
                      <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">eletiva</th>
                      <th className="text-left px-3 py-2 font-semibold">parado</th>
                      <th className="text-left px-3 py-2 font-semibold">nível</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-perestroika-preto/5">
                    {filteredRisk.map((r) => {
                      const profile = profiles[r.user_id];
                      const course = courses.find((c) => c.id === r.course_id);
                      const name = profile?.nickname || profile?.display_name || r.user_id.slice(0, 8);
                      return (
                        <tr key={`${r.user_id}-${r.course_id}`} className="font-body text-sm hover:bg-perestroika-preto/5 transition-colors">
                          <td className="px-3 py-2 text-perestroika-preto">
                            {name}
                            {profile?.is_test && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-perestroika-preto/60">teste</span>
                            )}
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell text-perestroika-preto/70">{course?.title ?? "–"}</td>
                          <td className="px-3 py-2 text-perestroika-preto/70">
                            {r.days_inactive}d
                            <span className="block text-[11px] text-perestroika-preto/45">
                              {formatDistanceToNow(new Date(r.last_activity_at), { locale: ptBR })}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-semibold",
                              LEVEL_STYLE[r.risk_level],
                            )}>
                              {LEVEL_LABEL[r.risk_level]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to={`/admin/aluno/${r.user_id}`}
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
          </TabsContent>

          <TabsContent value="ativacao" className="space-y-4">
            <p className="font-body text-sm text-perestroika-preto/65">
              estudantes matriculados ativos que ainda não abriram nenhuma aula nem rascunho. não é evasão, é primeiro empurrão.
            </p>
            {loading ? (
              <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
            ) : filteredActivation.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-perestroika-preto/15 bg-perestroika-bege/40 p-12 text-center space-y-2">
                <p className="font-display text-2xl uppercase text-perestroika-preto">todo mundo já entrou</p>
                <p className="font-body text-sm text-perestroika-preto/65">
                  nenhum matriculado pendente de ativação.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-perestroika-preto/5 text-[10px] uppercase tracking-wide text-perestroika-preto/60">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">estudante</th>
                      <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">eletiva</th>
                      <th className="text-left px-3 py-2 font-semibold">matriculou há</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-perestroika-preto/5">
                    {filteredActivation.map((a) => {
                      const profile = profiles[a.user_id];
                      const course = courses.find((c) => c.id === a.course_id);
                      const name = profile?.nickname || profile?.display_name || a.user_id.slice(0, 8);
                      return (
                        <tr key={`${a.user_id}-${a.course_id}`} className="font-body text-sm hover:bg-perestroika-preto/5 transition-colors">
                          <td className="px-3 py-2 text-perestroika-preto">
                            <UserPlus className="inline-block h-3.5 w-3.5 mr-1.5 text-perestroika-preto/60" />
                            {name}
                            {profile?.is_test && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-perestroika-preto/60">teste</span>
                            )}
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell text-perestroika-preto/70">{course?.title ?? "–"}</td>
                          <td className="px-3 py-2 text-perestroika-preto/70">
                            {a.days_since_enroll}d
                            <span className="block text-[11px] text-perestroika-preto/45">
                              {formatDistanceToNow(new Date(a.enrolled_at), { locale: ptBR })}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to={`/admin/aluno/${a.user_id}`}
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
          </TabsContent>
        </Tabs>
      </main>
    </PageShell>
  );
};

export default AdminRisco;
