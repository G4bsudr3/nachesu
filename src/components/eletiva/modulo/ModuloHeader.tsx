import { CheckCircle2, Layers, Sparkles } from "lucide-react";
import { DuracaoBadge } from "@/components/eletiva/DuracaoBadge";

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
  /** soma das pílulas obrigatórias (piso e teto), em minutos */
  coreMinLow?: number;
  coreMinHigh?: number;
  /** soma das pílulas opcionais (teto), em minutos */
  bonusMinHigh?: number;
}

const formatRange = (low?: number, high?: number) => {
  const l = low || 0;
  const h = high || 0;
  if (!l && !h) return null;
  if (!l || !h || l === h) return `${l || h} min`;
  return `${l}-${h} min`;
};

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
  coreMinLow,
  coreMinHigh,
  bonusMinHigh,
}: Props) => {
  const pct = totalPills && totalPills > 0 ? Math.round(((donePills ?? 0) / totalPills) * 100) : 0;
  const coreLabel = formatRange(coreMinLow, coreMinHigh) ?? (totalMinutes ? `${totalMinutes} min` : null);
  const isDense = (coreMinLow ?? 0) > 50;

  return (
    <section
      aria-label="cabeçalho do módulo"
      className="relative overflow-hidden rounded-3xl bg-perestroika-bege text-perestroika-preto p-6 sm:p-9 mb-8 sm:mb-10 border-2 border-perestroika-preto/25"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: trailColor }}
        aria-hidden="true"
      />

      {/* breadcrumb eletiva > trilha */}
      <nav
        aria-label="localização"
        className="flex items-center gap-2 flex-wrap font-body text-[10px] uppercase tracking-[0.22em] text-perestroika-preto/60 mb-5"
      >
        {courseTitle && (
          <>
            <span>{courseTitle.toLowerCase()}</span>
            <span aria-hidden className="text-perestroika-preto/30">/</span>
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
      <p className="font-display uppercase text-2xl leading-none mb-1 text-perestroika-preto/70">
        módulo <span className="text-perestroika-preto">{String(moduleNumber).padStart(2, "0")}</span>
      </p>

      <h1 className="font-display uppercase text-5xl sm:text-6xl mb-4 leading-[0.9] text-perestroika-preto">
        {title.toLowerCase()}
      </h1>

      {objective && (
        <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-2xl mb-6">
          {objective}
        </p>
      )}

      {/* chips de ficha técnica */}
      <div className="flex flex-wrap items-center gap-2">
        {typeof totalPills === "number" && totalPills > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto/10 px-3 py-1.5 font-body text-xs uppercase tracking-wider">
            <Layers className="h-3 w-3" aria-hidden />
            {totalPills} {totalPills === 1 ? "bloco" : "blocos"}
          </span>
        )}
        <DuracaoBadge variant="chip">
          {coreLabel ? `${coreLabel} de núcleo` : "tempo variável"}
        </DuracaoBadge>
        {!!bonusMinHigh && bonusMinHigh > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/20 px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/65">
            <Sparkles className="h-3 w-3" aria-hidden />
            +{bonusMinHigh} min de bônus opcional
          </span>
        )}
        {isDense && (
          <span className="inline-flex items-center rounded-full bg-perestroika-preto/5 px-3 py-1.5 font-body text-xs text-perestroika-preto/65">
            esse é mais denso que a média
          </span>
        )}

        {isCompleted && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto"
            style={{ backgroundColor: trailColor }}
          >
            <CheckCircle2 className="h-3 w-3" /> concluído
          </span>
        )}
      </div>

      {/* indicador de progresso consistente */}
      {typeof totalPills === "number" && totalPills > 0 && (
        <div className="mt-6" aria-label={`progresso: ${donePills ?? 0} de ${totalPills} blocos, ${pct}%`}>
          <div className="flex items-baseline justify-between mb-2 gap-3">
            <p className="font-body text-[10px] uppercase tracking-[0.22em] text-perestroika-preto/60">
              progresso do módulo
            </p>
            <p className="font-body text-xs tabular-nums text-perestroika-preto/85">
              <span className="font-semibold text-perestroika-preto">{donePills ?? 0}/{totalPills}</span>
              <span className="text-perestroika-preto/60 mx-1.5">·</span>
              <span className="font-semibold text-perestroika-preto">{pct}%</span>
            </p>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-perestroika-preto/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundColor: trailColor }}
            />
          </div>
        </div>
      )}
    </section>
  );
};
