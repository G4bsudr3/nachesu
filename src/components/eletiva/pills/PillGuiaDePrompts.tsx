import { useEffect, useState } from "react";
import { ArrowRight, Check, BookmarkCheck } from "lucide-react";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

type Template = {
  id: string;
  titulo: string;
  subtitulo?: string;
  template: string;
};

type Schema = {
  type?: "guia_de_prompts";
  contexto_md?: string;
  templates: Template[];
  prints?: {
    primeiro?: { label: string; por_que_label?: string; optional?: boolean };
    segundo?: { label: string; por_que_label?: string; optional?: boolean };
  };
  reflexao?: {
    prompt?: string;
    placeholder?: string;
  };
  completion?: { label?: string };
};

export type GuiaPromptsValue = {
  modelos?: Record<string, string>;
  print_1?: EvidenceValue;
  por_que_1?: string;
  print_2?: EvidenceValue;
  por_que_2?: string;
  reflexao?: string;
};

interface Props {
  pillId: string;
  schema: Schema;
  title: string;
  accent: string;
  initial: GuiaPromptsValue;
  guiaMap: Record<string, GuiaPromptsValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const emptyEvidence: EvidenceValue = { evidence_kind: "none" };

/**
 * registro do módulo 2: guia pessoal de prompts.
 * aluno edita 3 templates (estudo / redação / resumo), sobe 2 prints das
 * melhores respostas e escreve reflexão final. salva em
 * `content.guia_prompts[pillId]`.
 */
export function PillGuiaDePrompts({
  pillId,
  schema,
  title,
  accent,
  initial,
  guiaMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [value, setValue] = useState<GuiaPromptsValue>(() => {
    // hidrata templates não preenchidos com o texto base
    const baseModelos: Record<string, string> = {};
    schema.templates.forEach((t) => {
      baseModelos[t.id] = initial?.modelos?.[t.id] ?? t.template;
    });
    return {
      ...initial,
      modelos: baseModelos,
    };
  });

  useEffect(() => {
    setValue((prev) => {
      const baseModelos = { ...(prev.modelos ?? {}) };
      schema.templates.forEach((t) => {
        if (!baseModelos[t.id]) baseModelos[t.id] = t.template;
      });
      return { ...initial, ...prev, modelos: baseModelos };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...guiaMap, [pillId]: value },
    initial: guiaMap,
    save,
    field: "guia_prompts",
  });

  const updateModelo = (id: string, text: string) =>
    setValue((prev) => ({ ...prev, modelos: { ...(prev.modelos ?? {}), [id]: text } }));

  const minText = (s?: string) => (s ?? "").trim().length >= 2;
  const hasEv = (ev?: EvidenceValue) => !!ev && ev.evidence_kind !== "none";

  const checklist: ChecklistItem[] = [];
  // cada template precisa ter sido editado (≥ 20 chars, ou ≠ do base)
  schema.templates.forEach((t, i) => {
    const curr = value.modelos?.[t.id] ?? "";
    checklist.push({
      id: `tpl-${t.id}`,
      label: `modelo ${String(i + 1).padStart(2, "0")}: ${t.titulo ?? "personalizar template"}`,
      done: curr.trim().length >= 20 && curr.trim() !== t.template.trim(),
    });
  });
  if (schema.prints?.primeiro && !schema.prints.primeiro.optional) {
    checklist.push({ id: "print_1", label: schema.prints.primeiro.label ?? "primeiro print", done: hasEv(value.print_1) });
    if (schema.prints.primeiro.por_que_label)
      checklist.push({ id: "por_que_1", label: schema.prints.primeiro.por_que_label, done: minText(value.por_que_1) });
  }
  if (schema.prints?.segundo && !schema.prints.segundo.optional) {
    checklist.push({ id: "print_2", label: schema.prints.segundo.label ?? "segundo print", done: hasEv(value.print_2) });
    if (schema.prints.segundo.por_que_label)
      checklist.push({ id: "por_que_2", label: schema.prints.segundo.por_que_label, done: minText(value.por_que_2) });
  }
  if (schema.reflexao?.prompt)
    checklist.push({ id: "reflexao", label: "reflexão final", done: minText(value.reflexao) });


  const ctaLabel = schema.completion?.label ?? "concluir módulo";

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">{title}</h2>
        <SaveIndicator status={status} />
      </header>

      {schema.contexto_md && (
        <p className="font-body text-sm sm:text-base text-perestroika-preto/80 whitespace-pre-wrap leading-relaxed">
          {schema.contexto_md}
        </p>
      )}

      {/* 3 templates editáveis */}
      <section aria-label="seus 3 modelos personalizados" className="space-y-5">
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
          seus 3 modelos personalizados
        </p>
        {schema.templates.map((t, i) => (
          <div
            key={t.id}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 sm:p-6 space-y-3"
          >
            <header className="flex items-baseline gap-3">
              <span
                className="font-display leading-none"
                style={{ color: accent, fontSize: "clamp(28px, 5vw, 40px)" }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-display uppercase text-xl sm:text-2xl leading-tight">
                  {t.titulo}
                </p>
                {t.subtitulo && (
                  <p className="font-body text-xs sm:text-sm text-perestroika-preto/65 mt-0.5">
                    {t.subtitulo}
                  </p>
                )}
              </div>
            </header>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
              edite os trechos entre [colchetes] pra deixar seu
            </p>
            <textarea
              value={value.modelos?.[t.id] ?? ""}
              onChange={(e) => updateModelo(t.id, e.target.value)}
              rows={Math.max(8, (value.modelos?.[t.id] ?? "").split("\n").length + 1)}
              className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.03] px-3 py-2 font-mono text-xs sm:text-sm leading-relaxed focus:border-perestroika-preto focus:outline-none resize-y"
              aria-label={`modelo ${t.titulo}`}
              spellCheck={false}
            />
            <p className="font-body text-[11px] text-perestroika-preto/55 inline-flex items-center gap-1">
              <BookmarkCheck className="h-3 w-3" aria-hidden /> salva automático no seu guia
            </p>
          </div>
        ))}
      </section>

      {/* prints das melhores respostas */}
      {(schema.prints?.primeiro || schema.prints?.segundo) && (
        <section aria-label="prints das melhores respostas" className="space-y-5">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            prints (opcional): mostra o que você gerou
          </p>
          {schema.prints?.primeiro && (
            <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 space-y-3">
              <p className="font-display uppercase text-lg">{schema.prints.primeiro.label}</p>
              <EvidenceUploader
                itemId={`${pillId}-print-1`}
                value={value.print_1 ?? emptyEvidence}
                onChange={(ev) => setValue((prev) => ({ ...prev, print_1: ev }))}
                accent={accent}
              />
              {schema.prints.primeiro.por_que_label && (
                <div>
                  <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                    {schema.prints.primeiro.por_que_label}
                  </label>
                  <TextareaWithVoice
                    value={value.por_que_1 ?? ""}
                    onChange={(e) => setValue((prev) => ({ ...prev, por_que_1: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
                    voiceAriaLabel="por que essa foi a melhor"
                  />
                </div>
              )}
            </div>
          )}
          {schema.prints?.segundo && (
            <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 space-y-3">
              <p className="font-display uppercase text-lg">{schema.prints.segundo.label}</p>
              <EvidenceUploader
                itemId={`${pillId}-print-2`}
                value={value.print_2 ?? emptyEvidence}
                onChange={(ev) => setValue((prev) => ({ ...prev, print_2: ev }))}
                accent={accent}
              />
              {schema.prints.segundo.por_que_label && (
                <div>
                  <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                    {schema.prints.segundo.por_que_label}
                  </label>
                  <TextareaWithVoice
                    value={value.por_que_2 ?? ""}
                    onChange={(e) => setValue((prev) => ({ ...prev, por_que_2: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
                    voiceAriaLabel="por que essa foi a segunda melhor"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* reflexão final */}
      {schema.reflexao?.prompt && (
        <section aria-label="reflexão final" className="space-y-2">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            reflexão final
          </p>
          <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5">
            <p className="font-body text-sm sm:text-base text-perestroika-preto/85 mb-3 whitespace-pre-wrap">
              {schema.reflexao.prompt}
            </p>
            <TextareaWithVoice
              value={value.reflexao ?? ""}
              onChange={(e) => setValue((prev) => ({ ...prev, reflexao: e.target.value }))}
              placeholder={schema.reflexao.placeholder}
              rows={5}
              className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
              voiceAriaLabel="gravar reflexão final"
            />
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {!ready && !isCompleted && (
          <p className="font-body text-xs text-perestroika-preto/55">
            falta {missing === 1 ? "1 campo" : `${missing} campos`} pra concluir.
          </p>
        )}
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
