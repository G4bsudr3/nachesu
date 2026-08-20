import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { EvidenceUploader, type EvidenceKind } from "./EvidenceUploader";

type FluxoOpt = { label: string; value: string };

export type RadarItem = {
  id: string;
  what: string;
  where: string;
  fluxo: string;
  evidence_kind: EvidenceKind;
  evidence_link?: string;
  evidence_path?: string; // storage path no bucket radar-evidences
  evidence_name?: string; // filename original pra UI
};

type Schema = {
  type?: "radar_form";
  fluxos?: FluxoOpt[];
  fields?: { id: string; label: string; placeholder?: string; max_chars?: number; required?: boolean; type?: string }[];
  min_items?: number;
  max_items?: number;
  min_distinct_flows?: number;
  require_evidence_per_item?: boolean;
  max_file_mb?: number;
  anti_obvious_message?: string;
};

interface Props {
  title: string;
  bodyMd?: string | null;
  schema: Schema;
  accent: string;
  initial: RadarItem[];
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const newItem = (): RadarItem => ({
  id: crypto.randomUUID(),
  what: "",
  where: "",
  fluxo: "",
  evidence_kind: "none",
});

/**
 * pílula 03 — radar de campo. coração do PBL.
 * tabela editável mobile-first com upload (storage bucket radar-evidences) ou link.
 * valida ≥ min_items, ≥ min_distinct_flows fluxos diferentes, evidência em todos.
 */
export function PillRadar({
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
  const [items, setItems] = useState<RadarItem[]>(() =>
    initial && initial.length > 0 ? initial : [newItem()],
  );

  // hidrata uma vez quando initial chega depois
  useEffect(() => {
    if (initial && initial.length > 0 && items.length === 1 && !items[0].what && !items[0].where) {
      setItems(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.length]);

  const status = useAutoSaveField({
    value: items,
    initial,
    save,
    field: "items",
  });

  const minItems = schema.min_items ?? 5;
  const maxItems = schema.max_items ?? 10;
  const minFlows = schema.min_distinct_flows ?? 2;
  const requireEvidence = schema.require_evidence_per_item ?? true;
  const maxMb = schema.max_file_mb ?? 10;

  const validation = useMemo(() => {
    const filled = items.filter((it) => it.what.trim() && it.where.trim() && it.fluxo);
    const distinctFlows = new Set(filled.map((it) => it.fluxo)).size;
    const allHaveEvidence =
      !requireEvidence ||
      filled.every((it) => it.evidence_kind !== "none" && (it.evidence_link || it.evidence_path));
    const errors: string[] = [];
    if (filled.length < minItems) errors.push(`tu listou ${filled.length} de ${minItems} itens.`);
    if (distinctFlows < minFlows && schema.anti_obvious_message)
      errors.push(schema.anti_obvious_message);
    if (!allHaveEvidence) errors.push("falta evidência em algum item (foto, link ou áudio).");
    return { filled, distinctFlows, ok: errors.length === 0, errors };
  }, [items, minItems, minFlows, requireEvidence, schema.anti_obvious_message]);

  const updateItem = (id: string, patch: Partial<RadarItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));

  const addItem = () => {
    if (items.length >= maxItems) {
      toast.info(`máximo ${maxItems} itens.`);
      return;
    }
    setItems((prev) => [...prev, newItem()]);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">{title}</h2>
          {bodyMd && (
            <p className="font-body text-perestroika-preto/75 whitespace-pre-wrap text-sm sm:text-base">
              {bodyMd}
            </p>
          )}
        </div>
        <SaveIndicator status={status} />
      </header>

      {/* contador no topo */}
      <div
        className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-2xl border-2 p-4"
        style={{ borderColor: accent, backgroundColor: `${accent}10` }}
      >
        <p className="font-body text-sm text-perestroika-preto">
          <span className="font-display text-xl mr-1.5" style={{ color: accent }}>
            {validation.filled.length}
          </span>
          de {minItems} itens · {validation.distinctFlows} fluxo{validation.distinctFlows === 1 ? "" : "s"} distinto
          {validation.distinctFlows === 1 ? "" : "s"}
        </p>
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 leading-snug">
          mín {minFlows} fluxos diferentes · evidência em todos
        </p>
      </div>

      {/* lista de itens */}
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li
            key={item.id}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                item {String(idx + 1).padStart(2, "0")}
              </p>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                className="text-perestroika-preto/55 hover:text-perestroika-preto disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`remover item ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                  o que vi <span className="text-[#fd4644]">*</span>
                </label>
                <input
                  type="text"
                  value={item.what}
                  maxLength={200}
                  onChange={(e) => updateItem(item.id, { what: e.target.value })}
                  placeholder="ex: bebedouro do 2º andar com vazamento constante"
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                  onde <span className="text-[#fd4644]">*</span>
                </label>
                <input
                  type="text"
                  value={item.where}
                  maxLength={100}
                  onChange={(e) => updateItem(item.id, { where: e.target.value })}
                  placeholder="ex: escola, andar 2"
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                fluxo <span className="text-[#fd4644]">*</span>
              </label>
              <select
                value={item.fluxo}
                onChange={(e) => updateItem(item.id, { fluxo: e.target.value })}
                className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
              >
                <option value="">selecione...</option>
                {(schema.fluxos ?? []).map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1.5">
                evidência <span className="text-[#fd4644]">*</span>
              </label>
              <EvidenceUploader
                itemId={item.id}
                value={{
                  evidence_kind: item.evidence_kind,
                  evidence_link: item.evidence_link,
                  evidence_path: item.evidence_path,
                  evidence_name: item.evidence_name,
                }}
                onChange={(next) => updateItem(item.id, next)}
                accent={accent}
                maxMb={maxMb}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addItem}
        className="w-full rounded-2xl border-2 border-dashed border-perestroika-preto/15 py-3 font-body text-sm uppercase tracking-wider text-perestroika-preto/70 hover:border-perestroika-preto hover:text-perestroika-preto transition-colors inline-flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> adicionar item
      </button>

      {/* validação */}
      {!validation.ok && (
        <div
          className="rounded-2xl border-2 p-4"
          style={{ borderColor: "#fd4644", backgroundColor: "#fd46440D" }}
        >
          <p
            className="font-body text-sm font-medium inline-flex items-center gap-2 mb-2"
            style={{ color: "#fd4644" }}
          >
            <AlertTriangle className="h-4 w-4" /> falta pouco pro radar fechar
          </p>
          <ul className="font-body text-sm text-perestroika-preto/80 space-y-1 list-disc pl-5">
            {validation.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={!validation.ok || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !validation.ok || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!validation.ok || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? "radar enviado" : "fechar radar"}
          {!isCompleted && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
