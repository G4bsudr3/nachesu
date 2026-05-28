import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ArrowRight, Clock } from "lucide-react";
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
};

type Question = QuestionLong | QuestionSingle;

type Schema = {
  type?: "curated_content_with_questions";
  cards?: Card[];
  questions?: Question[];
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
      const v = answers[q.id]?.trim() ?? "";
      if (q.type === "long_text") return v.length >= (q.min_chars ?? 0);
      return v.length > 0;
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
          // single_choice
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
