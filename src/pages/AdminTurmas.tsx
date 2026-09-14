import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ChevronDown, ChevronRight, GraduationCap, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Cohort = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  student_count: number;
  courses: string[];
};

type CohortMember = {
  user_id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  turma: string | null;
  courses: string[];
};

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "sem data";

const useCohorts = () =>
  useQuery({
    queryKey: ["admin-cohorts"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as {
        rpc: (fn: string) => Promise<{ data: Cohort[] | null; error: Error | null }>;
      }).rpc("admin_cohorts");
      if (error) throw error;
      return data ?? [];
    },
  });

const useCohortMembers = (cohortId: string | null) =>
  useQuery({
    queryKey: ["admin-cohort-members", cohortId],
    enabled: !!cohortId,
    queryFn: async () => {
      const { data, error } = await (supabase as never as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: CohortMember[] | null; error: Error | null }>;
      }).rpc("admin_cohort_members", { _cohort_id: cohortId });
      if (error) throw error;
      return data ?? [];
    },
  });

const MembersTable = ({ cohortId }: { cohortId: string }) => {
  const { data, isLoading } = useCohortMembers(cohortId);

  if (isLoading) {
    return <p className="px-4 py-6 text-sm text-perestroika-preto/50">carregando estudantes…</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-perestroika-preto/60">
        essa turma ainda não tem estudantes. matricule alguém numa eletiva pra ver gente aqui.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-perestroika-preto/55 border-b border-perestroika-preto/10">
            <th className="py-2 px-4 font-medium">estudante</th>
            <th className="py-2 px-4 font-medium">e-mail</th>
            <th className="py-2 px-4 font-medium">turma escola</th>
            <th className="py-2 px-4 font-medium">eletivas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.user_id} className="border-b border-perestroika-preto/5 align-top">
              <td className="py-2 px-4">
                <Link
                  to={`/admin/aluno/${m.user_id}`}
                  className="font-medium hover:underline underline-offset-2"
                >
                  {m.full_name || m.display_name || m.email}
                </Link>
              </td>
              <td className="py-2 px-4 text-perestroika-preto/65 break-all">{m.email}</td>
              <td className="py-2 px-4 text-perestroika-preto/65">{m.turma || "–"}</td>
              <td className="py-2 px-4">
                <div className="flex flex-wrap gap-1">
                  {m.courses.length === 0 ? (
                    <span className="text-perestroika-preto/45">sem matrícula</span>
                  ) : (
                    m.courses.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className="border-perestroika-preto/20 text-[11px] font-normal"
                      >
                        {c}
                      </Badge>
                    ))
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** turmas que já passaram pela naches: período, eletivas e quem participou */
const AdminTurmas = () => {
  const { data, isLoading } = useCohorts();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-body text-perestroika-preto">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">admin</p>
        <h1 className="font-display text-4xl uppercase leading-none">turmas</h1>
        <p className="text-sm text-perestroika-preto/65">
          cada turma reúne o período, as eletivas e os estudantes que passaram por ela.
        </p>
      </header>

      {isLoading && <p className="text-sm text-perestroika-preto/50">carregando turmas…</p>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="rounded-2xl border border-dashed border-perestroika-preto/20 p-8 text-center">
          <GraduationCap className="w-6 h-6 mx-auto mb-2 text-perestroika-preto/40" />
          <p className="text-sm text-perestroika-preto/70">
            nenhuma turma criada ainda. a primeira turma aparece aqui assim que for cadastrada.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(data ?? []).map((c) => {
          const isOpen = open === c.id;
          return (
            <section
              key={c.id}
              className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.id)}
                aria-expanded={isOpen}
                className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-perestroika-preto/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto/30"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 mt-1 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 mt-1 shrink-0" />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl uppercase leading-none">{c.name}</h2>
                    <span className="inline-flex items-center gap-1 text-[12px] text-perestroika-preto/60">
                      <Users className="w-3.5 h-3.5" />
                      {c.student_count} estudantes
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-sm text-perestroika-preto/65">{c.description}</p>
                  )}
                  <p className="inline-flex items-center gap-1.5 text-[12px] text-perestroika-preto/60">
                    <CalendarRange className="w-3.5 h-3.5" />
                    {fmtDate(c.starts_on)} até {fmtDate(c.ends_on)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.courses.map((t) => (
                      <Badge
                        key={t}
                        className="bg-perestroika-preto text-perestroika-bege text-[11px] font-normal"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </button>

              <div className="px-4 pb-4 -mt-1">
                <Link
                  to={`/admin/turmas/${c.id}/relatorio`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-perestroika-preto/20 px-3 py-1.5 text-[12px] hover:bg-perestroika-preto/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto/30"
                >
                  <FileText className="w-3.5 h-3.5" />
                  abrir relatório da turma
                </Link>
              </div>

              {isOpen && (
                <div className="border-t border-perestroika-preto/10 bg-perestroika-bege/70">
                  <MembersTable cohortId={c.id} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default AdminTurmas;
