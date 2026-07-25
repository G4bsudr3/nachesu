import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ArrowRight, Clock, Check, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

type Card = {
  id: string;
  title: string;
  source?: string;
  url: string;
  duration?: string;
  language?: string;
  description?: string;
};

type QuestionLong = {
  id: string;
  type: "long_text";
  label: string;
  min_chars?: number;
};

type QuestionSingle = {
  id: string;
  type: "single_choice";
  label: string;
  options: { label: string; value: string }[];
  correct?: string[];
  feedback_correct?: string;
  feedback_wrong?: string;
};

const ICEBERG_LEVELS = [
  { id: "eventos", label: "eventos", hint: "o que se vê" },
  { id: "padroes", label: "padrões", hint: "o que se repete" },
  { id: "estruturas", label: "estruturas", hint: "regras, recursos, incentivos" },
  { id: "modelos", label: "modelos mentais", hint: "crenças que sustentam" },
] as const;

type QuestionIceberg = {
  id: string;
  type: "iceberg_four_levels";
  label: string;
  min_chars?: number;
};

type Question = QuestionLong | QuestionSingle | QuestionIceberg;

type Schema = {
  type?: "curated_content_with_questions";
  cards?: Card[];
  questions?: Question[];
  turma_stats?: {
    field_id: string;
    module_id: string;
    warn_threshold?: number; // percentual (0-100) acima do qual mostra aviso
  };
};

interface Props {
  title: string;
  bodyMd?: string | null;
  schema: Schema;
  accent: string;
  initial: Record<string, string>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

/**
 * pílula 02 — conteúdo curado.
 * 2 cards externos (vídeo + reportagem) + 3 perguntas-guia salvando em
 * deliverable.content.guided_answers via autosave debounced.
 */
export function PillConteudoCurado({
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
  const [answers, setAnswers] = useState<Record<string, string>>(initial ?? {});

  // mantém em sync se o deliverable carregar depois
  useEffect(() => {
    setAnswers((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: answers,
    initial,
    save,
    field: "guided_answers",
  });

  const ready = useMemo(() => {
    return (schema.questions ?? []).every((q) => {
      if (q.type === "long_text") {
        const v = answers[q.id]?.trim() ?? "";
        return v.length >= (q.min_chars ?? 0);
      }
      if (q.type === "single_choice") {
        return (answers[q.id]?.trim() ?? "").length > 0;
      }
      // iceberg_four_levels: os 4 sub-campos precisam do mínimo
      const min = q.min_chars ?? 0;
      return ICEBERG_LEVELS.every((lvl) => {
        const v = answers[`${q.id}::${lvl.id}`]?.trim() ?? "";
        return v.length >= min;
      });
    });
  }, [answers, schema.questions]);

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

      {/* cards externos */}
      <section aria-label="recursos curados" className="grid sm:grid-cols-2 gap-3">
        {(schema.cards ?? []).map((card) => (
          <a
            key={card.id}
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border-2 border-perestroika-preto/15 p-4 hover:border-perestroika-preto transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
              <span className="truncate">{card.source ?? "fonte externa"}</span>
              {card.duration && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" aria-hidden="true" /> {card.duration}
                </span>
              )}
            </div>
            <h3 className="font-display uppercase text-lg leading-tight mb-1.5">{card.title}</h3>
            {card.description && (
              <p className="font-body text-sm text-perestroika-preto/70 mb-2">{card.description}</p>
            )}
            <span
              className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wider"
              style={{ color: accent }}
            >
              abrir <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </span>
          </a>
        ))}
      </section>

      {/* perguntas-guia */}
      <section aria-label="perguntas-guia" className="space-y-5">
        <h3 className="font-display uppercase text-xl">perguntas-guia</h3>
        {(schema.questions ?? []).map((q, idx) => {
          const v = answers[q.id] ?? "";
          if (q.type === "long_text") {
            const min = q.min_chars ?? 0;
            const remaining = Math.max(0, min - v.trim().length);
            return (
              <div key={q.id} className="space-y-2">
                <label className="block font-body text-sm font-medium text-perestroika-preto" htmlFor={q.id}>
                  <span className="text-perestroika-preto/55 mr-1">{idx + 1}.</span>
                  {q.label}
                </label>
                <TextareaWithVoice
                  id={q.id}
                  value={v}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none transition-colors resize-y"
                  placeholder="escreve do teu jeito ou grave por voz..."
                  voiceAriaLabel="gravar resposta por voz"
                />
                <p className="font-body text-[11px] text-perestroika-preto/55">
                  {remaining > 0
                    ? `faltam ${remaining} caracteres pro mínimo de ${min}`
                    : "✓ tamanho ok"}
                </p>
              </div>
            );
          }

          if (q.type === "iceberg_four_levels") {
            const min = q.min_chars ?? 0;
            return (
              <div key={q.id} className="space-y-3">
                <label className="block font-body text-sm font-medium text-perestroika-preto">
                  <span className="text-perestroika-preto/55 mr-1">{idx + 1}.</span>
                  {q.label}
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ICEBERG_LEVELS.map((lvl, li) => {
                    const key = `${q.id}::${lvl.id}`;
                    const val = answers[key] ?? "";
                    const ok = val.trim().length >= min;
                    return (
                      <div
                        key={lvl.id}
                        className="rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="font-display leading-none tabular-nums"
                            style={{ color: accent, fontSize: "clamp(18px, 2.4vw, 22px)" }}
                            aria-hidden
                          >
                            {String(li + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="font-body text-sm font-medium leading-none">{lvl.label}</p>
                            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                              {lvl.hint}
                            </p>
                          </div>
                          {ok && <Check className="h-3.5 w-3.5 ml-auto" style={{ color: "#3a8a5f" }} aria-hidden />}
                        </div>
                        <textarea
                          value={val}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-2.5 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
                          placeholder={`1 frase sobre ${lvl.label} do seu problema`}
                          aria-label={lvl.label}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // single_choice
          const chosen = v;
          const isCorrect = (q.correct ?? []).includes(chosen);
          const showFeedback = chosen.length > 0 && (q.correct?.length ?? 0) > 0;
          return (
            <fieldset key={q.id} className="space-y-2">
              <legend className="font-body text-sm font-medium text-perestroika-preto mb-1">
                <span className="text-perestroika-preto/55 mr-1">{idx + 1}.</span>
                {q.label}
              </legend>
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const checked = v === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                        checked
                          ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                          : "border-perestroika-preto/15 hover:border-perestroika-preto/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.value}
                        checked={checked}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                        className="sr-only"
                      />
                      <span
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                          checked ? "border-perestroika-bege bg-perestroika-bege" : "border-perestroika-preto/40"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-body text-sm leading-snug">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
              {showFeedback && (
                <div
                  role="status"
                  className="mt-2 rounded-xl border-2 p-3 font-body text-sm flex items-start gap-2 text-perestroika-preto"
                  style={
                    isCorrect
                      ? { borderColor: "#75BF9C", backgroundColor: "#75BF9C1A" }
                      : { borderColor: "#fd4644", backgroundColor: "#fd46440D" }
                  }
                >
                  {isCorrect ? (
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#3a8a5f" }} aria-hidden />
                  ) : (
                    <X className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#fd4644" }} aria-hidden />
                  )}
                  <span className="whitespace-pre-wrap">
                    {isCorrect ? q.feedback_correct : q.feedback_wrong}
                  </span>
                </div>
              )}
            </fieldset>
          );
        })}
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55">
          {ready ? "pode seguir." : "responde as 3 perguntas pra liberar o próximo passo."}
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
          {isCompleted ? "passo concluído" : "seguir pro radar"}
          {!isCompleted && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
