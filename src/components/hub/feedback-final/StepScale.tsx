import type { StepDef } from "@/features/hub/feedbackFinalSchema";

interface Props {
  step: StepDef;
  value: number | null;
  onChange: (v: number) => void;
}

const COLORS = [
  "bg-perestroika-vermelho",
  "bg-perestroika-laranja",
  "bg-perestroika-rosa",
  "bg-perestroika-azul",
  "bg-perestroika-preto",
];

/** escala 1-5 visual com 5 quadrados clicáveis e gradient implícito. */
export const StepScale = ({ step, value, onChange }: Props) => {
  const min = step.range?.min ?? 1;
  const max = step.range?.max ?? 5;
  const options = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {options.map((opt, idx) => {
          const selected = value === opt;
          const colorClass = selected ? COLORS[idx] ?? "bg-perestroika-preto" : "bg-white/60";
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-label={`nota ${opt}`}
              className={`aspect-square rounded-2xl border transition-all duration-200 flex items-center justify-center font-display text-3xl sm:text-5xl ${
                selected
                  ? `${colorClass} text-perestroika-bege border-transparent scale-105 shadow-lg`
                  : "bg-white/60 border-perestroika-preto/15 text-perestroika-preto/60 hover:bg-white hover:border-perestroika-preto/30 hover:scale-[1.02]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-perestroika-preto/55 px-1">
        <span>{step.scaleLabels?.low}</span>
        <span>{step.scaleLabels?.high}</span>
      </div>
    </div>
  );
};
