import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";


/**
 * Hero de dashboard pra estudante matriculada em 2+ eletivas.
 * Substitui o par [switcher + hero da ativa] por 2 cards em peso equivalente.
 * Cada card já é a decisão: mostra próximo módulo, progresso e CTA da sua trilha.
 * Direção "duas trilhas ativas editorial" — bauhaus warm, League Gothic protagonista.
 */
export const DualEletivasHero = () => {
  const { data: enrollments } = useMyEnrollments();
  const items = (enrollments ?? []).filter((e) => e.course);
  if (items.length < 2) return null;

  return (
    <section aria-label="suas duas eletivas" className="space-y-5 sm:space-y-6">
      <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60">
        escolha sua trilha
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {items.map((e, idx) => {
          const themeAccent =
            (e.course!.theme &&
              typeof e.course!.theme === "object" &&
              (e.course!.theme as any).accent) ||
            null;
          const slugAccent: Record<string, string> = {
            "ia-na-pratica": "#f756a6",
            "economia-circular": "#8A85BF",
          };
          const siblingsShareColor =
            items.length === 2 &&
            themeAccent &&
            ((items[0].course!.theme as any)?.accent ===
              (items[1].course!.theme as any)?.accent);
          const accent =
            (siblingsShareColor ? null : themeAccent) ||
            slugAccent[e.course!.slug] ||
            (idx === 0 ? "#f756a6" : "#1E2BB8");
          return (
            <EletivaJourneyCard
              key={e.id}
              courseId={e.course_id}
              slug={e.course!.slug}
              title={e.course!.title}
              accent={accent}
            />
          );
        })}
      </div>
    </section>
  );
};


interface CardProps {
  courseId: string;
  slug: string;
  title: string;
  accent: string;
}

const EletivaJourneyCard = ({ courseId, slug, title, accent }: CardProps) => {
  const { data, isLoading } = useEletivaProgress(courseId);
  const { setSlug } = useActiveEletiva();

  const totalPublished = data?.totalPublished ?? 0;
  const totalCompleted = data?.totalCompleted ?? 0;
  const moduleToShow = data?.currentModule ?? data?.nextModule ?? null;
  const pct = totalPublished > 0 ? Math.round((totalCompleted / totalPublished) * 100) : 0;

  const started = totalCompleted > 0;
  const ctaLabel = !moduleToShow
    ? "revisar trilha"
    : started
      ? "continuar trilha"
      : "começar trilha";
  const ctaHref = `/app/eletiva/${slug}`;

  const status = totalPublished === 0
    ? "aguardando primeiro módulo"
    : moduleToShow
      ? `mod ${String(moduleToShow.number).padStart(2, "0")}/20`
      : "em dia";

  const nextTitle = moduleToShow?.title?.toLowerCase() ?? "";
  const nextObjective = moduleToShow?.objective?.toLowerCase() ?? "";

  return (
    <Link
      to={ctaHref}
      onClick={() => setSlug(slug)}
      aria-label={`abrir eletiva ${title.toLowerCase()}`}
      className="group relative overflow-hidden rounded-3xl border-2 border-perestroika-preto p-7 sm:p-8 flex flex-col justify-between min-h-[380px] text-perestroika-bege transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ backgroundColor: accent }}
    >
      {/* decoração bauhaus, alinhada ao padrão dos hero cards do projeto */}
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-perestroika-bege/10 transition-transform duration-500 group-hover:scale-110"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-8 -left-6 w-40 h-6 bg-perestroika-preto/25 -rotate-45"
      />

      <div className="relative z-10">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-bege/80 mb-4">
          {status}
        </p>

        <h3 className="font-display uppercase text-5xl sm:text-6xl leading-[0.85] mb-4 text-balance">
          {title.toLowerCase()}
        </h3>

        {isLoading ? (
          <div className="space-y-2 motion-safe:animate-pulse">
            <div className="h-3 w-3/4 bg-perestroika-bege/30 rounded" />
            <div className="h-3 w-1/2 bg-perestroika-bege/20 rounded" />
          </div>
        ) : moduleToShow ? (
          <p className="font-body text-sm sm:text-base text-perestroika-bege/90 leading-snug text-pretty line-clamp-3">
            <span className="font-bold">próximo passo:</span>{" "}
            {nextTitle || nextObjective || "abra a trilha pra ver o módulo."}
          </p>
        ) : (
          <p className="font-body text-sm sm:text-base text-perestroika-bege/90 leading-snug text-pretty">
            {totalPublished === 0
              ? "o primeiro módulo abre em breve. você é avisada por aqui."
              : "você tá em dia. revise materiais ou aguarde o próximo abrir."}
          </p>
        )}
      </div>

      <div className="relative z-10 mt-8 space-y-5 pt-5 border-t border-perestroika-bege/25">
        <div>
          <div className="flex items-baseline justify-between mb-2 gap-3">
            <span className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-bege/80">
              progresso
            </span>
            <span className="font-body text-xs tabular-nums text-perestroika-bege">
              {totalCompleted}/{totalPublished} · {pct}%
            </span>
          </div>
          <div
            className="w-full bg-perestroika-preto/25 h-1.5 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${totalCompleted} de ${totalPublished} módulos concluídos, ${pct}%`}
          >
            <div
              className="h-full bg-perestroika-bege rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(pct, moduleToShow ? 4 : 0)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-full bg-perestroika-bege text-perestroika-preto px-5 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform group-hover:scale-[1.02]">
          <span className="inline-flex items-center gap-2 truncate">
            {ctaLabel}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
};

