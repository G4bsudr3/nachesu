import { useEffect, useState } from "react";
import { ExternalLink, MessageCircle } from "lucide-react";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";
import { EntregaChecklist, type ChecklistItem } from "./EntregaChecklist";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";
import { PillMarkdown } from "@/components/eletiva/PillMarkdown";


type StepLink = { label: string; url: string };
type Step = { titulo: string; descricao: string; links?: StepLink[] };

type Campo = { label: string; help?: string; placeholder?: string; optional?: boolean };
type CampoEvidencia = { label: string; help?: string; optional?: boolean };

type Schema = {
  type?: "pbl_estruturado";
  contexto_md?: string;
  passos?: Step[];
  campos?: {
    pedido_a?: Campo;
    print_a?: CampoEvidencia;
    pedido_b?: Campo;
    print_b?: CampoEvidencia;
    pedido_c?: Campo;
    print_c?: CampoEvidencia;
    melhor?: { label: string; options: string[]; optional?: boolean };
    por_que?: Campo;
    aprendi?: Campo;
    veredicto?: Campo;
  };
  dica_md?: string;
  completion?: { label?: string };
};


type PblValue = {
  pedido_a?: string;
  print_a?: EvidenceValue;
  pedido_b?: string;
  print_b?: EvidenceValue;
  pedido_c?: string;
  print_c?: EvidenceValue;
  melhor?: string;
  por_que?: string;
  aprendi?: string;
  veredicto?: string;
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PblValue;
  pblMap: Record<string, PblValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
  /** abre o TutorChat com essa pílula como contexto. só existe quando há trilha. */
  onOpenTutor?: () => void;
  hasTrail?: boolean;
}

const emptyEvidence: EvidenceValue = { evidence_kind: "none" };

export function PillPBLEstruturado({
  pillId,
  title,
  schema,
  accent,
  initial,
  pblMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
  onOpenTutor,
  hasTrail,
}: Props) {
  const [value, setValue] = useState<PblValue>(initial ?? {});

  useEffect(() => {
    setValue((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...pblMap, [pillId]: value },
    initial: pblMap,
    save,
    field: "pbl_estruturado",
  });

  const c = schema.campos ?? {};
  const ctaLabel = schema.completion?.label ?? "entregar e seguir";

  const update = (patch: Partial<PblValue>) => setValue((prev) => ({ ...prev, ...patch }));

  // pra entregar: só campo obrigatório entra na régua.
  // campo com `optional: true` aparece igual, mas não trava o botão.
  const minText = (s?: string) => (s ?? "").trim().length >= 2;
  const hasEvidence = (ev?: EvidenceValue) => !!ev && ev.evidence_kind !== "none";
  const checklist: ChecklistItem[] = [];
  const addField = (id: string, f: Campo | CampoEvidencia | { label: string; optional?: boolean } | undefined, done: boolean) => {
    if (!f || f.optional) return;
    checklist.push({ id, label: f.label, done });
  };
  addField("pedido_a", c.pedido_a, minText(value.pedido_a));
  addField("print_a", c.print_a, hasEvidence(value.print_a));
  addField("pedido_b", c.pedido_b, minText(value.pedido_b));
  addField("print_b", c.print_b, hasEvidence(value.print_b));
  addField("pedido_c", c.pedido_c, minText(value.pedido_c));
  addField("print_c", c.print_c, hasEvidence(value.print_c));
  addField("melhor", c.melhor, !!value.melhor);
  addField("por_que", c.por_que, minText(value.por_que));
  addField("aprendi", c.aprendi, minText(value.aprendi));
  addField("veredicto", c.veredicto, minText(value.veredicto));


  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          {title}
        </h2>
        <SaveIndicator status={status} />
      </header>

      {schema.contexto_md && (
        <PillMarkdown accent={accent} className="text-perestroika-preto/80">{schema.contexto_md}</PillMarkdown>
      )}

      {/* passos */}
      {schema.passos && schema.passos.length > 0 && (
        <section aria-label="passo a passo" className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            passo a passo
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schema.passos.map((step, i) => (
              <li
                key={i}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 flex gap-3"
              >
                <span
                  className="font-display leading-none flex-shrink-0"
                  style={{ color: accent, fontSize: "clamp(32px, 6vw, 48px)" }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-display uppercase text-base sm:text-lg leading-tight mb-1">
                    {step.titulo}
                  </p>
                  <p className="font-body text-xs sm:text-sm text-perestroika-preto/75 leading-relaxed">
                    {step.descricao}
                  </p>
                  {step.links && step.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {step.links.map((l, j) => (
                        <a
                          key={j}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-perestroika-preto/20 px-2.5 py-1 font-body text-[11px] uppercase tracking-wider hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
                        >
                          {l.label}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* porta pro tutor: só aparece quando existe trilha pra dar contexto */}
      {hasTrail && onOpenTutor && (
        <div>
          <button
            type="button"
            onClick={onOpenTutor}
            className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto/20 px-4 py-2 font-body text-sm lowercase text-perestroika-preto/80 hover:border-perestroika-preto hover:text-perestroika-preto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            tô travado, me ajuda
          </button>
        </div>
      )}

      {/* form de entrega */}
      <section aria-label="entrega" className="space-y-5 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 sm:p-6">
        <p className="font-display uppercase text-xl sm:text-2xl leading-tight">
          sua entrega
        </p>

        {c.pedido_a && (
          <FieldText
            label={c.pedido_a.label}
            optional={c.pedido_a.optional}
            placeholder={c.pedido_a.placeholder}
            value={value.pedido_a ?? ""}
            onChange={(v) => update({ pedido_a: v })}
          />
        )}
        {c.print_a && (
          <FieldEvidence
            label={c.print_a.label}
            optional={c.print_a.optional}
            itemId={`${pillId}-print-a`}
            value={value.print_a ?? emptyEvidence}
            onChange={(ev) => update({ print_a: ev })}
            accent={accent}
          />
        )}

        {c.pedido_b && (
          <FieldText
            label={c.pedido_b.label}
            optional={c.pedido_b.optional}
            placeholder={c.pedido_b.placeholder}
            value={value.pedido_b ?? ""}
            onChange={(v) => update({ pedido_b: v })}
          />
        )}
        {c.print_b && (
          <FieldEvidence
            label={c.print_b.label}
            optional={c.print_b.optional}
            itemId={`${pillId}-print-b`}
            value={value.print_b ?? emptyEvidence}
            onChange={(ev) => update({ print_b: ev })}
            accent={accent}
          />
        )}

        {c.pedido_c && (
          <FieldText
            label={c.pedido_c.label}
            optional={c.pedido_c.optional}
            placeholder={c.pedido_c.placeholder}
            value={value.pedido_c ?? ""}
            onChange={(v) => update({ pedido_c: v })}
          />
        )}
        {c.print_c && (
          <FieldEvidence
            label={c.print_c.label}
            optional={c.print_c.optional}
            itemId={`${pillId}-print-c`}
            value={value.print_c ?? emptyEvidence}
            onChange={(ev) => update({ print_c: ev })}
            accent={accent}
          />
        )}


        {c.melhor && (
          <fieldset className="space-y-2">
            <legend className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
              {c.melhor.label}
              {c.melhor.optional && <OptionalTag />}
            </legend>
            <div className="flex flex-col gap-2">
              {c.melhor.options.map((opt) => {
                const checked = value.melhor === opt;
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 cursor-pointer transition-colors ${
                      checked
                        ? "border-perestroika-preto bg-perestroika-preto/[0.05]"
                        : "border-perestroika-preto/15 hover:border-perestroika-preto/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`melhor-${pillId}`}
                      value={opt}
                      checked={checked}
                      onChange={() => update({ melhor: opt })}
                      className="sr-only"
                    />
                    <span
                      className={`h-3 w-3 rounded-full border-2 ${
                        checked ? "border-perestroika-preto bg-perestroika-preto" : "border-perestroika-preto/40"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="font-body text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {c.por_que && (
          <FieldTextarea
            label={c.por_que.label}
            optional={c.por_que.optional}
            placeholder={c.por_que.placeholder}
            value={value.por_que ?? ""}
            onChange={(v) => update({ por_que: v })}
            rows={3}
          />
        )}
        {c.aprendi && (
          <FieldTextarea
            label={c.aprendi.label}
            optional={c.aprendi.optional}
            placeholder={c.aprendi.placeholder}
            value={value.aprendi ?? ""}
            onChange={(v) => update({ aprendi: v })}
            rows={3}
          />
        )}
        {c.veredicto && (
          <FieldTextarea
            label={c.veredicto.label}
            optional={c.veredicto.optional}
            placeholder={c.veredicto.placeholder}
            value={value.veredicto ?? ""}
            onChange={(v) => update({ veredicto: v })}
            rows={3}
          />
        )}
      </section>

      {schema.dica_md && (
        <div
          className="rounded-2xl border-2 p-4 sm:p-5"
          style={{ borderColor: accent, backgroundColor: `${accent}10` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider mb-2" style={{ color: accent }}>
            dica
          </p>
          <PillMarkdown accent={accent} className="text-sm text-perestroika-preto/85">{schema.dica_md}</PillMarkdown>
        </div>
      )}

      <EntregaChecklist
        items={checklist}
        accent={accent}
        ctaLabel={ctaLabel}
        completedLabel="exercício entregue"
        isCompleted={isCompleted}
        isCompleting={isCompleting}
        onComplete={onComplete}
      />

    </div>
  );
}

function OptionalTag() {
  return (
    <span className="ml-2 inline-block rounded-full border border-perestroika-preto/25 px-2 py-[1px] font-body text-[9px] uppercase tracking-wider text-perestroika-preto/50">
      opcional
    </span>
  );
}

function FieldText({
  label,
  placeholder,
  value,
  onChange,
  optional,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
        {label}
        {optional && <OptionalTag />}
      </label>
      <TextareaWithVoice
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
        voiceAriaLabel={`gravar ${label} por voz`}
      />
    </div>
  );
}

function FieldTextarea({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  optional,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
        {label}
        {optional && <OptionalTag />}
      </label>
      <TextareaWithVoice
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
        voiceAriaLabel={`gravar ${label} por voz`}
      />
    </div>
  );
}

function FieldEvidence({
  label,
  itemId,
  value,
  onChange,
  accent,
  optional,
}: {
  label: string;
  itemId: string;
  value: EvidenceValue;
  onChange: (v: EvidenceValue) => void;
  accent: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
        {label}
        {optional && <OptionalTag />}
      </label>
      <EvidenceUploader
        itemId={itemId}
        value={value}
        onChange={onChange}
        accent={accent}
      />
    </div>
  );
}

