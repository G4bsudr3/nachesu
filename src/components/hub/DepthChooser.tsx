import { useState } from "react";
import { Compass, Check } from "lucide-react";
import { toast } from "sonner";
import type { DepthPref } from "@/hooks/useDepth";

interface Props {
  value: DepthPref;
  onChange: (next: DepthPref) => void;
}

const OPTIONS: { id: DepthPref; label: string; sub: string }[] = [
  { id: "comeca-por-aqui", label: "começa por aqui", sub: "caminho direto, essencial" },
  { id: "vai-mais-fundo", label: "vai mais fundo", sub: "camada técnica opcional" },
];

export const DepthChooser = ({ value, onChange }: Props) => {
  const [savedFlash, setSavedFlash] = useState(false);

  const handleChange = (next: DepthPref) => {
    if (next === value) return;
    onChange(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
    const label = OPTIONS.find((o) => o.id === next)?.label ?? next;
    toast.success(`profundidade salva: ${label}`, {
      description: "vale pras próximas telas também.",
      duration: 3000,
    });
  };

  return (
    <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 backdrop-blur p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-perestroika-preto/60" />
          <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/60">
            escolher profundidade
          </p>
        </div>
        {savedFlash && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-2.5 py-0.5 text-[10px] uppercase tracking-wide animate-fade-up"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            salvo
          </span>
        )}
      </div>
      <div role="radiogroup" aria-label="profundidade" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => handleChange(opt.id)}
              className={`text-left rounded-xl px-4 py-3 transition-all min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege ${
                active
                  ? "bg-perestroika-preto text-perestroika-bege"
                  : "border border-perestroika-preto/20 text-perestroika-preto hover:border-perestroika-preto"
              }`}
            >
              <p className="font-body text-sm font-medium leading-tight">{opt.label}</p>
              <p className={`mt-0.5 font-body text-xs ${active ? "text-perestroika-bege/70" : "text-perestroika-preto/55"}`}>
                {opt.sub}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-body text-xs text-perestroika-preto/55">
        troca quando quiser. a trilha se ajusta na hora.
      </p>
    </div>
  );
};
