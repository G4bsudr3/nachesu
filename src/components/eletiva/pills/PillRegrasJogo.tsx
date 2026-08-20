import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

export type RegrasJogoValue = {
  principio1?: string;
  justificativa1?: string;
  exemplo1?: string;
  principio2?: string;
  justificativa2?: string;
  exemplo2?: string;
  rs_taticos?: string[];
  como_ajudam?: string;
};

type PrincipioOpt = { value: string; label: string; short?: string };
type ROpt = { value: string; label: string; hint?: string };

type Schema = {
  type?: "regras_jogo";
  briefing_source_module_id?: string;
  matriz_source_module_id?: string;
  principios_options?: PrincipioOpt[];
  rs_options?: ROpt[];
  min_chars_justificativa?: number;
  min_chars_exemplo?: number;
  min_chars_como_ajudam?: number;
  completion?: { label?: string };
};

const DEFAULT_PRINCIPIOS: PrincipioOpt[] = [
  { value: "eliminar", label: "eliminar desperdício e poluição desde o design", short: "eliminar" },
  { value: "circular", label: "circular produtos e materiais no valor mais alto", short: "circular" },
  { value: "regenerar", label: "regenerar a natureza", short: "regenerar" },
];

const DEFAULT_RS: ROpt[] = [
  { value: "recusar", label: "recusar", hint: "não usar, projetar sem o problema" },
  { value: "reduzir", label: "reduzir", hint: "usar menos" },
  { value: "reusar", label: "reusar", hint: "mesma função, nova vida" },
  { value: "reparar", label: "reparar", hint: "estender vida" },
  { value: "recuperar", label: "recuperar", hint: "recondicionar, remanufaturar" },
  { value: "reciclar", label: "reciclar", hint: "último recurso" },
];

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: RegrasJogoValue;
  regrasMap: Record<string, RegrasJogoValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

function useBriefingHmw(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula8-briefing-source", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        briefing_aula5?: Record<string, { hmw?: string }>;
      };
      for (const b of Object.values(content.briefing_aula5 ?? {})) {
        const h = (b?.hmw ?? "").trim();
        if (h && h.toLowerCase() !== "como podemos") return h;
      }
      return null;
    },
  });
}

function useOportunidadesFromMatriz(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula8-matriz-source", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        matriz_valor_aula7?: Record<string, { linhas?: { oportunidade?: string }[] }>;
      };
      const acc: string[] = [];
      for (const entry of Object.values(content.matriz_valor_aula7 ?? {})) {
        for (const l of entry?.linhas ?? []) {
          const s = (l?.oportunidade ?? "").trim();
          if (s && !acc.includes(s)) acc.push(s);
        }
      }
      return acc.slice(0, 5);
    },
  });
}

export function PillRegrasJogo({
  pillId,
  schema,
  accent,
  initial,
  regrasMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const principios = schema.principios_options ?? DEFAULT_PRINCIPIOS;
  const rsOpts = schema.rs_options ?? DEFAULT_RS;
  const minJust = schema.min_chars_justificativa ?? 100;
  const minEx = schema.min_chars_exemplo ?? 40;
  const minComo = schema.min_chars_como_ajudam ?? 80;
  const ctaLabel = schema.completion?.label ?? "definir minhas regras";

  const hmwQuery = useBriefingHmw(schema.briefing_source_module_id);
  const oportQuery = useOportunidadesFromMatriz(schema.matriz_source_module_id);
  const hmw = hmwQuery.data;
  const oportunidades = oportQuery.data ?? [];

  const [value, setValue] = useState<RegrasJogoValue>(() => ({
    rs_taticos: [],
    ...initial,
  }));

  useEffect(() => {
    if (initial && Object.keys(initial).length > 0) {
      setValue((prev) => ({ ...prev, ...initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.principio1, initial?.principio2, initial?.rs_taticos?.length]);

  const status = useAutoSaveField({
    value: { ...regrasMap, [pillId]: value },
    initial: regrasMap,
    save,
    field: "regras_jogo_aula8",
  });

  const toggleR = (val: string) => {
    setValue((prev) => {
      const cur = prev.rs_taticos ?? [];
      if (cur.includes(val)) return { ...prev, rs_taticos: cur.filter((x) => x !== val) };
      if (cur.length >= 2) return prev;
      return { ...prev, rs_taticos: [...cur, val] };
    });
  };

  const p1 = value.principio1 ?? "";
  const p2 = value.principio2 ?? "";
  const j1 = (value.justificativa1 ?? "").trim();
  const j2 = (value.justificativa2 ?? "").trim();
  const e1 = (value.exemplo1 ?? "").trim();
  const e2 = (value.exemplo2 ?? "").trim();
  const como = (value.como_ajudam ?? "").trim();
  const rs = value.rs_taticos ?? [];

  const sameError = !!p1 && !!p2 && p1 === p2;
  const ready = useMemo(
    () =>
      !!p1 &&
      !!p2 &&
      !sameError &&
      j1.length >= minJust &&
      j2.length >= minJust &&
      e1.length >= minEx &&
      e2.length >= minEx &&
      rs.length >= 1 &&
      rs.length <= 2 &&
      como.length >= minComo,
    [p1, p2, sameError, j1, j2, e1, e2, rs, como, minJust, minEx, minComo],
  );

  const optsFor = (excludeVal?: string) =>
    principios.filter((p) => !excludeVal || p.value !== excludeVal);

  return (
    <div className="space-y-6">
      {/* contexto pull do briefing + matriz */}
      {(hmw || oportunidades.length > 0) && (
        <aside
          className="rounded-2xl p-4 sm:p-5 space-y-3"
          style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
        >
          {hmw && (
            <div>
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                seu HMW (do briefing · módulo 5)
              </p>
              <p className="font-display text-base sm:text-lg leading-snug text-perestroika-preto">
                {hmw}
              </p>
            </div>
          )}
          {oportunidades.length > 0 && (
            <div>
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                suas oportunidades (matriz · módulo 7)
              </p>
              <ul className="space-y-1">
                {oportunidades.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 font-body text-sm text-perestroika-preto/85">
                    <Sparkles className="h-3 w-3 mt-1 flex-shrink-0 text-perestroika-preto/45" aria-hidden />
                    <span className="leading-snug">{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}

      {/* instruções */}
      <div className="rounded-2xl bg-[#F5EEE1] p-4 sm:p-5 border-2 border-perestroika-preto/15">
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed">
          escolhe <strong>exatamente 2</strong> princípios EMF + <strong>1 ou 2 R's táticos</strong>.
          cada escolha exige justificativa aplicada ao seu projeto. escolher os 3 é não escolher.
        </p>
      </div>

      {/* princípio 1 */}
      <PrincipioBlock
        n={1}
        accent={accent}
        options={optsFor(p2)}
        value={p1}
        onChangePrincipio={(v) => setValue((prev) => ({ ...prev, principio1: v }))}
        justificativa={value.justificativa1 ?? ""}
        onChangeJust={(v) => setValue((prev) => ({ ...prev, justificativa1: v }))}
        exemplo={value.exemplo1 ?? ""}
        onChangeEx={(v) => setValue((prev) => ({ ...prev, exemplo1: v }))}
        minJust={minJust}
        minEx={minEx}
      />

      {/* princípio 2 */}
      <PrincipioBlock
        n={2}
        accent={accent}
        options={optsFor(p1)}
        value={p2}
        onChangePrincipio={(v) => setValue((prev) => ({ ...prev, principio2: v }))}
        justificativa={value.justificativa2 ?? ""}
        onChangeJust={(v) => setValue((prev) => ({ ...prev, justificativa2: v }))}
        exemplo={value.exemplo2 ?? ""}
        onChangeEx={(v) => setValue((prev) => ({ ...prev, exemplo2: v }))}
        minJust={minJust}
        minEx={minEx}
      />

      {sameError && (
        <p className="font-body text-xs text-[#fd4644]">
          escolhe 2 princípios <strong>diferentes</strong>.
        </p>
      )}

      {/* R's táticos */}
      <section
        className="rounded-2xl border-2 p-4 sm:p-5 space-y-3"
        style={{ borderColor: "rgba(9,9,9,0.15)" }}
      >
        <header className="flex items-center gap-2">
          <Target className="h-4 w-4 text-perestroika-preto/70" aria-hidden />
          <p className="font-display uppercase text-sm tracking-[0.18em] text-perestroika-preto/80">
            R's táticos · escolha 1 ou 2
          </p>
        </header>
        <p className="font-body text-xs text-perestroika-preto/60">
          a hierarquia dos 6 R's vai do mais poderoso (recusar) ao último recurso (reciclar).
        </p>
        <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
          {rsOpts.map((r, i) => {
            const checked = rs.includes(r.value);
            const disabled = !checked && rs.length >= 2;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleR(r.value)}
                disabled={disabled}
                className="flex items-start gap-2 rounded-xl border-2 p-3 text-left font-body text-sm transition-colors disabled:opacity-40"
                style={{
                  borderColor: checked ? accent : "rgba(9,9,9,0.15)",
                  backgroundColor: checked ? `${accent}18` : "transparent",
                }}
              >
                <span
                  className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: checked ? accent : "rgba(9,9,9,0.35)" }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-perestroika-preto">{r.label}</span>
                  {r.hint && (
                    <span className="block text-xs text-perestroika-preto/60">{r.hint}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div>
          <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
            como esses R's ajudam meu projeto ({como.length}/{minComo})
          </label>
          <TextareaWithVoice
            value={value.como_ajudam ?? ""}
            onChange={(ev) => setValue((prev) => ({ ...prev, como_ajudam: ev.target.value }))}
            placeholder="conecta os R's escolhidos à sua oportunidade mais promissora"
            rows={3}
            className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
          />
        </div>
      </section>

      {/* footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <SaveIndicator status={status} />
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

function PrincipioBlock({
  n,
  accent,
  options,
  value,
  onChangePrincipio,
  justificativa,
  onChangeJust,
  exemplo,
  onChangeEx,
  minJust,
  minEx,
}: {
  n: 1 | 2;
  accent: string;
  options: PrincipioOpt[];
  value: string;
  onChangePrincipio: (v: string) => void;
  justificativa: string;
  onChangeJust: (v: string) => void;
  exemplo: string;
  onChangeEx: (v: string) => void;
  minJust: number;
  minEx: number;
}) {
  const done = !!value && justificativa.trim().length >= minJust && exemplo.trim().length >= minEx;
  return (
    <article
      className="rounded-2xl border-2 p-4 sm:p-5 space-y-3"
      style={{
        borderColor: done ? accent : "rgba(9,9,9,0.15)",
        backgroundColor: done ? `${accent}0F` : "transparent",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full font-body text-[11px] font-bold text-white"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          {n}
        </span>
        <p className="font-display text-xs uppercase tracking-[0.2em] text-perestroika-preto/70">
          princípio prioritário {n}
        </p>
      </div>

      <div>
        <select
          value={value}
          onChange={(e) => onChangePrincipio(e.target.value)}
          className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm h-[42px]"
        >
          <option value="">selecione um princípio…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
          por que esse ({justificativa.trim().length}/{minJust})
        </label>
        <TextareaWithVoice
          value={justificativa}
          onChange={(ev) => onChangeJust(ev.target.value)}
          placeholder="por que esse princípio pra esse projeto específico"
          rows={2}
          className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
        />
      </div>

      <div>
        <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
          exemplo aplicado ao meu projeto ({exemplo.trim().length}/{minEx})
        </label>
        <TextareaWithVoice
          value={exemplo}
          onChange={(ev) => onChangeEx(ev.target.value)}
          placeholder="uma ação concreta que materializa esse princípio no seu caso"
          rows={2}
          className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
        />
      </div>
    </article>
  );
}
