import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Plus, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import type { PropostaValorValue } from "./PillPropostaValor";
import type { BMCValue } from "./PillBMCSimplificado";
import type { RegistroResultadoValue } from "./PillRegistroResultado";

type Diagnostico = {
  resultado?: "validou" | "refutou" | "";
  decisao?: "persevere" | "pivot" | "desistir" | "";
  prox_suposicao?: string;
};

export type ChangelogItem = {
  id: string;
  elemento?: string;
  antes?: string;
  depois?: string;
  dado?: string;
};

export type ChangelogV2Value = {
  diagnostico?: Diagnostico;
  mudancas?: ChangelogItem[];
  proposta_v2?: PropostaValorValue;
  bmc_v2?: Pick<BMCValue, "segmento" | "canais">;
  manter_1_coisa?: string;
  melhor_em_que?: string;
};

type Schema = {
  type?: "changelog_v2";
  proposta_source_module_id?: string;
  bmc_source_module_id?: string;
  resultado_source_module_id?: string;
  min_mudancas?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: ChangelogV2Value;
  changelogMap: Record<string, ChangelogV2Value>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

type PropostaFetch = { pillId: string | null; value: PropostaValorValue | null };
type BMCFetch = { pillId: string | null; value: Pick<BMCValue, "segmento" | "canais"> | null };
type ResultadoFetch = { value: RegistroResultadoValue | null };

function usePropostaOriginal(moduleId?: string): PropostaFetch {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["aula18-proposta-v1", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async (): Promise<PropostaFetch> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const map = ((data?.content ?? {}) as { proposta_valor_aula13?: Record<string, PropostaValorValue> })
        .proposta_valor_aula13 ?? {};
      const [pid, val] = Object.entries(map)[0] ?? [null, null];
      return { pillId: pid, value: (val as PropostaValorValue) ?? null };
    },
  });
  return q.data ?? { pillId: null, value: null };
}

function useBMCOriginal(moduleId?: string): BMCFetch {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["aula18-bmc-v1", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async (): Promise<BMCFetch> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const map = ((data?.content ?? {}) as { bmc_aula14?: Record<string, BMCValue> }).bmc_aula14 ?? {};
      const [pid, val] = Object.entries(map)[0] ?? [null, null];
      const v = (val as BMCValue | null) ?? null;
      return { pillId: pid, value: v ? { segmento: v.segmento, canais: v.canais } : null };
    },
  });
  return q.data ?? { pillId: null, value: null };
}

function useResultadoAula17(moduleId?: string): ResultadoFetch {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["aula18-resultado-v1", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async (): Promise<ResultadoFetch> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const map = ((data?.content ?? {}) as { experimento_resultado_aula17?: Record<string, RegistroResultadoValue> })
        .experimento_resultado_aula17 ?? {};
      const val = Object.values(map)[0] ?? null;
      return { value: (val as RegistroResultadoValue) ?? null };
    },
  });
  return q.data ?? { value: null };
}

function newItem(): ChangelogItem {
  return { id: crypto.randomUUID(), elemento: "", antes: "", depois: "", dado: "" };
}

const PROPOSTA_FIELDS: Array<{ key: keyof PropostaValorValue; label: string }> = [
  { key: "problema", label: "problema" },
  { key: "publico", label: "público" },
  { key: "solucao", label: "solução" },
  { key: "como_circula", label: "como circula / regenera" },
  { key: "por_que_agora", label: "por que agora" },
  { key: "frase_ancora", label: "frase-âncora" },
];

export function PillChangelogV2({
  pillId,
  schema,
  accent,
  initial,
  changelogMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const ctaLabel = schema.completion?.label ?? "entregar versão 2";
  const minMudancas = schema.min_mudancas ?? 3;

  const proposta = usePropostaOriginal(schema.proposta_source_module_id);
  const bmc = useBMCOriginal(schema.bmc_source_module_id);
  const resultado = useResultadoAula17(schema.resultado_source_module_id);

  const [value, setValue] = useState<ChangelogV2Value>(() => ({
    diagnostico: initial?.diagnostico ?? {},
    mudancas: initial?.mudancas && initial.mudancas.length > 0
      ? initial.mudancas
      : [newItem(), newItem(), newItem()],
    proposta_v2: initial?.proposta_v2,
    bmc_v2: initial?.bmc_v2,
    manter_1_coisa: initial?.manter_1_coisa ?? "",
    melhor_em_que: initial?.melhor_em_que ?? "",
  }));

  // hydrate v2 with v1 once original data loads and v2 not set yet
  useMemo(() => {
    setValue((prev) => {
      const patch: Partial<ChangelogV2Value> = {};
      if (!prev.proposta_v2 && proposta.value) patch.proposta_v2 = { ...proposta.value };
      if (!prev.bmc_v2 && bmc.value) patch.bmc_v2 = { ...bmc.value };
      return Object.keys(patch).length ? { ...prev, ...patch } : prev;
    });
  }, [proposta.value, bmc.value]);

  const status = useAutoSaveField({
    value: { ...changelogMap, [pillId]: value },
    initial: changelogMap,
    save,
    field: "changelog_aula18",
  });

  const setDiag = <K extends keyof Diagnostico>(k: K, v: Diagnostico[K]) =>
    setValue((prev) => ({ ...prev, diagnostico: { ...(prev.diagnostico ?? {}), [k]: v } }));

  const updateItem = (id: string, patch: Partial<ChangelogItem>) =>
    setValue((prev) => ({
      ...prev,
      mudancas: (prev.mudancas ?? []).map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  const removeItem = (id: string) =>
    setValue((prev) => ({ ...prev, mudancas: (prev.mudancas ?? []).filter((it) => it.id !== id) }));
  const addItem = () => setValue((prev) => ({ ...prev, mudancas: [...(prev.mudancas ?? []), newItem()] }));

  const setPropostaV2 = <K extends keyof PropostaValorValue>(k: K, v: PropostaValorValue[K]) =>
    setValue((prev) => ({ ...prev, proposta_v2: { ...(prev.proposta_v2 ?? {}), [k]: v } }));
  const setBmcV2 = (k: "segmento" | "canais", v: string) =>
    setValue((prev) => ({ ...prev, bmc_v2: { ...(prev.bmc_v2 ?? {}), [k]: v } }));

  const diag = value.diagnostico ?? {};
  const diagOk =
    !!diag.resultado &&
    (diag.resultado === "validou"
      ? (diag.prox_suposicao ?? "").trim().length >= 15
      : !!diag.decisao);

  const mudancas = value.mudancas ?? [];
  const mudancasValidas = mudancas.filter(
    (m) =>
      (m.elemento ?? "").trim().length >= 3 &&
      (m.antes ?? "").trim().length >= 3 &&
      (m.depois ?? "").trim().length >= 3 &&
      (m.dado ?? "").trim().length >= 15,
  );
  const changelogOk = mudancasValidas.length >= minMudancas;

  const manterOk = (value.manter_1_coisa ?? "").trim().length >= 20;
  const melhorOk = (value.melhor_em_que ?? "").trim().length >= 20;

  const ready = diagOk && changelogOk && manterOk && melhorOk;

  return (
    <div className="space-y-8">
      {/* PARTE 1 · DIAGNÓSTICO */}
      <section className="space-y-3">
        <SectionHeader n={1} title="DIAGNÓSTICO" hint="olhando os resultados do módulo 17, o que aconteceu?" />

        {resultado.value?.criterio_resultado && (
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
          >
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              resultado registrado no módulo 17
            </p>
            <p className="font-body text-sm text-perestroika-preto/85">
              critério · <strong>{resultado.value.criterio_resultado === "atingiu" ? "atingiu" : resultado.value.criterio_resultado === "parcial" ? "parcial" : "não atingiu"}</strong>
            </p>
          </div>
        )}

        <div className="grid gap-2">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
            o experimento validou ou refutou a suposição?
          </p>
          <div className="flex gap-2 flex-wrap">
            {(["validou", "refutou"] as const).map((r) => (
              <PillRadio
                key={r}
                label={r === "validou" ? "validou" : "refutou"}
                active={diag.resultado === r}
                onClick={() => setDiag("resultado", r)}
                accent={accent}
              />
            ))}
          </div>
        </div>

        {diag.resultado === "refutou" && (
          <div className="grid gap-2">
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
              qual a decisão?
            </p>
            <div className="flex gap-2 flex-wrap">
              <PillRadio label="pivot (mudo 1 elemento)" active={diag.decisao === "pivot"} onClick={() => setDiag("decisao", "pivot")} accent={accent} />
              <PillRadio label="desistir dessa direção" active={diag.decisao === "desistir"} onClick={() => setDiag("decisao", "desistir")} accent={accent} />
            </div>
          </div>
        )}

        {diag.resultado === "validou" && (
          <div className="grid gap-2">
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
              qual a próxima suposição pra testar?
            </p>
            <textarea
              value={diag.prox_suposicao ?? ""}
              onChange={(e) => setDiag("prox_suposicao", e.target.value)}
              placeholder="ex: se validei que 60% clicam, ainda preciso testar se pagariam. próxima suposição: disposição a pagar r$ x."
              rows={2}
              className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
            />
          </div>
        )}
      </section>

      {/* PARTE 2 · CHANGELOG */}
      <section className="space-y-3">
        <SectionHeader
          n={2}
          title="CHANGELOG DO PROJETO"
          hint={`mín ${minMudancas} mudanças. cada uma amarrada a UM dado. "achei melhor" não vale.`}
        />

        <div className="grid gap-2">
          {mudancas.map((it, i) => {
            const ok =
              (it.elemento ?? "").trim().length >= 3 &&
              (it.antes ?? "").trim().length >= 3 &&
              (it.depois ?? "").trim().length >= 3 &&
              (it.dado ?? "").trim().length >= 15;
            return (
              <article
                key={it.id}
                className="rounded-2xl border-2 p-3 space-y-2 bg-white"
                style={{ borderColor: ok ? `${accent}77` : "rgba(9,9,9,0.15)" }}
              >
                <header className="flex items-center justify-between gap-2">
                  <span className="font-display uppercase text-sm text-perestroika-preto/70">
                    mudança #{i + 1}
                  </span>
                  {mudancas.length > minMudancas && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="inline-flex items-center gap-1 text-perestroika-preto/50 hover:text-perestroika-preto text-xs"
                      aria-label="remover mudança"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </header>
                <FieldRow label="elemento que mudou" value={it.elemento ?? ""} onChange={(v) => updateItem(it.id, { elemento: v })} placeholder="ex: público-alvo" />
                <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
                  <FieldRow label="antes" value={it.antes ?? ""} onChange={(v) => updateItem(it.id, { antes: v })} placeholder="ex: todos os alunos" />
                  <FieldRow label="depois" value={it.depois ?? ""} onChange={(v) => updateItem(it.id, { depois: v })} placeholder="ex: alunos que ficam >2h na escola" />
                </div>
                <FieldRow
                  label="dado que justifica"
                  value={it.dado ?? ""}
                  onChange={(v) => updateItem(it.id, { dado: v })}
                  placeholder='ex: "4 de 5 entrevistados que ficam menos de 2h disseram não ter essa dor"'
                  textarea
                  min={15}
                />
              </article>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-perestroika-preto/25 px-4 py-2 font-body text-xs uppercase tracking-wider text-perestroika-preto/70 hover:border-perestroika-preto/50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> adicionar mudança
        </button>

        {mudancas.length > 0 && !changelogOk && (
          <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              {mudancasValidas.length}/{minMudancas} mudanças completas. cada uma precisa de elemento, antes, depois e um DADO específico (mín 15 caracteres).
            </p>
          </div>
        )}
      </section>

      {/* PARTE 3 · VERSÃO 2 */}
      <section className="space-y-3">
        <SectionHeader n={3} title="PROPOSTA DE VALOR · V2" hint="edite in-line. mostramos a v1 do lado pra você comparar." />
        {proposta.value ? (
          <div className="grid gap-2">
            {PROPOSTA_FIELDS.map(({ key, label }) => {
              const antes = proposta.value?.[key] ?? "";
              const depois = value.proposta_v2?.[key] ?? "";
              const mudou = (antes ?? "").trim() !== (depois ?? "").trim();
              return (
                <div key={key} className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-3 space-y-2">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 flex items-center justify-between">
                    <span>{label}</span>
                    {mudou && (
                      <span className="rounded-full px-2 py-0.5 text-[9px]" style={{ backgroundColor: `${accent}22`, color: accent }}>
                        MUDOU
                      </span>
                    )}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
                    <div className="rounded-xl bg-perestroika-bege p-2">
                      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/45 mb-1">v1</p>
                      <p className="font-body text-xs text-perestroika-preto/75 leading-snug whitespace-pre-wrap">
                        {antes || "—"}
                      </p>
                    </div>
                    <textarea
                      value={depois}
                      onChange={(e) => setPropostaV2(key, e.target.value)}
                      rows={3}
                      placeholder="v2 (edite aqui)"
                      className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-2 py-2 font-body text-xs text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-body text-xs text-perestroika-preto/60">
            você ainda não fechou a proposta de valor do módulo 13. volta lá se quiser puxar a v1.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader n={4} title="MODELO DE NEGÓCIO · V2" hint="segmento e canais. o resto do BMC você refina depois." />
        {bmc.value ? (
          <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
            {(["segmento", "canais"] as const).map((k) => {
              const antes = bmc.value?.[k] ?? "";
              const depois = value.bmc_v2?.[k] ?? "";
              const mudou = (antes ?? "").trim() !== (depois ?? "").trim();
              return (
                <div key={k} className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-3 space-y-2">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 flex items-center justify-between">
                    <span>{k === "segmento" ? "segmento de clientes" : "canais"}</span>
                    {mudou && (
                      <span className="rounded-full px-2 py-0.5 text-[9px]" style={{ backgroundColor: `${accent}22`, color: accent }}>
                        MUDOU
                      </span>
                    )}
                  </p>
                  <div className="rounded-xl bg-perestroika-bege p-2">
                    <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/45 mb-1">v1</p>
                    <p className="font-body text-xs text-perestroika-preto/75 leading-snug whitespace-pre-wrap">
                      {antes || "—"}
                    </p>
                  </div>
                  <textarea
                    value={depois}
                    onChange={(e) => setBmcV2(k, e.target.value)}
                    rows={3}
                    placeholder="v2"
                    className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-2 py-2 font-body text-xs text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-body text-xs text-perestroika-preto/60">
            você ainda não fechou o BMC do módulo 14. volta lá se quiser puxar a v1.
          </p>
        )}
      </section>

      {/* FECHAMENTO */}
      <section className="space-y-3">
        <SectionHeader n={5} title="FECHAMENTO HONESTO" hint="duas perguntas pra ancorar a v2." />
        <FieldRow
          label="se você tivesse que MANTER SÓ 1 coisa da proposta original, o que seria?"
          value={value.manter_1_coisa ?? ""}
          onChange={(v) => setValue((prev) => ({ ...prev, manter_1_coisa: v }))}
          placeholder="essa é a semente que sobrevive ao pivot."
          textarea
          min={20}
        />
        <FieldRow
          label="sua v2 é MELHOR que a v1 em algum aspecto mensurável? qual?"
          value={value.melhor_em_que ?? ""}
          onChange={(v) => setValue((prev) => ({ ...prev, melhor_em_que: v }))}
          placeholder='ex: "a v2 mira num público mais estreito (200 pessoas em vez de 3000), o que torna o experimento seguinte mais rápido e barato."'
          textarea
          min={20}
        />
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5 min-w-0">
              <Sparkles className="h-3 w-3 flex-shrink-0" aria-hidden />
              <span className="truncate">
                falta: {[
                  !diagOk && "diagnóstico",
                  !changelogOk && `changelog (${mudancasValidas.length}/${minMudancas})`,
                  !manterOk && "o que manter",
                  !melhorOk && "melhor em quê",
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

function PillRadio({ label, active, onClick, accent }: { label: string; active: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border-2 px-4 py-1.5 font-body text-xs uppercase tracking-wider transition-colors"
      style={{
        borderColor: active ? accent : "rgba(9,9,9,0.2)",
        backgroundColor: active ? `${accent}18` : "transparent",
        color: active ? accent : "rgba(9,9,9,0.7)",
      }}
    >
      {label}
    </button>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  min?: number;
}) {
  const len = value.trim().length;
  const ok = min ? len >= min : len > 0;
  return (
    <div className="space-y-1">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">{label}</p>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y ${ok ? "border-perestroika-preto/40" : "border-perestroika-preto/15"}`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none ${ok ? "border-perestroika-preto/40" : "border-perestroika-preto/15"}`}
        />
      )}
    </div>
  );
}
