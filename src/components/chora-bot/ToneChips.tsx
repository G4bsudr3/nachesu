import { CHORA_BOT_TONES, type ChoraBotTone } from "@/features/hub/choraBotTones";

interface ToneChipsProps {
  value: ChoraBotTone;
  onChange: (next: ChoraBotTone) => void;
}

/**
 * chips de tom do chora bot — mini balões com gradient quando ativo.
 * persistência fica na página pai (localStorage).
 */
export const ToneChips = ({ value, onChange }: ToneChipsProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/40 font-display">
        tom
      </span>
      <div
        role="radiogroup"
        aria-label="tom da resposta do chora bot"
        className="flex flex-wrap gap-1.5"
      >
        {CHORA_BOT_TONES.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={t.hint}
              onClick={() => onChange(t.id)}
              className={`relative px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-display transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-1 focus-visible:ring-offset-perestroika-bege ${
                active
                  ? "text-perestroika-bege shadow-[0_4px_12px_-2px_rgba(247,86,166,0.4)]"
                  : "text-perestroika-preto/60 bg-perestroika-bege border border-perestroika-preto/15 hover:border-perestroika-preto/40"
              }`}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(90deg, #fe7b02 0%, #fd4644 30%, #f756a6 60%, #6f77fc 100%)",
                    }
                  : undefined
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
