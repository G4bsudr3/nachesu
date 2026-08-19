import { useEffect, useState } from "react";
import { CheckCircle2, Circle, PenLine } from "lucide-react";
import { SaveIndicator } from "@/components/eletiva/pills/SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "@/components/eletiva/pills/useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

interface Props {
  pillId: string;
  title: string;
  bodyMd?: string | null;
  prompt?: string | null;
  trailColor: string;
  initial: string;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isPending: boolean;
}

/**
 * pílula tipo `registro`: vira espaço de reflexão escrita.
 * autosave em deliverable.content.reflections[pillId].
 * marca a pílula como concluída automaticamente quando o aluno escreve ≥ 60 chars,
 * mas continua editável (toggle manual também funciona).
 */
export const PillReflection = ({
  pillId,
  title,
  bodyMd,
  prompt,
  trailColor,
  initial,
  save,
  onComplete,
  isCompleted,
  isPending,
}: Props) => {
  const [text, setText] = useState(initial ?? "");
  const [autoTriggered, setAutoTriggered] = useState(false);

  // hidrata quando o deliverable carrega depois
  useEffect(() => {
    if (initial && !text) setText(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const status = useAutoSaveField({
    value: { [pillId]: text } as Record<string, string>,
    initial: { [pillId]: initial ?? "" },
    save,
    field: "reflections",
  });

  // auto-conclui na primeira vez que ultrapassa 60 chars
  useEffect(() => {
    if (!isCompleted && !autoTriggered && text.trim().length >= 60) {
      setAutoTriggered(true);
      onComplete();
    }
  }, [text, isCompleted, autoTriggered, onComplete]);

  const promptText = prompt ?? bodyMd ?? "o que ficou pra você dessa pílula?";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <PenLine
          className="h-4 w-4 mt-1 shrink-0"
          style={{ color: trailColor }}
          aria-hidden="true"
        />
        <p className="font-body text-sm sm:text-base text-perestroika-preto/85 whitespace-pre-wrap leading-relaxed">
          {promptText}
        </p>
      </div>

      <TextareaWithVoice
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="escreve aqui sem filtro. ou aperta o microfone e fala."
        rows={5}
        className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-4 py-3 font-body text-sm sm:text-base text-perestroika-preto placeholder:text-perestroika-preto/60 focus:outline-none focus:border-perestroika-preto/60 transition-colors resize-y min-h-[120px]"
        aria-label="sua reflexão"
        voiceAriaLabel="gravar sua reflexão por voz"
      />

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
