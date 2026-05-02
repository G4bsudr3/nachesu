import { Link } from "react-router-dom";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

export const EletivaCard = () => {
  const { data, isLoading } = useEletivaProgress();

  if (isLoading) {
    return (
      <section
        aria-label="próximo passo"
        className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] p-8 sm:p-12 motion-safe:animate-pulse"
      >
        <div className="h-3 w-32 bg-perestroika-preto/15 rounded mb-6" />
        <div className="h-12 w-3/4 bg-perestroika-preto/15 rounded mb-4" />
        <div className="h-4 w-1/2 bg-perestroika-preto/10 rounded" />
      </section>
    );
  }

  if (!data) return null;

  const { currentModule, nextModule, totalPublished, totalCompleted, trails } = data;

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
          eletiva ia na prática
        </p>
        <h2 className="font-display uppercase text-5xl sm:text-7xl mb-4 leading-[0.9] text-balance max-w-2xl">
          sua eletiva tá aquecendo
        </h2>
        <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-xl mb-8 text-pretty">
          são 20 módulos divididos em 4 trilhas. o primeiro módulo abre em breve, você é avisado por aqui assim que liberar.
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

  // estado D: tudo concluído
  const moduleToShow = currentModule ?? nextModule;
  if (!moduleToShow) {
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
          ciclo completo
        </p>
        <h2 className="font-display uppercase text-5xl sm:text-7xl mb-4 leading-[0.9] text-balance max-w-2xl">
          os 20 módulos foram seus
        </h2>
        <p className="font-body text-base sm:text-lg text-perestroika-bege/85 mb-8 max-w-xl text-pretty">
          agora é hora de soltar o seu projeto autoral pro mundo. revisita o que fizer sentido, quando fizer sentido.
        </p>
        <Link
          to="/app/projeto"
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          ver meu projeto <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  // estados B (primeiro acesso) e C (em andamento)
  const isFirstStep = totalCompleted === 0;
  const trail = trails.find((t) => t.id === moduleToShow.trail_id);
  const trailColor =
    trailColorByOrder[trail?.order_index ?? 1] ?? "#fe7b02";
  const eyebrow = isFirstStep ? "começa por aqui" : "continue de onde parou";
  const ctaLabel = isFirstStep ? "abrir módulo 01" : "voltar pro módulo";

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
          módulo {String(moduleToShow.number).padStart(2, "0")}/20
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
          to={`/app/modulo/${moduleToShow.number}`}
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
