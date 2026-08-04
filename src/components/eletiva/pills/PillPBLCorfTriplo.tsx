import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

type PromptItem = {
  id: string;
  prompt_ruim: string;
  placeholder_corf?: string;
  /** quando true, o bloco entra no "quer treinar mais" e não trava a entrega */
  optional?: boolean;
};

type Schema = {
  type?: "pbl_corf_triplo";
  contexto_md?: string;
  passos?: { titulo: string; descricao: string }[];
  prompts: PromptItem[];
  /** quando true, os prints viram evidência opcional e não travam a entrega */
  prints_opcionais?: boolean;
  treinar_mais_label?: string;
  conclusao?: { label: string; placeholder?: string };
  dica_md?: string;
  completion?: { label?: string };
};


type EntregaItem = {
  versao_corf?: string;
  print_ruim?: EvidenceValue;
  print_corf?: EvidenceValue;
  o_que_mudou?: string;
};

export type PblCorfValue = {
  itens?: Record<string, EntregaItem>;
  conclusao?: string;
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PblCorfValue;
  corfMap: Record<string, PblCorfValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const emptyEvidence: EvidenceValue = { evidence_kind: "none" };

/**
 * exercício PBL do módulo 2: aluno reescreve 3 prompts ruins em CORF,
 * sobe 2 prints por prompt e descreve o que mudou. salva em
 * `content.pbl_corf[pillId]`.
 */
export function PillPBLCorfTriplo({
  pillId,
  title,
  schema,
  accent,
  initial,
  corfMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [value, setValue] = useState<PblCorfValue>(initial ?? {});

  useEffect(() => {
    setValue((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...corfMap, [pillId]: value },
    initial: corfMap,
    save,
    field: "pbl_corf",
  });

  const updateItem = (id: string, patch: Partial<EntregaItem>) =>
    setValue((prev) => ({
      ...prev,
      itens: {
        ...(prev.itens ?? {}),
        [id]: { ...((prev.itens ?? {})[id] ?? {}), ...patch },
      },
    }));

  const minText = (s?: string) => (s ?? "").trim().length >= 2;
  const hasEv = (ev?: EvidenceValue) => !!ev && ev.evidence_kind !== "none";

  const obrigatorios = schema.prompts.filter((p) => !p.optional);
  const opcionais = schema.prompts.filter((p) => p.optional);
  const printsOpcionais = schema.prints_opcionais ?? false;

  const itemChecks = obrigatorios.flatMap((p) => {
    const it = value.itens?.[p.id] ?? {};
    const base = [minText(it.versao_corf), minText(it.o_que_mudou)];
    return printsOpcionais ? base : [...base, hasEv(it.print_ruim), hasEv(it.print_corf)];
  });
  const conclusionCheck = schema.conclusao ? [minText(value.conclusao)] : [];
  const checks = [...itemChecks, ...conclusionCheck];
  const ready = checks.every(Boolean);
  const missing = checks.filter((ok) => !ok).length;

  const ctaLabel = schema.completion?.label ?? "entregar e seguir";


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

      {/* prompts obrigatórios em destaque */}
      <section aria-label="o que você vai reescrever" className="space-y-3">
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
          {obrigatorios.length === 1
            ? "o prompt pra reescrever"
            : `os ${obrigatorios.length} prompts pra reescrever`}
        </p>
        <ol
          className={`grid grid-cols-1 gap-3 ${
            obrigatorios.length > 1 ? "sm:grid-cols-3" : ""
          }`}
        >
          {obrigatorios.map((p, i) => (
            <li
              key={p.id}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 flex flex-col gap-2"
            >
              <span
                className="font-display uppercase text-perestroika-preto/55"
                style={{ fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-body text-sm italic text-perestroika-preto/85">
                "{p.prompt_ruim}"
              </p>
            </li>
          ))}
        </ol>
      </section>


      {/* passos */}
      {schema.passos && schema.passos.length > 0 && (
        <section aria-label="passo a passo" className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            passo a passo
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {schema.passos.map((step, i) => (
              <li
                key={i}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 flex gap-3"
              >
                <span
                  className="font-display leading-none flex-shrink-0"
                  style={{ color: accent, fontSize: "clamp(28px, 5vw, 40px)" }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-display uppercase text-base leading-tight mb-1">
                    {step.titulo}
                  </p>
                  <p className="font-body text-xs sm:text-sm text-perestroika-preto/75 leading-relaxed">
                    {step.descricao}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* blocos de entrega obrigatórios */}
      <section aria-label="entrega" className="space-y-6">
        {obrigatorios.map((p, i) => renderBloco(p, i))}
      </section>

      {/* blocos opcionais, recolhidos */}
      {opcionais.length > 0 && (
        <details className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.02] p-4 sm:p-5">
          <summary className="cursor-pointer font-display uppercase text-lg sm:text-xl leading-tight list-none">
            {schema.treinar_mais_label ?? "quer treinar mais?"}
            <span className="ml-2 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/50">
              opcional, não trava a entrega
            </span>
          </summary>
          <div className="space-y-6 pt-5">
            {opcionais.map((p, i) => renderBloco(p, i, true))}
          </div>
        </details>
      )}


      {/* conclusão geral */}
      {schema.conclusao && (
        <section aria-label="conclusão geral">
          <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            {schema.conclusao.label}
          </label>
          <TextareaWithVoice
            value={value.conclusao ?? ""}
            onChange={(e) => setValue((prev) => ({ ...prev, conclusao: e.target.value }))}
            placeholder={schema.conclusao.placeholder}
            rows={4}
            className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel="gravar conclusão geral"
          />
        </section>
      )}

      {schema.dica_md && (
        <div
          className="rounded-2xl border-2 p-4 sm:p-5"
          style={{ borderColor: accent, backgroundColor: `${accent}10` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider mb-2" style={{ color: accent }}>
            dica
          </p>
          <p className="font-body text-sm text-perestroika-preto/85 whitespace-pre-wrap leading-relaxed">
            {schema.dica_md}
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {!ready && !isCompleted && (
          <p className="font-body text-xs text-perestroika-preto/55">
            falta {missing === 1 ? "1 campo" : `${missing} campos`} pra entregar.
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
              <Check className="h-4 w-4" /> exercício entregue
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
