import { Check } from "lucide-react";
import type { TutorialStep } from "@/features/tutorial/tutorialSteps";

interface IdeaStepEntry {
  id: string;
  number: string;
  title: string;
}

interface Props {
  steps: TutorialStep[];
  completed: Set<string>;
  current?: string;
  onSelect: (id: string) => void;
  /** etapa 00 (ideia base) opcional, renderizada antes das demais. */
  ideaStep?: IdeaStepEntry;
}

/** stepper de bolinhas conectadas. inclui etapa 00 (ideia) quando passada. */
export const TutorialStepper = ({ steps, completed, current, onSelect, ideaStep }: Props) => {
  const all: { id: string; number: string; title: string }[] = ideaStep
    ? [{ id: ideaStep.id, number: ideaStep.number, title: ideaStep.title }, ...steps]
    : steps;

  return (
    <nav aria-label="progresso do tutorial" className="mt-5 w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {all.map((s, i) => {
          const isDone = completed.has(s.id);
          const isCurrent = s.id === current && !isDone;
          const isLast = i === all.length - 1;

          return (
            <li key={s.id} className="flex items-center gap-1 sm:gap-2 flex-1">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-label={`etapa ${s.number}: ${s.title}${isDone ? " (concluída)" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                className={`relative shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full font-display text-sm sm:text-base flex items-center justify-center transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege ${
                  isDone
                    ? "bg-perestroika-preto text-perestroika-bege hover:scale-105"
                    : isCurrent
                      ? "bg-perestroika-bege text-perestroika-preto ring-2 ring-perestroika-preto"
                      : "bg-perestroika-preto/[0.06] text-perestroika-preto/55 hover:bg-perestroika-preto/10 hover:text-perestroika-preto"
                }`}
              >
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-0.5 rounded-full opacity-70 motion-safe:animate-pulse"
                    style={{
                      background:
                        "linear-gradient(90deg, #fe7b02 0%, #fd4644 30%, #f756a6 60%, #6f77fc 100%)",
                      WebkitMask:
                        "radial-gradient(circle, transparent 60%, black 62%)",
                      mask: "radial-gradient(circle, transparent 60%, black 62%)",
                    }}
                  />
                )}
                {isDone ? <Check className="h-4 w-4" /> : <span>{s.number}</span>}
              </button>
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={`h-px flex-1 transition-colors ${
                    isDone ? "bg-perestroika-preto/60" : "bg-perestroika-preto/15"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
