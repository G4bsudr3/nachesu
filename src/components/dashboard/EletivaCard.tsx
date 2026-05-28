import { Link } from "react-router-dom";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useEletivaProgress, type EletivaSnapshot } from "@/hooks/useEletivaProgress";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { moduloHref } from "@/lib/moduleHref";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

interface Props {
  /**
   * snapshot já fetchado lá no AppDashboard. opcional: se não vier,
   * o componente fetcha sozinho (react-query dedupa, sem custo).
   * passar a prop garante que greeting + hero + trilhas leiam do mesmo
   * snapshot na mesma render.
   */
  snapshot?: EletivaSnapshot;
  /**
   * título do curso ativo, usado no eyebrow. se não vier, resolve via
   * useMyEnrollments + useActiveEletiva. nunca hardcodar nome de eletiva.
   */
  courseTitle?: string;
}

export const EletivaCard = ({ snapshot, courseTitle }: Props = {}) => {
  const query = useEletivaProgress();
  const data = snapshot ?? query.data;
  const isLoading = !snapshot && query.isLoading;

  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug } = useActiveEletiva();
  const resolvedTitle =
    courseTitle ??
    (enrollments && enrollments.length === 1
      ? enrollments[0].course?.title
      : enrollments?.find((e) => e.course?.slug === activeSlug)?.course?.title) ??
    "";
  const eyebrowEletiva = resolvedTitle
    ? `eletiva ${resolvedTitle.toLowerCase()}`
    : "sua eletiva";

  if (isLoading) {
    return (
      <section
        aria-label="próximo passo"
        aria-busy="true"
        className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] p-8 sm:p-12 motion-safe:animate-pulse"
      >
        <div className="h-3 w-40 bg-perestroika-preto/15 rounded mb-6" />
        <div className="h-12 sm:h-16 w-11/12 bg-perestroika-preto/15 rounded mb-3" />
        <div className="h-12 sm:h-16 w-2/3 bg-perestroika-preto/15 rounded mb-6" />
        <div className="h-4 w-3/4 bg-perestroika-preto/10 rounded mb-2" />
        <div className="h-4 w-1/2 bg-perestroika-preto/10 rounded mb-8" />
        <div className="flex flex-wrap gap-3">
          <div className="h-12 w-48 rounded-full bg-perestroika-preto/15" />
          <div className="h-12 w-36 rounded-full bg-perestroika-preto/10" />
        </div>
      </section>
    );
  }

  if (!data) return null;

  const {
    currentModule,
    nextModule,
    totalPublished,
    totalCompleted,
    trails,
    progressByModuleId,
  } = data;

  // estado A: nada publicado ainda → eletiva aquecendo
  if (totalPublished === 0) {
    return (
      <section
        aria-label="próximo passo"
        className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-8 sm:p-12"
      >
        <div
          className="absolute -right-8 -top-8 opacity-90 pointer-events-none"
          aria-hidden="true"
        >
          <EletivaSymbol size={160} rotate={8} pose="building" />
        </div>
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60 mb-4">
          {eyebrowEletiva}
        </p>
        <h2 className="font-display uppercase text-5xl sm:text-7xl mb-4 leading-[0.9] text-balance max-w-2xl">
          sua eletiva tá aquecendo
        </h2>
        <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-xl mb-8 text-pretty">
          são 20 módulos divididos em 4 trilhas. o primeiro abre em breve, você é avisado por aqui assim que liberar.
        </p>
        <div className="flex flex-wrap gap-2">
          {trails.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/15 bg-white/40 px-3 py-1.5 font-body text-xs sm:text-sm"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    t.color ?? trailColorByOrder[t.order_index] ?? "#090909",
                }}
                aria-hidden="true"
              />
              {t.title.toLowerCase()}
            </span>
          ))}
        </div>
      </section>
    );
  }

  // estado D: tudo o que está publicado já foi concluído
  // (não confundir com "fechou os 20" — pode ter só 5 publicados ainda)
  const moduleToShow = currentModule ?? nextModule;
  if (!moduleToShow) {
    const fechouTudo = totalCompleted >= 20;
    return (
      <section
        aria-label="próximo passo"
        className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-8 sm:p-12"
      >
        <div
          className="absolute -right-8 -top-8 opacity-30 pointer-events-none"
          aria-hidden="true"
        >
          <EletivaSymbol size={180} pose="celebrating" />
        </div>
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-bege/70 mb-4 inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {fechouTudo ? "ciclo completo" : "em dia"}
        </p>
        <h2 className="font-display uppercase text-5xl sm:text-7xl mb-4 leading-[0.9] text-balance max-w-2xl">
          {fechouTudo
            ? "os 20 módulos foram seus"
            : "você tá em dia com a eletiva"}
        </h2>
        <p className="font-body text-base sm:text-lg text-perestroika-bege/85 mb-8 max-w-xl text-pretty">
          {fechouTudo
            ? "agora é hora de soltar o seu projeto autoral pro mundo. revisita o que fizer sentido, quando fizer sentido."
            : `fechou os ${totalCompleted} módulos abertos até aqui. o próximo libera em breve, te aviso por aqui.`}
        </p>
        {fechouTudo && (
          <Link
            to="/app/trilhas"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            revisitar a trilha <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {!fechouTudo && (
          <Link
            to="/app/trilhas"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            revisitar o que já fiz <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
    );
  }

  // estados B (primeiro acesso) e C (em andamento)
  // distingue 3 sub-estados:
  //  - "começar agora" → nunca abriu nenhum módulo
  //  - "começar este módulo" → já fechou outros, mas nunca abriu este
  //  - "voltar pro módulo" → este módulo está iniciado, não concluído
  const moduleProgress = progressByModuleId[moduleToShow.id];
  const isStarted = !!moduleProgress?.started_at;
  const noProgressAtAll = totalCompleted === 0 && !isStarted;
  const numberStr = String(moduleToShow.number).padStart(2, "0");

  const eyebrow = noProgressAtAll
    ? "começa por aqui"
    : isStarted
      ? "continue de onde parou"
      : "próximo módulo";

  const ctaLabel = noProgressAtAll
    ? `abrir módulo ${numberStr}`
    : isStarted
      ? `voltar pro módulo ${numberStr}`
      : `começar módulo ${numberStr}`;

  const trail = trails.find((t) => t.id === moduleToShow.trail_id);
  const trailColor = trailColorByOrder[trail?.order_index ?? 1] ?? "#fe7b02";

  return (
    <section
      aria-label="próximo módulo da eletiva"
      className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-8 sm:p-12"
    >
      {/* accent bar topo com cor da trilha */}
      <div
        className="absolute inset-x-0 top-0 h-2"
        style={{ backgroundColor: trailColor }}
        aria-hidden="true"
      />

      {/* mascote construindo no canto */}
      <div
        className="absolute -right-6 -top-2 opacity-90 pointer-events-none hidden sm:block"
        aria-hidden="true"
      >
        <EletivaSymbol size={140} rotate={-8} pose="building" />
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/60">
          {eyebrow}
        </p>
        <span className="font-body text-xs sm:text-sm text-perestroika-preto/60 whitespace-nowrap tabular-nums">
          módulo {numberStr}/{String(totalPublished).padStart(2, "0")}
        </span>
      </div>

      <h2 className="font-display uppercase text-5xl sm:text-7xl mb-5 leading-[0.9] text-balance max-w-2xl">
        {moduleToShow.title}
      </h2>

      {moduleToShow.objective && (
        <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-xl mb-6 text-pretty">
          {moduleToShow.objective}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 font-body text-sm text-perestroika-preto/70">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {moduleToShow.total_minutes ?? 50} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: trailColor }}
            aria-hidden="true"
          />
          {trail?.title.toLowerCase() ?? "trilha"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          to={moduloHref(activeSlug, moduleToShow.number)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 font-body text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          {ctaLabel} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/app/trilhas"
          className="inline-flex items-center justify-center gap-2 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto underline-offset-4 hover:underline"
        >
          ver mapa completo
        </Link>
      </div>
    </section>
  );
};
