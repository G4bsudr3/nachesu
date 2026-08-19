import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";
import {
  normOptions,
  correctValues,
  wrongFeedback,
  minChars,
  optionRowClass,
  type RawOption,
} from "./choiceSchema";

type SingleQ = {
  id: string;
  type: "single_choice";
  label: string;
  options: RawOption[];
  correct?: string[];
  feedback_correct?: string;
  feedback_wrong?: string;
  feedback_incorrect?: string;
};

type MultiQ = {
  id: string;
  type: "multi_choice";
  label: string;
  options: RawOption[];
  correct?: string[];
  feedback_correct?: string;
  feedback_wrong?: string;
  feedback_incorrect?: string;
};

type LongQ = {
  id: string;
  type: "long_text";
  label: string;
  min_chars?: number;
  min_length?: number;
  no_feedback?: boolean;
  saved_for?: string;
};

type Question = SingleQ | MultiQ | LongQ;


type Schema = {
  type?: "quiz";
  questions?: Question[];
};

type Answer = string | string[];
type Answers = Record<string, Answer>;

interface Props {
  title: string;
  bodyMd?: string | null;
  schema: Schema;
  accent: string;
  initial: Answers;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v) => b.includes(v));

/**
 * pílula 04 — checagem rápida (quiz).
 * cada pergunta dá feedback inline (verde/vermelho) com texto exato do briefing
 * após "verificar". long_text com no_feedback é só registro (não trava).
 */
export function PillQuiz({
  title,
  bodyMd,
  schema,
  accent,
  initial,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAnswers((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: answers,
    initial,
    save,
    field: "quiz_answers",
  });

  const ready = useMemo(() => {
    return (schema.questions ?? []).every((q) => {
      const a = answers[q.id];
      if (q.type === "long_text") {
        const v = (typeof a === "string" ? a : "").trim();
        return v.length >= minChars(q);
      }
      // single/multi: tem que estar verificada
      if (!checked[q.id]) return false;
      if (q.type === "single_choice") return typeof a === "string" && a.length > 0;
      return Array.isArray(a) && a.length > 0;
    });
  }, [answers, checked, schema.questions]);

  const renderFeedback = (q: SingleQ | MultiQ) => {
    if (!checked[q.id]) return null;
    const a = answers[q.id];
    const corrects = correctValues(q);
    let isRight = false;
    if (q.type === "single_choice") {
      isRight = typeof a === "string" && corrects.includes(a);
    } else {
      isRight = Array.isArray(a) && sameSet(a, corrects);
    }
    const text = isRight ? q.feedback_correct : wrongFeedback(q);

    return (
      <div
        className="mt-2 rounded-xl border-2 p-3 font-body text-sm flex items-start gap-2 text-perestroika-preto"
        style={
          isRight
            ? { borderColor: "#75BF9C", backgroundColor: "#75BF9C1A" }
            : { borderColor: "#fd4644", backgroundColor: "#fd46440D" }
        }
        role="status"
      >
        {isRight ? (
          <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#3a8a5f" }} />
        ) : (
          <X className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#fd4644" }} />
        )}
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">{title}</h2>
          {bodyMd && (
            <p className="font-body text-perestroika-preto/75 whitespace-pre-wrap text-sm sm:text-base">
              {bodyMd}
            </p>
          )}
        </div>
        <SaveIndicator status={status} />
      </header>

      <ol className="space-y-6">
        {(schema.questions ?? []).map((q, idx) => {
          if (q.type === "long_text") {
            const v = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
            const min = q.min_chars ?? 0;
            const remaining = Math.max(0, min - v.trim().length);
            return (
              <li key={q.id} className="space-y-2">
                <label className="block font-body text-sm font-medium text-perestroika-preto" htmlFor={q.id}>
                  <span className="text-perestroika-preto/55 mr-1">{idx + 1}.</span>
                  {q.label}
                </label>
                <TextareaWithVoice
                  id={q.id}
                  value={v}
                  rows={3}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
                  voiceAriaLabel="gravar resposta por voz"
                />
                <p className="font-body text-[11px] text-perestroika-preto/55">
                  {q.no_feedback && "sem certo ou errado — registro pra retomar depois. "}
                  {remaining > 0 ? `faltam ${remaining} caracteres pro mínimo de ${min}` : "✓ tamanho ok"}
                </p>
              </li>
            );
          }

          if (q.type === "single_choice") {
            const v = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
            return (
              <li key={q.id}>
                <fieldset className="space-y-2">
                  <legend className="font-body text-sm font-medium text-perestroika-preto mb-1">
                    <span className="text-perestroika-preto/55 mr-1">{idx + 1}.</span>
                    {q.label}
                  </legend>
                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const sel = v === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                            sel
                              ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                              : "border-perestroika-preto/15 hover:border-perestroika-preto/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt.value}
                            checked={sel}
                            disabled={checked[q.id]}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                            className="sr-only"
                          />
                          <span
                            className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                              sel ? "border-perestroika-bege bg-perestroika-bege" : "border-perestroika-preto/40"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="font-body text-sm leading-snug">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {!checked[q.id] && v && (
                    <button
                      type="button"
                      onClick={() => setChecked((prev) => ({ ...prev, [q.id]: true }))}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto px-4 py-1.5 font-body text-xs uppercase tracking-wider hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
                    >
                      verificar
                    </button>
                  )}
                  {renderFeedback(q)}
                </fieldset>
              </li>
            );
          }

          // multi_choice
          const arr = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
          return (
            <li key={q.id}>
              <fieldset className="space-y-2">
                <legend className="font-body text-sm font-medium text-perestroika-preto mb-1">
                  <span className="text-perestroika-preto/55 mr-1">{idx + 1}.</span>
                  {q.label}
                </legend>
                <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1.5">
                  marque todas que se aplicam
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt) => {
                    const sel = arr.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                          sel
                            ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                            : "border-perestroika-preto/15 hover:border-perestroika-preto/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          disabled={checked[q.id]}
                          onChange={() =>
                            setAnswers((prev) => {
                              const cur = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
                              const next = cur.includes(opt.value)
                                ? cur.filter((x) => x !== opt.value)
                                : [...cur, opt.value];
                              return { ...prev, [q.id]: next };
                            })
                          }
                          className="sr-only"
                        />
                        <span
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border-2 ${
                            sel ? "border-perestroika-bege bg-perestroika-bege" : "border-perestroika-preto/40"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="font-body text-sm leading-snug">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                {!checked[q.id] && arr.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setChecked((prev) => ({ ...prev, [q.id]: true }))}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto px-4 py-1.5 font-body text-xs uppercase tracking-wider hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
                  >
                    verificar
                  </button>
                )}
                {renderFeedback(q)}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55">
          {ready ? "fechou a checagem." : "verifica as respostas pra fechar a aula."}
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
          {isCompleted ? "checagem enviada" : "fechar checagem"}
          {!isCompleted && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
