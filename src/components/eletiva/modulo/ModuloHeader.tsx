import { CheckCircle2, Clock, Layers } from "lucide-react";

interface Props {
  courseTitle?: string | null;
  trailTitle: string | null;
  trailColor: string;
  moduleNumber: number;
  totalModules: number;
  title: string;
  objective: string | null;
  totalMinutes: number | null;
  isCompleted: boolean;
  totalPills?: number;
  donePills?: number;
}

export const ModuloHeader = ({
  courseTitle,
  trailTitle,
  trailColor,
  moduleNumber,
  totalModules,
  title,
  objective,
  totalMinutes,
  isCompleted,
  totalPills,
  donePills,
}: Props) => {
  const pct = totalPills && totalPills > 0 ? Math.round(((donePills ?? 0) / totalPills) * 100) : 0;
  return (
    <section
      aria-label="cabeçalho do módulo"
      className="relative overflow-hidden rounded-3xl bg-perestroika-preto text-perestroika-bege p-6 sm:p-9 mb-6"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: trailColor }}
        aria-hidden="true"
      />

      {/* breadcrumb eletiva > trilha */}
      <nav
        aria-label="localização"
        className="flex items-center gap-2 flex-wrap font-body text-[10px] uppercase tracking-[0.22em] text-perestroika-bege/60 mb-5"
      >
        {courseTitle && (
          <>
            <span>{courseTitle.toLowerCase()}</span>
            <span aria-hidden className="text-perestroika-bege/30">/</span>
          </>
        )}
        {trailTitle && (
          <span className="inline-flex items-center gap-1.5" style={{ color: trailColor }}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: trailColor }} />
            {trailTitle.toLowerCase()}
          </span>
        )}
      </nav>

      {/* número do módulo em destaque */}
      <p className="font-display uppercase text-2xl leading-none mb-1 text-perestroika-bege/70">
        módulo <span className="text-perestroika-bege">{String(moduleNumber).padStart(2, "0")}</span>
        <span className="text-perestroika-bege/40"> / {String(totalModules).padStart(2, "0")}</span>
      </p>

      <h1 className="font-display uppercase text-5xl sm:text-6xl mb-4 leading-[0.9] text-perestroika-bege">
        {title.toLowerCase()}
      </h1>

      {objective && (
        <p className="font-body text-base sm:text-lg text-perestroika-bege/75 max-w-2xl mb-6">
          {objective}
        </p>
      )}

      {/* chips de ficha técnica */}
      <div className="flex flex-wrap items-center gap-2">
        {typeof totalPills === "number" && totalPills > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege/10 px-3 py-1.5 font-body text-xs uppercase tracking-wider">
            <Layers className="h-3 w-3" aria-hidden />
            {totalPills} {totalPills === 1 ? "bloco" : "blocos"}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege/10 px-3 py-1.5 font-body text-xs uppercase tracking-wider">
          <Clock className="h-3 w-3" aria-hidden />
          {totalMinutes ? `${totalMinutes} min` : "tempo variável"}
        </span>
        {isCompleted && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto"
            style={{ backgroundColor: trailColor }}
          >
            <CheckCircle2 className="h-3 w-3" /> concluído
          </span>
        )}
        {typeof totalPills === "number" && totalPills > 0 && !isCompleted && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege/10 px-3 py-1.5 font-body text-xs uppercase tracking-wider tabular-nums">
            {donePills ?? 0}/{totalPills} · {pct}%
          </span>
        )}
      </div>
    </section>
  );
};
