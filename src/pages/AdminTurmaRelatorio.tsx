import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type ReportRow = {
  course_id: string;
  course_title: string;
  user_id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  turma: string | null;
  modules_completed: number;
  modules_total: number;
  reached_m20: boolean;
  completed_m20: boolean;
  final_delivered: boolean;
  final_status: string | null;
  final_submitted_at: string | null;
  final_link: string | null;
};

type CohortRow = { id: string; name: string; starts_on: string | null; ends_on: string | null };

const rpc = <T,>(fn: string, args?: Record<string, unknown>) =>
  (supabase as never as {
    rpc: (f: string, a?: Record<string, unknown>) => Promise<{ data: T | null; error: Error | null }>;
  }).rpc(fn, args);

const nameOf = (r: ReportRow) => r.full_name || r.display_name || r.email;

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "–";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportCsv = (rows: ReportRow[], cohortName: string) => {
  const header = [
    "eletiva",
    "estudante",
    "email",
    "turma_escola",
    "modulos_concluidos",
    "modulos_total",
    "chegou_modulo_20",
    "concluiu_modulo_20",
    "entregou_projeto_final",
    "status_entrega",
    "enviado_em",
    "link_do_projeto",
  ];
  const lines = rows.map((r) =>
    [
      r.course_title,
      nameOf(r),
      r.email,
      r.turma ?? "",
      r.modules_completed,
      r.modules_total,
      r.reached_m20 ? "sim" : "não",
      r.completed_m20 ? "sim" : "não",
      r.final_delivered ? "sim" : "não",
      r.final_status ?? "",
      r.final_submitted_at ?? "",
      r.final_link ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-${cohortName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const SimNao = ({ ok }: { ok: boolean }) =>
  ok ? (
    <span className="inline-flex items-center gap-1 text-perestroika-preto">
      <CheckCircle2 className="w-4 h-4 text-perestroika-azul" aria-hidden />
      sim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-perestroika-preto/45">
      <Circle className="w-4 h-4" aria-hidden />
      ainda não
    </span>
  );

/** relatório da turma, separado por eletiva: quem chegou no módulo 20 e quem entregou o projeto final */
const AdminTurmaRelatorio = () => {
  const { cohortId } = useParams<{ cohortId: string }>();

  const { data: cohorts } = useQuery({
    queryKey: ["admin-cohorts"],
    queryFn: async () => {
      const { data, error } = await rpc<CohortRow[]>("admin_cohorts");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-cohort-report", cohortId],
    enabled: !!cohortId,
    queryFn: async () => {
      const { data, error } = await rpc<ReportRow[]>("admin_cohort_report", { _cohort_id: cohortId });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cohort = cohorts?.find((c) => c.id === cohortId);

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; rows: ReportRow[] }>();
    (data ?? []).forEach((r) => {
      const g = map.get(r.course_id) ?? { title: r.course_title, rows: [] };
      g.rows.push(r);
      map.set(r.course_id, g);
    });
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-body text-perestroika-preto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/turmas"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          voltar pras turmas
        </Link>
        <button
          type="button"
          onClick={() => data && cohort && exportCsv(data, cohort.name)}
          disabled={!data || data.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-perestroika-preto/20 px-3 py-1.5 text-[12px] hover:bg-perestroika-preto/5 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto/30"
        >
          <Download className="w-3.5 h-3.5" />
          baixar csv
        </button>
      </div>

      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">relatório da turma</p>
        <h1 className="font-display text-4xl uppercase leading-none">{cohort?.name ?? "turma"}</h1>
        <p className="text-sm text-perestroika-preto/65">
          por eletiva: quem chegou no módulo 20 e quem entregou o projeto final.
        </p>
      </header>

      {isLoading && <p className="text-sm text-perestroika-preto/50">montando o relatório…</p>}

      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-perestroika-preto/60">
          essa turma ainda não tem estudante matriculado em nenhuma eletiva.
        </p>
      )}

      {groups.map((g) => {
        const total = g.rows.length || 1;
        const chegaram = g.rows.filter((r) => r.reached_m20).length;
        const entregaram = g.rows.filter((r) => r.final_delivered).length;
        const naoIniciaram = g.rows.filter((r) => r.modules_completed === 0).length;
        const iniciaramSemM20 = g.rows.filter(
          (r) => r.modules_completed > 0 && !r.reached_m20,
        ).length;
        const comLink = g.rows.filter((r) => !!r.final_link).length;
        const pct = (n: number) => Math.round((n / total) * 100);
        const stats = [
          { label: "chegaram no módulo 20", qtd: chegaram, valor: pct(chegaram), cor: "bg-perestroika-azul" },
          { label: "iniciaram sem chegar no módulo 20", qtd: iniciaramSemM20, valor: pct(iniciaramSemM20), cor: "bg-perestroika-laranja" },
          { label: "não iniciaram", qtd: naoIniciaram, valor: pct(naoIniciaram), cor: "bg-perestroika-vermelho" },
          { label: "enviaram link do projeto", qtd: comLink, valor: pct(comLink), cor: "bg-perestroika-rosa" },
        ];
        return (
          <section key={g.title} className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-2xl uppercase leading-none">{g.title}</h2>
              <p className="text-[12px] text-perestroika-preto/60">
                {g.rows.length} estudantes · {chegaram} chegaram no módulo 20 · {entregaram} entregaram o projeto final · {comLink} com link do projeto
              </p>
            </div>

            <div className="rounded-2xl border border-perestroika-preto/15 p-4 sm:p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="space-y-2">
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-perestroika-preto/60">{s.label}</span>
                    <span className="font-display text-3xl leading-none tabular-nums">{s.valor}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-perestroika-preto/10 overflow-hidden">
                    <div className={`h-full ${s.cor}`} style={{ width: `${s.valor}%` }} />
                  </div>
                  <p className="text-[11px] text-perestroika-preto/50 tabular-nums">
                    {s.qtd} de {g.rows.length} estudantes
                  </p>
                </div>
              ))}
            </div>


            <div className="rounded-2xl border border-perestroika-preto/15 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-perestroika-preto/55 border-b border-perestroika-preto/10">
                    <th className="py-2 px-4 font-medium">estudante</th>
                    <th className="py-2 px-4 font-medium">progresso</th>
                    <th className="py-2 px-4 font-medium">chegou no módulo 20</th>
                    <th className="py-2 px-4 font-medium">projeto final</th>
                    <th className="py-2 px-4 font-medium">link do projeto</th>
                    <th className="py-2 px-4 font-medium">enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={`${r.course_id}-${r.user_id}`} className="border-b border-perestroika-preto/5">
                      <td className="py-2 px-4">
                        <Link
                          to={`/admin/aluno/${r.user_id}`}
                          className="font-medium hover:underline underline-offset-2"
                        >
                          {nameOf(r)}
                        </Link>
                        <p className="text-[11px] text-perestroika-preto/50 break-all">{r.email}</p>
                      </td>
                      <td className="py-2 px-4 tabular-nums text-perestroika-preto/70">
                        {r.modules_completed}/{r.modules_total}
                      </td>
                      <td className="py-2 px-4">
                        <SimNao ok={r.reached_m20} />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <SimNao ok={r.final_delivered} />
                          {r.final_status && (
                            <Badge
                              variant="outline"
                              className="border-perestroika-preto/20 text-[11px] font-normal"
                            >
                              {r.final_status}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-perestroika-preto/65">
                        {fmtDateTime(r.final_submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default AdminTurmaRelatorio;
