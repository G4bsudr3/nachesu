import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

type Schema = {
  type?: "checklist_pacto";
  contexto_md?: string;
  commitments?: string[];
  outros?: { label: string; placeholder?: string };
  reflexao?: { label: string; placeholder?: string };
  completion?: { label?: string };
};

type ChecklistValue = {
  checked?: number[];
  outros?: string;
  reflexao?: string;
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: ChecklistValue;
  checklistMap: Record<string, ChecklistValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

export function PillChecklistPacto({
  pillId,
  title,
  schema,
  accent,
  initial,
  checklistMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [value, setValue] = useState<ChecklistValue>(initial ?? { checked: [] });

  useEffect(() => {
    setValue((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...checklistMap, [pillId]: value },
    initial: checklistMap,
    save,
    field: "checklist",
  });

  const commitments = schema.commitments ?? [];
  const checked = new Set(value.checked ?? []);
  const ctaLabel = schema.completion?.label ?? "concluir";
  const requiresReflection = !!schema.reflexao?.label;
  const checklist: ChecklistItem[] = [];
  if (commitments.length > 0) {
    checklist.push({
      id: "compromissos",
      label: "marcar pelo menos 1 compromisso",
      done: checked.size >= 1,
    });
  }
  if (requiresReflection) {
    checklist.push({
      id: "reflexao",
      label: schema.reflexao?.label ?? "reflexão",
      done: (value.reflexao ?? "").trim().length >= 2,
    });
  }


  const toggle = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setValue((prev) => ({ ...prev, checked: Array.from(next).sort((a, b) => a - b) }));
  };

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          {title}
        </h2>
        <SaveIndicator status={status} />
      </header>

      {schema.contexto_md && (
        <p className="font-body text-sm sm:text-base text-perestroika-preto/80 whitespace-pre-wrap leading-relaxed">
          {schema.contexto_md}
        </p>
      )}

      <ul className="space-y-2">
        {commitments.map((text, i) => {
          const isChecked = checked.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={isChecked}
                className={`w-full flex items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                  isChecked
                    ? "bg-perestroika-preto/[0.04]"
                    : "border-perestroika-preto/15 bg-perestroika-bege hover:border-perestroika-preto/40"
                }`}
                style={isChecked ? { borderColor: accent } : undefined}
              >
                <span
                  className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isChecked ? "" : "border-perestroika-preto/40"
                  }`}
                  style={
                    isChecked
                      ? { backgroundColor: accent, borderColor: accent }
                      : undefined
                  }
                  aria-hidden="true"
                >
                  {isChecked && <Check className="h-3.5 w-3.5 text-perestroika-bege" strokeWidth={3} />}
                </span>
                <span className="font-body text-sm sm:text-base text-perestroika-preto/90 leading-relaxed">
                  {text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {schema.outros && (
        <div>
          <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            {schema.outros.label}
          </label>
          <TextareaWithVoice
            value={value.outros ?? ""}
            onChange={(e) => setValue((prev) => ({ ...prev, outros: e.target.value }))}
            placeholder={schema.outros.placeholder}
            rows={2}
            className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel="gravar outro compromisso por voz"
          />
        </div>
      )}

      {schema.reflexao && (
        <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 sm:p-6">
          <label className="block font-body text-sm text-perestroika-preto/85 mb-2 whitespace-pre-wrap">
            {schema.reflexao.label}
          </label>
          <TextareaWithVoice
            value={value.reflexao ?? ""}
            onChange={(e) => setValue((prev) => ({ ...prev, reflexao: e.target.value }))}
            placeholder={schema.reflexao.placeholder}
            rows={5}
            className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel="gravar reflexão por voz"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55">
          {checked.size}/{commitments.length} compromissos marcados
        </p>
        <button
          type="button"
          onClick={onComplete}
          disabled={!ready || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !ready || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!ready || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" /> módulo concluído
            </>
          ) : (
            ctaLabel
          )}
        </button>
      </div>
    </div>
  );
}
