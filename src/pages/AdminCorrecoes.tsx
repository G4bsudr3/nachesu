import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { usePendingDeliverables, type DeliverableInbox } from "@/features/admin/usePendingDeliverables";
import { FeedbackReviewDrawer } from "@/features/admin/FeedbackReviewDrawer";
import { useAllCourses } from "@/hooks/useCourses";
import { cn } from "@/lib/utils";

const daysAgo = (iso: string | null) => {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

const AdminCorrecoes = () => {
  const { data, isLoading } = usePendingDeliverables({ status: "pendentes" });
  const courses = useAllCourses();
  const [selected, setSelected] = useState<DeliverableInbox | null>(null);

  const courseById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses.data ?? []) m.set(c.id, c.title);
    return m;
  }, [courses.data]);

  // ordena pelo que espera há mais tempo primeiro
  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => {
        const at = a.submitted_at ?? a.updated_at ?? "";
        const bt = b.submitted_at ?? b.updated_at ?? "";
        return at.localeCompare(bt);
      }),
    [data],
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">admin</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">correções</span>
      </nav>

      <div className="mb-6">
        <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.9]">
          fila de correção
        </h1>
        <p className="text-sm text-perestroika-preto/60 mt-1">
          entregas aguardando resposta, da mais antiga pra mais recente.
        </p>
      </div>

      {isLoading && (
        <div className="text-perestroika-preto/50">carregando…</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-10 text-center">
          <p className="font-display uppercase text-2xl leading-none mb-1">
            fila zerada
          </p>
          <p className="text-sm text-perestroika-preto/55">
            nenhuma entrega aguardando resposta agora.
          </p>
        </div>
      )}

      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
        {sorted.length} {sorted.length === 1 ? "entrega" : "entregas"} na fila
      </p>

      <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-perestroika-preto/[0.04]">
              <tr>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-perestroika-preto/55 font-semibold">
                  estudante
                </th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-perestroika-preto/55 font-semibold">
                  eletiva · módulo
                </th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-perestroika-preto/55 font-semibold">
                  enviado
                </th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wide text-perestroika-preto/55 font-semibold text-right">
                  esperando
                </th>
                <th className="px-4 py-3 w-16" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className="divide-y divide-perestroika-preto/10">
              {sorted.map((d) => {
                const dias = daysAgo(d.submitted_at);
                const late = dias > 7;
                const name =
                  d.profile?.display_name ?? d.profile?.nickname ?? "sem nome";
                const courseTitle = d.course_id
                  ? courseById.get(d.course_id) ?? ""
                  : "";
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-perestroika-preto/[0.02]",
                      late && "bg-rose-50/40",
                    )}
                  >
                    <td className="px-4 py-3 align-middle">
                      <p className="font-display uppercase text-base leading-none truncate">
                        {name}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                        {courseTitle}
                      </p>
                      {d.module && (
                        <p className="text-xs text-perestroika-preto/75 truncate">
                          módulo {String(d.module.number).padStart(2, "0")}{" "}
                          <span className="normal-case">— {d.module.title}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-xs text-perestroika-preto/75 tabular-nums">
                        <Clock className="w-3 h-3 text-perestroika-preto/40" />
                        {d.submitted_at
                          ? new Date(d.submitted_at).toLocaleDateString("pt-BR")
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <span
                        className={cn(
                          "inline-flex items-center justify-end gap-1 rounded-lg px-2.5 py-1.5 text-xs tabular-nums",
                          late
                            ? "bg-rose-100 text-rose-800"
                            : "bg-perestroika-preto/5 text-perestroika-preto/75",
                        )}
                      >
                        {late && <AlertTriangle className="w-3 h-3" />}
                        {dias}d
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <ChevronRight className="w-4 h-4 text-perestroika-preto/30 group-hover:text-perestroika-preto/60 transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <FeedbackReviewDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        deliverable={selected}
      />
    </div>
  );
};

export default AdminCorrecoes;
