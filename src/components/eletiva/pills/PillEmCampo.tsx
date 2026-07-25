import { useState } from "react";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

export type EmCampoValue = {
  returned_at?: string;
};

type Schema = {
  type?: "em_campo";
  headline?: string;
  body?: string;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: EmCampoValue;
  emCampoMap: Record<string, EmCampoValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

export function PillEmCampo({
  pillId,
  schema,
  accent,
  initial,
  emCampoMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [value, setValue] = useState<EmCampoValue>(() => ({
    returned_at: initial?.returned_at,
  }));

  const status = useAutoSaveField({
    value: { ...emCampoMap, [pillId]: value },
    initial: emCampoMap,
    save,
    field: "em_campo_aula17",
  });

  const handleReturn = () => {
    if (isCompleted || isCompleting) return;
    setValue({ returned_at: new Date().toISOString() });
    onComplete();
  };

  const headline = schema.headline ?? "experimento em campo";
  const body =
    schema.body ??
    "sua missão: executar o experimento e registrar tudo. quando terminar, volta aqui e libera a parte 2.";
  const ctaLabel = schema.completion?.label ?? "voltei, quero registrar";

  return (
    <div className="space-y-6">
      <div
        className="rounded-3xl p-6 flex flex-col items-start gap-3"
        style={{ backgroundColor: `${accent}18`, border: `2px solid ${accent}55` }}
      >
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: accent, color: "#fff" }}
        >
          <FlaskConical className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none text-perestroika-preto">
          {headline}
        </h3>
        <p className="font-body text-sm text-perestroika-preto/80 max-w-xl leading-snug">{body}</p>
        <ul className="font-body text-xs text-perestroika-preto/70 space-y-1 pl-4 list-disc">
          <li>não conta pra ninguém envolvido no teste o que você espera.</li>
          <li>registra tudo em tempo real: foto, áudio, número.</li>
          <li>critério é sagrado. não mexe depois.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <SaveIndicator status={status} />
          {value.returned_at && (
            <p className="font-body text-xs text-perestroika-preto/60">
              marcado como retornado.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleReturn}
          disabled={isCompleted || isCompleting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-body text-sm uppercase tracking-wider transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isCompleted ? "rgba(9,9,9,0.15)" : accent,
            color: isCompleted ? "rgba(9,9,9,0.6)" : "#fff",
          }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> parte 2 liberada
            </>
          ) : (
            <>
              {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
