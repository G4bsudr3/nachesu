import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Star } from "lucide-react";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { MobileNav } from "@/components/layout/MobileNav";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

const MinhasEletivas = () => {
  const { data: enrollments, isLoading } = useMyEnrollments();
  const { slug: activeSlug, setSlug } = useActiveEletiva();

  const items = (enrollments ?? []).filter((e) => e.course);

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        back={{ to: "/app", label: "voltar" }}
        actions={<AuthedHeaderActions />}
      />

      <main
        id="conteudo"
        className="relative z-10"
        style={{ paddingBottom: "calc(var(--mobile-nav-h, 0px) + 5rem)" }}
      >
        <div className="container max-w-4xl pt-6 sm:pt-10 space-y-8">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-4 w-4" /> voltar ao painel
          </Link>

          <header>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-perestroika-preto/60 mb-2">
              minhas matrículas
            </p>
            <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.9] mb-3">
              suas eletivas
            </h1>
            <p className="font-body text-base text-perestroika-preto/75 max-w-2xl">
              escolhe qual delas vira a "atual". a atual aparece em destaque no painel e nas trilhas.
            </p>
          </header>

          {isLoading ? (
            <div className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] p-8 motion-safe:animate-pulse h-40" />
          ) : items.length === 0 ? (
            <div className="rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-8 text-center space-y-3">
              <EletivaSymbol size={64} pose="resting" />
              <p className="font-body text-sm text-perestroika-preto/75">
                você ainda não está matriculado em nenhuma eletiva. fala com o time da escola pra liberar.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((e) => {
                const c = e.course!;
                const accent =
                  (c.theme && typeof c.theme === "object" && (c.theme as any).accent) ||
                  "#6f77fc";
                const isActive = activeSlug === c.slug || (!activeSlug && items.length === 1);
                return (
                  <li
                    key={e.id}
                    className={`relative overflow-hidden rounded-3xl border-2 p-6 transition ${
                      isActive
                        ? "border-perestroika-preto bg-perestroika-bege"
                        : "border-perestroika-preto/15 bg-perestroika-bege/60"
                    }`}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55">
                        eletiva
                      </p>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto px-2.5 py-1 text-[10px] uppercase tracking-wider text-perestroika-bege">
                          <Star className="h-3 w-3" /> atual
                        </span>
                      )}
                    </div>
                    <h2 className="font-display uppercase text-3xl leading-[0.95] text-balance mb-2">
                      {c.title.toLowerCase()}
                    </h2>
                    {c.subtitle && (
                      <p className="font-body text-sm text-perestroika-preto/70 mb-3 text-pretty">
                        {c.subtitle.toLowerCase()}
                      </p>
                    )}
                    <p className="font-body text-xs text-perestroika-preto/60 mb-5">
                      com {c.professor_name.toLowerCase()}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => setSlug(c.slug)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/30 px-3.5 py-1.5 font-body text-xs hover:border-perestroika-preto"
                        >
                          <Check className="h-3.5 w-3.5" /> tornar atual
                        </button>
                      )}
                      <Link
                        to={`/app/trilhas?eletiva=${c.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto px-3.5 py-1.5 font-body text-xs text-perestroika-bege hover:opacity-90"
                      >
                        ver trilhas <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <ChoraBotFab />
      <MobileNav />
    </div>
  );
};

export default MinhasEletivas;
