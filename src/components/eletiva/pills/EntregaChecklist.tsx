import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, Circle } from "lucide-react";

export type ChecklistItem = { id: string; label: string; done: boolean };

interface Props {
  items: ChecklistItem[];
  accent: string;
  ctaLabel: string;
  completedLabel: string;
  isCompleted: boolean;
  isCompleting?: boolean;
  onComplete: () => void;
  /** texto do topo da lista. default: "checklist da entrega" */
  heading?: string;
}

/**
 * barra de entrega compartilhada dos exercícios.
 * mostra checklist nomeado do que já está feito e do que falta,
 * e ao tentar entregar incompleto dá mensagem clara em vez de botão morto.
 */
export function EntregaChecklist({
  items,
  accent,
  ctaLabel,
  completedLabel,
  isCompleted,
  isCompleting,
  onComplete,
  heading = "checklist da entrega",
}: Props) {
  const [attempted, setAttempted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const pending = items.filter((i) => !i.done);
  const done = items.length - pending.length;
  const ready = pending.length === 0;

  useEffect(() => {
    if (ready) setAttempted(false);
  }, [ready]);

  const handleClick = () => {
    if (isCompleted || isCompleting) return;
    if (!ready) {
      setAttempted(true);
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    onComplete();
  };

  return (
    <div className="space-y-3 pt-2">
      {!isCompleted && items.length > 0 && (
        <div
          ref={listRef}
          className={`rounded-2xl border-2 p-4 sm:p-5 transition-colors ${
            attempted && !ready
              ? "border-perestroika-vermelho bg-perestroika-vermelho/[0.06]"
              : "border-perestroika-preto/15 bg-perestroika-bege"
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
              {heading}
            </p>
            <span className="font-body text-[11px] tabular-nums text-perestroika-preto/55">
              {done}/{items.length} prontos
            </span>
          </div>

          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                {item.done ? (
                  <Check className="h-4 w-4 mt-[2px] shrink-0" style={{ color: accent }} aria-hidden="true" />
                ) : (
                  <Circle
                    className={`h-4 w-4 mt-[2px] shrink-0 ${
                      attempted ? "text-perestroika-vermelho" : "text-perestroika-preto/35"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`font-body text-sm leading-snug ${
                    item.done
                      ? "text-perestroika-preto/45 line-through"
                      : attempted
                        ? "text-perestroika-preto"
                        : "text-perestroika-preto/80"
                  }`}
                >
                  {item.label}
                  <span className="sr-only">{item.done ? " (preenchido)" : " (falta preencher)"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <p
          role="status"
          aria-live="polite"
          className={`font-body text-xs mr-auto ${
            attempted && !ready ? "text-perestroika-vermelho" : "text-perestroika-preto/55"
          }`}
        >
          {isCompleted
            ? ""
            : attempted && !ready
              ? pending.length === 1
                ? `ainda falta preencher: ${pending[0].label}.`
                : `ainda faltam ${pending.length} itens: ${pending.map((p) => p.label).join(", ")}.`
              : ready
                ? "tudo pronto pra entregar."
                : pending.length === 1
                  ? "falta 1 item pra entregar."
                  : `faltam ${pending.length} itens pra entregar.`}
        </p>

        {attempted && !ready && (
          <AlertCircle className="h-4 w-4 text-perestroika-vermelho" aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={handleClick}
          aria-disabled={!ready || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !ready || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!ready || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" /> {completedLabel}
            </>
          ) : (
            <>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
