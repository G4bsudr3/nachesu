import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMyEnrollments } from "@/hooks/useCourses";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

/**
 * lista as eletivas em que o aluno está matriculado.
 * RLS já garante que só vem o que ele tem acesso.
 */
export const MyCoursesList = () => {
  const { data: enrollments, isLoading } = useMyEnrollments();

  if (isLoading) {
    return (
      <section
        aria-label="minhas eletivas"
        className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] p-6 sm:p-8 motion-safe:animate-pulse"
      >
        <div className="h-3 w-32 bg-perestroika-preto/15 rounded mb-4" />
        <div className="h-8 w-2/3 bg-perestroika-preto/15 rounded" />
      </section>
    );
  }

  const items = (enrollments ?? []).filter((e) => e.course);

  if (items.length === 0) {
    return (
      <section
        aria-label="minhas eletivas"
        className="rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8"
      >
        <div className="flex items-center gap-4">
          <EletivaSymbol size={56} pose="resting" />
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60 mb-1">
              minhas eletivas
            </p>
            <p className="font-body text-sm text-perestroika-preto/75">
              você ainda não está matriculado em nenhuma eletiva. fala com o time da escola pra liberar seu acesso.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="minhas eletivas" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60">
          minhas eletivas
        </p>
        <Link
          to="/app/eletivas"
          className="font-body text-xs uppercase tracking-wider text-perestroika-preto/70 hover:text-perestroika-preto"
        >
          gerenciar →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((e) => {
          const c = e.course!;
          const accent =
            (c.theme && typeof c.theme === "object" && (c.theme as any).accent) ||
            "#6f77fc";
          return (
            <Link
              key={e.id}
              to={`/app/trilhas?eletiva=${c.slug}`}
              className="group relative overflow-hidden rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-6 transition hover:border-perestroika-preto hover:bg-perestroika-bege"
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
              <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
                eletiva
              </p>
              <h3 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] text-balance mb-2">
                {c.title.toLowerCase()}
              </h3>
              {c.subtitle && (
                <p className="font-body text-sm text-perestroika-preto/70 mb-4 text-pretty">
                  {c.subtitle.toLowerCase()}
                </p>
              )}
              <div className="flex items-center justify-between text-xs font-body text-perestroika-preto/70">
                <span>com {c.professor_name.toLowerCase()}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
