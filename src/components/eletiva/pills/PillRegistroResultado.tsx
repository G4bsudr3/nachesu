import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";

type CriterioResultado = "atingiu" | "parcial" | "nao_atingiu" | "";
type Honestidade = "sim" | "nao" | "";

export type RegistroResultadoValue = {
  o_que_fez?: string;
  quantidade?: string;
  evidencias?: EvidenceValue[];
  dados_quant?: string;
  obs_surpresa?: string;
  obs_incomodou?: string;
  frase_marcou?: string;
  criterio_resultado?: CriterioResultado;
  honestidade_atalho?: Honestidade;
  honestidade_qual?: string;
};

type Schema = {
  type?: "registro_resultado";
  plano_source_module_id?: string;
  min_evidencias?: number;
  max_evidencias?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: RegistroResultadoValue;
  registroMap: Record<string, RegistroResultadoValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

function useCriterioAula16(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula17-criterio", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const c = (data?.content ?? {}) as {
        experimento_plano_aula16?: Record<string, { criterio_sucesso?: string; metodo?: string }>;
      };
      for (const v of Object.values(c.experimento_plano_aula16 ?? {})) {
        if (v?.criterio_sucesso) return { criterio: v.criterio_sucesso, metodo: v.metodo ?? "" };
      }
      return null;
    },
  });
}

const EMPTY_EV: EvidenceValue = { evidence_kind: "none" };

export function PillRegistroResultado({
  pillId,
  schema,
  accent,
  initial,
  registroMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const ctaLabel = schema.completion?.label ?? "entregar resultado";
  const minEv = schema.min_evidencias ?? 2;
  const maxEv = schema.max_evidencias ?? 4;

  const criterioQ = useCriterioAula16(schema.plano_source_module_id);

  const [value, setValue] = useState<RegistroResultadoValue>(() => ({
    o_que_fez: initial?.o_que_fez ?? "",
    quantidade: initial?.quantidade ?? "",
    evidencias:
      initial?.evidencias && initial.evidencias.length
        ? initial.evidencias
        : Array.from({ length: minEv }, () => EMPTY_EV),
    dados_quant: initial?.dados_quant ?? "",
    obs_surpresa: initial?.obs_surpresa ?? "",
    obs_incomodou: initial?.obs_incomodou ?? "",
    frase_marcou: initial?.frase_marcou ?? "",
    criterio_resultado: initial?.criterio_resultado ?? "",
    honestidade_atalho: initial?.honestidade_atalho ?? "",
    honestidade_qual: initial?.honestidade_qual ?? "",
  }));

  const status = useAutoSaveField({
    value: { ...registroMap, [pillId]: value },
    initial: registroMap,
    save,
    field: "experimento_resultado_aula17",
  });

  const setEv = (i: number, next: EvidenceValue) =>
    setValue((prev) => {
      const arr = [...(prev.evidencias ?? [])];
      arr[i] = next;
      return { ...prev, evidencias: arr };
    });

  const addEv = () =>
    setValue((prev) => {
      const arr = [...(prev.evidencias ?? [])];
      if (arr.length < maxEv) arr.push(EMPTY_EV);
      return { ...prev, evidencias: arr };
    });

  const evidenciasOk = useMemo(
    () =>
      (value.evidencias ?? []).filter(
        (e) => (e.evidence_kind === "file" && e.evidence_path) || (e.evidence_kind === "link" && e.evidence_link),
      ).length >= minEv,
    [value.evidencias, minEv],
  );

  const oQueFezOk = (value.o_que_fez ?? "").trim().length >= 40;
  const quantidadeOk = (value.quantidade ?? "").trim().length >= 1;
  const obsSurpresaOk = (value.obs_surpresa ?? "").trim().length >= 20;
  const obsIncomodouOk = (value.obs_incomodou ?? "").trim().length >= 20;
  const criterioOk = !!value.criterio_resultado;
  const honestidadeOk =
    value.honestidade_atalho === "nao" ||
    (value.honestidade_atalho === "sim" && (value.honestidade_qual ?? "").trim().length >= 15);

  const ready =
    oQueFezOk &&
    quantidadeOk &&
    evidenciasOk &&
    obsSurpresaOk &&
    obsIncomodouOk &&
    criterioOk &&
    honestidadeOk;

  return (
    <div className="space-y-6">
      {criterioQ.data && (
        <div
          className="rounded-2xl p-3 space-y-1"
          style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
        >
          <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/60">
            critério pré-definido · aula 16
          </p>
          <p className="font-body text-xs text-perestroika-preto/85">{criterioQ.data.criterio}</p>
        </div>
      )}

      <section className="space-y-2">
        <SectionHeader n={1} title="O QUE VOCÊ FEZ EXATAMENTE" hint="3-5 frases. seco. sem interpretação." />
        <TextArea
          value={value.o_que_fez ?? ""}
          onChange={(v) => setValue((p) => ({ ...p, o_que_fez: v }))}
          min={40}
          placeholder="ex: publiquei a landing page em 3 grupos de whatsapp da escola no dia 3. deixei 5 dias no ar. medi cliques pelo bit.ly."
        />
      </section>

      <section className="space-y-2">
        <SectionHeader n={2} title="QUANTAS PESSOAS / DADOS COLETADOS" hint="número absoluto." />
        <input
          value={value.quantidade ?? ""}
          onChange={(e) => setValue((p) => ({ ...p, quantidade: e.target.value }))}
          placeholder="ex: 47 pessoas viram a página, 12 clicaram."
          className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none"
        />
      </section>

      <section className="space-y-2">
        <SectionHeader
          n={3}
          title="EVIDÊNCIAS"
          hint={`obrigatório: mín ${minEv}. foto, print, áudio, ou link (drive, planilha, doc).`}
        />
        <div className="grid gap-2">
          {(value.evidencias ?? []).map((ev, i) => (
            <div key={i} className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 space-y-1.5">
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                evidência {i + 1}
              </p>
              <EvidenceUploader
                itemId={`${pillId}-ev-${i}`}
                value={ev}
                onChange={(next) => setEv(i, next)}
                accent={accent}
                compact
              />
            </div>
          ))}
          {(value.evidencias?.length ?? 0) < maxEv && (
            <button
              type="button"
              onClick={addEv}
              className="self-start inline-flex items-center gap-1 rounded-full border-2 border-perestroika-preto/20 px-3 py-1.5 font-body text-xs text-perestroika-preto/70 hover:border-perestroika-preto/50"
            >
              + evidência
            </button>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader n={4} title="DADOS QUANTITATIVOS" hint="tabela ou lista curta. opcional se o método não gera número." />
        <TextArea
          value={value.dados_quant ?? ""}
          onChange={(v) => setValue((p) => ({ ...p, dados_quant: v }))}
          min={0}
          rows={3}
          placeholder={"ex:\n- cliques totais: 12\n- inscrições: 4\n- desistiram no meio: 1"}
        />
      </section>

      <section className="space-y-3">
        <SectionHeader n={5} title="OBSERVAÇÕES QUALITATIVAS" hint="o que os números não capturam." />
        <div className="grid gap-2">
          <MicroField
            label="o que MAIS te surpreendeu"
            value={value.obs_surpresa ?? ""}
            onChange={(v) => setValue((p) => ({ ...p, obs_surpresa: v }))}
            min={20}
          />
          <MicroField
            label="o que MAIS te incomodou"
            value={value.obs_incomodou ?? ""}
            onChange={(v) => setValue((p) => ({ ...p, obs_incomodou: v }))}
            min={20}
          />
          <MicroField
            label="frase de entrevistado / usuário que mais marcou"
            value={value.frase_marcou ?? ""}
            onChange={(v) => setValue((p) => ({ ...p, frase_marcou: v }))}
            min={0}
            placeholder='ex: "ah, isso já existe, é só usar o cardápio no grupo."'
          />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader n={6} title="CRITÉRIO DE SUCESSO · FOI ATINGIDO?" hint="respeita o que você definiu na aula 16. sem 'flexibilizar'." />
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { id: "atingiu", label: "atingiu", cor: "#16a34a" },
            { id: "parcial", label: "parcial", cor: "#eab308" },
            { id: "nao_atingiu", label: "não atingiu", cor: "#fd4644" },
          ].map((opt) => {
            const active = value.criterio_resultado === (opt.id as CriterioResultado);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setValue((p) => ({ ...p, criterio_resultado: opt.id as CriterioResultado }))}
                className="rounded-2xl border-2 p-3 font-display uppercase text-lg leading-none transition-colors"
                style={{
                  borderColor: active ? opt.cor : "rgba(9,9,9,0.15)",
                  backgroundColor: active ? `${opt.cor}18` : "white",
                  color: active ? opt.cor : "rgba(9,9,9,0.7)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader
          n={7}
          title="HONESTIDADE"
          hint="tomou algum atalho ou mudou o experimento no meio? sem julgamento — mas com verdade."
        />
        <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
          {(["nao", "sim"] as Honestidade[]).map((h) => {
            const active = value.honestidade_atalho === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setValue((p) => ({ ...p, honestidade_atalho: h }))}
                className="rounded-2xl border-2 p-3 font-body text-sm uppercase tracking-wider transition-colors"
                style={{
                  borderColor: active ? accent : "rgba(9,9,9,0.15)",
                  backgroundColor: active ? `${accent}12` : "white",
                  color: active ? accent : "rgba(9,9,9,0.7)",
                }}
              >
                {h === "nao" ? "executei como planejado" : "tomei atalho / mudei algo"}
              </button>
            );
          })}
        </div>
        {value.honestidade_atalho === "sim" && (
          <TextArea
            value={value.honestidade_qual ?? ""}
            onChange={(v) => setValue((p) => ({ ...p, honestidade_qual: v }))}
            min={15}
            placeholder="o quê mudou e por quê. seja específico."
          />
        )}
      </section>

      {!evidenciasOk && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
          <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
            faltam evidências: envia pelo menos {minEv} (foto, print, áudio ou link).
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5 min-w-0">
              <Sparkles className="h-3 w-3 flex-shrink-0" aria-hidden />
              <span className="truncate">
                falta: {[
                  !oQueFezOk && "o que fez",
                  !quantidadeOk && "quantidade",
                  !evidenciasOk && `${minEv} evidências`,
                  !obsSurpresaOk && "surpresa",
                  !obsIncomodouOk && "incômodo",
                  !criterioOk && "resultado do critério",
                  !honestidadeOk && "honestidade",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-body text-sm uppercase tracking-wider transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isCompleted ? "rgba(9,9,9,0.15)" : accent,
            color: isCompleted ? "rgba(9,9,9,0.6)" : "#fff",
          }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> entregue
            </>
          ) : (
            <>
              {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <header className="flex items-start gap-3">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-perestroika-preto text-perestroika-bege font-display text-sm flex-shrink-0">
        {n}
      </span>
      <div>
        <h3 className="font-display uppercase text-xl leading-none text-perestroika-preto">{title}</h3>
        <p className="font-body text-xs text-perestroika-preto/60 mt-1">{hint}</p>
      </div>
    </header>
  );
}

function TextArea({
  value,
  onChange,
  min,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  min: number;
  placeholder?: string;
  rows?: number;
}) {
  const len = value.trim().length;
  const ok = min === 0 || len >= min;
  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y ${
          ok ? "border-perestroika-preto/40" : "border-perestroika-preto/15"
        }`}
      />
      {min > 0 && (
        <p className={`font-body text-[10px] tabular-nums text-right ${ok ? "text-perestroika-preto/50" : "text-perestroika-preto/60"}`}>
          {len}/{min}
        </p>
      )}
    </div>
  );
}

function MicroField({
  label,
  value,
  onChange,
  min,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  placeholder?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 space-y-1.5">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">{label}</p>
      <TextArea value={value} onChange={onChange} min={min} rows={2} placeholder={placeholder} />
    </div>
  );
}
