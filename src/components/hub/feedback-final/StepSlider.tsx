import { useId } from "react";
import type { StepDef } from "@/features/hub/feedbackFinalSchema";

interface Props {
  step: StepDef;
  value: number | null;
  onChange: (v: number) => void;
}

/** slider 0-10 com número gigante em League Gothic e gradient laranja→rosa→azul. */
export const StepSlider = ({ step, value, onChange }: Props) => {
  const id = useId();
  const min = step.range?.min ?? 0;
  const max = step.range?.max ?? 10;
  const display = value ?? Math.round((min + max) / 2);
  const hasValue = value !== null;
  const pct = ((display - min) / (max - min)) * 100;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div
          className="font-display text-[160px] sm:text-[220px] leading-none transition-all"
          style={{
            background: hasValue
              ? "linear-gradient(135deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)"
              : undefined,
            WebkitBackgroundClip: hasValue ? "text" : undefined,
            WebkitTextFillColor: hasValue ? "transparent" : undefined,
            color: hasValue ? undefined : "rgba(9,9,9,0.15)",
          }}
        >
          {display}
        </div>
        {!hasValue && (
          <p className="text-xs uppercase tracking-[0.2em] text-perestroika-preto/45 mt-2">
            arrasta pra escolher
          </p>
        )}
      </div>

      <div className="px-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={display}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer slider-perestroika"
          style={{
            background: `linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc ${pct}%, rgba(9,9,9,0.1) ${pct}%, rgba(9,9,9,0.1) 100%)`,
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={display}
          aria-label={step.question}
        />
        <div className="flex items-center justify-between mt-3 text-xs uppercase tracking-wide text-perestroika-preto/55">
          <span>{step.scaleLabels?.low ?? min}</span>
          <span>{step.scaleLabels?.high ?? max}</span>
        </div>
      </div>

      <style>{`
        .slider-perestroika::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #090909;
          border: 3px solid #f2e4d8;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          transition: transform 0.15s ease;
        }
        .slider-perestroika::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .slider-perestroika::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #090909;
          border: 3px solid #f2e4d8;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
      `}</style>
    </div>
  );
};
