import { useRef } from "react";
import type { BuilderLevel } from "@/lib/builderLevel";
import { levelLabel } from "@/lib/builderLevel";

const LEVELS: BuilderLevel[] = ["novato", "iniciante", "intermediario", "avancado"];

interface LevelSwitcherProps {
  current: BuilderLevel;
  detected: BuilderLevel;
  hasOverride: boolean;
  onChange: (l: BuilderLevel) => void;
  onReset: () => void;
}

/** seletor de trilha. 4 pills, controlado, com navegação por teclado. */
export const LevelSwitcher = ({
  current,
  detected,
  hasOverride,
  onChange,
  onReset,
}: LevelSwitcherProps) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (idx + 1) % LEVELS.length : (idx - 1 + LEVELS.length) % LEVELS.length;
    onChange(LEVELS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* mobile: grid 4 colunas mantém continuidade visual da trilha. sm+: pill flex tradicional. */}
      <div
        role="radiogroup"
        aria-label="trilha do builder"
        className="grid grid-cols-4 gap-1 sm:inline-flex sm:flex-wrap sm:items-center sm:gap-1.5 rounded-full border border-perestroika-preto/15 bg-perestroika-bege/60 backdrop-blur p-1 w-full sm:w-auto"
      >
        {LEVELS.map((l, i) => {
          const active = l === current;
          return (
            <button
              key={l}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(l)}
              onKeyDown={(e) => handleKey(e, i)}
              className={`px-2 sm:px-3.5 py-1.5 min-h-9 rounded-full text-[10px] sm:text-[11px] uppercase tracking-wide font-body transition-all text-center inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege ${
                active
                  ? "bg-perestroika-preto text-perestroika-bege"
                  : "text-perestroika-preto/70 hover:text-perestroika-preto hover:bg-perestroika-preto/[0.06]"
              }`}
            >
              {levelLabel(l)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-body text-perestroika-preto/55">
        <span>trocar trilha só muda o que você vê aqui. seu nível real vem do fbi.</span>
        {hasOverride && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center min-h-11 px-1 underline underline-offset-2 hover:text-perestroika-preto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
          >
            voltar pro detectado ({levelLabel(detected)})
          </button>
        )}
      </div>
    </div>
  );
};
