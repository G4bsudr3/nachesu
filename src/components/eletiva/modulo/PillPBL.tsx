import { useEffect, useState } from "react";
import { CheckCircle2, Circle, MessageCircle, Target } from "lucide-react";
import { SaveIndicator } from "@/components/eletiva/pills/SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "@/components/eletiva/pills/useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

interface Props {
  pillId: string;
  title: string;
  bodyMd?: string | null;
  trailColor: string;
  initial: string;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onOpenTutor: () => void;
  onComplete: () => void;
  isCompleted: boolean;
  isPending: boolean;
}

/**
 * pílula tipo `exercicio_pbl`: workspace de problema. mostra briefing,
 * CTA destacado pra abrir o tutor IA já contextualizado, e textarea de
 * resposta autosalvando em deliverable.content.pbl_responses[pillId].
 * marca conclusão quando aluno escreve ≥ 80 chars.
 */
export const PillPBL = ({
  pillId,
  title,
  bodyMd,
  trailColor,
  initial,
  save,
  onOpenTutor,
  onComplete,
  isCompleted,
  isPending,
}: Props) => {
  const [text, setText] = useState(initial ?? "");
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    if (initial && !text) setText(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const status = useAutoSaveField({
    value: { [pillId]: text } as Record<string, string>,
    initial: { [pillId]: initial ?? "" },
    save,
    field: "pbl_responses",
  });

  useEffect(() => {
    if (!isCompleted && !autoTriggered && text.trim().length >= 80) {
      setAutoTriggered(true);
      onComplete();
    }
  }, [text, isCompleted, autoTriggered, onComplete]);

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border-2 p-4 sm:p-5"
        style={{ borderColor: `${trailColor}55`, backgroundColor: `${trailColor}10` }}
      >
        <div className="flex items-start gap-2 mb-2">
          <Target
            className="h-4 w-4 mt-0.5 shrink-0"
            style={{ color: trailColor }}
            aria-hidden="true"
          />
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/65">
            problema pra resolver
          </p>
        </div>
        {bodyMd && (
          <p className="font-body text-sm sm:text-base text-perestroika-preto/85 whitespace-pre-wrap leading-relaxed">
            {bodyMd}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenTutor}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-body text-sm uppercase tracking-wide text-perestroika-bege hover:scale-[1.02] active:scale-95 transition-transform"
        style={{ backgroundColor: trailColor }}
      >
        <MessageCircle className="h-4 w-4" />
        conversar com tutor sobre isso
      </button>

      <div>
        <label
          htmlFor={`pbl-${pillId}`}
          className="block font-body text-xs uppercase tracking-wider text-perestroika-preto/60 mb-2"
        >
          sua resposta
        </label>
        <TextareaWithVoice
          id={`pbl-${pillId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="descreva sua abordagem, hipóteses, próximos passos. ou grave por voz."
          rows={6}
          className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-4 py-3 font-body text-sm sm:text-base text-perestroika-preto placeholder:text-perestroika-preto/40 focus:outline-none focus:border-perestroika-preto/60 transition-colors resize-y min-h-[140px]"
          voiceAriaLabel="gravar sua resposta por voz"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <SaveIndicator status={status} />
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-body text-[11px] tabular-nums text-perestroika-preto/50">
            {text.trim().length} caracteres
          </span>
          <button
            type="button"
            onClick={onComplete}
            disabled={isPending}
            aria-pressed={isCompleted}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors disabled:opacity-50 ${
              isCompleted
                ? "bg-perestroika-preto text-perestroika-bege"
                : "border border-perestroika-preto/30 hover:bg-perestroika-preto hover:text-perestroika-bege"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> concluída
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5" /> marcar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
