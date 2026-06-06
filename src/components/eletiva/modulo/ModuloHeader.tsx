import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  trailTitle: string | null;
  trailColor: string;
  moduleNumber: number;
  totalModules: number;
  title: string;
  objective: string | null;
  totalMinutes: number | null;
  isCompleted: boolean;
}

export const ModuloHeader = ({
  trailTitle,
  trailColor,
  moduleNumber,
  totalModules,
  title,
  objective,
  totalMinutes,
  isCompleted,
}: Props) => (
  <section
    aria-label="cabeçalho do módulo"
    className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-6 sm:p-8 mb-8"
  >
    <div
      className="absolute inset-x-0 top-0 h-1.5"
      style={{ backgroundColor: trailColor }}
      aria-hidden="true"
    />
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 inline-flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: trailColor }}
          aria-hidden="true"
        />
        {trailTitle?.toLowerCase() ?? "trilha"}
      </p>
      <span className="font-body text-xs sm:text-sm text-perestroika-preto/60 whitespace-nowrap">
        módulo {String(moduleNumber).padStart(2, "0")}/{String(totalModules).padStart(2, "0")}
      </span>
    </div>

    <h1 className="font-display uppercase text-4xl sm:text-5xl mb-3 leading-[0.95]">{title}</h1>

    {objective && (
      <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-2xl mb-5">
        {objective}
      </p>
    )}

    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-body text-sm text-perestroika-preto/70">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {totalMinutes ? `${totalMinutes} min` : "tempo variável"}
      </span>
      {isCompleted && (
        <span className="inline-flex items-center gap-1.5 text-perestroika-preto">
          <CheckCircle2 className="h-3.5 w-3.5" /> concluído
        </span>
      )}
    </div>
  </section>
);
