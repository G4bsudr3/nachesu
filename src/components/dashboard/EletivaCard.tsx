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
        aria-label="sua trilha"
        className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] p-6 sm:p-8 motion-safe:animate-pulse"
      >
        <div className="h-3 w-32 bg-perestroika-preto/15 rounded mb-4" />
        <div className="h-8 w-3/4 bg-perestroika-preto/15 rounded mb-3" />
        <div className="h-4 w-1/2 bg-perestroika-preto/10 rounded" />
      </section>
    );
  }

  if (!data) return null;

  const { currentModule, nextModule, totalPublished, totalCompleted, trails } = data;

  // empty state: nada publicado ainda
  if (totalPublished === 0) {
    return (
      <section
        aria-label="sua trilha"
        className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8"
      >
        <div className="absolute -right-6 -top-6 opacity-90 pointer-events-none" aria-hidden="true">
          <EletivaSymbol size={110} rotate={12} pose="peeking" />
        </div>
        <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-3">
          eletiva ia na prática
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl mb-3 leading-[0.95]">
          sua trilha está aquecendo
        </h2>
        <p className="font-body text-base text-perestroika-preto/75 max-w-lg mb-6">
          20 módulos, 4 trilhas, um projeto autoral seu no fim. o primeiro módulo abre em breve, você recebe aviso quando rolar.
        </p>
        <div className="flex flex-wrap gap-2">
          {trails.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/15 px-3 py-1.5 font-body text-xs sm:text-sm"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: t.color ?? trailColorByOrder[t.order_index] ?? "#090909" }}
                aria-hidden="true"
              />
              {t.title.toLowerCase()}
            </span>
          ))}
        </div>
      </section>
    );
  }

  // estado normal: tem módulo atual
  const moduleToShow = currentModule ?? nextModule;
  if (!moduleToShow) {
    // tudo concluído
    return (
      <section
        aria-label="sua trilha"
        className="rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-6 sm:p-8"
      >
        <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-bege/60 mb-3 inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          fechou a eletiva
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl mb-3 leading-[0.95]">
          os 20 módulos foram seus
        </h2>
        <p className="font-body text-base text-perestroika-bege/80 mb-6 max-w-lg">
          agora é hora de soltar o seu projeto pro mundo e revisitar o que faz sentido.
        </p>
        <Link
          to="/app/projeto"
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          ver meu projeto <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const progressPct = totalPublished > 0 ? Math.round((totalCompleted / totalPublished) * 100) : 0;
  const trailColor = trailColorByOrder[
    trails.find((t) => t.id === moduleToShow.trail_id)?.order_index ?? 1
  ] ?? "#fe7b02";
  const isNext = !currentModule;

  return (
    <section
      aria-label="próximo módulo da eletiva"
      className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-6 sm:p-8"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: trailColor }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60">
          {isNext ? "próximo módulo" : "continue de onde parou"}
        </p>
        <span className="font-body text-xs sm:text-sm text-perestroika-preto/60 whitespace-nowrap">
          módulo {String(moduleToShow.number).padStart(2, "0")}/20
        </span>
      </div>

      <h2 className="font-display uppercase text-3xl sm:text-4xl mb-3 leading-[0.95]">
        {moduleToShow.title}
      </h2>

      {moduleToShow.objective && (
        <p className="font-body text-base text-perestroika-preto/75 max-w-lg mb-5">
          {moduleToShow.objective}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 font-body text-sm text-perestroika-preto/70">
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
          {trails.find((t) => t.id === moduleToShow.trail_id)?.title.toLowerCase() ?? "trilha"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <Link
          to={`/app/modulo/${moduleToShow.number}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          {isNext ? "começar módulo" : "continuar"} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/app/trilhas"
          className="inline-flex items-center justify-center gap-2 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto underline-offset-4 hover:underline"
        >
          ver mapa completo
        </Link>

        <div className="flex-1 min-w-[140px]">
          <div className="flex items-center justify-between font-body text-xs text-perestroika-preto/60 mb-1.5">
            <span>sua jornada</span>
            <span>{totalCompleted}/{totalPublished}</span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-perestroika-preto/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressPct}% concluído`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: trailColor }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
