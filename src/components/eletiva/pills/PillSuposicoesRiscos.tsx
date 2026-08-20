import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

type SuposicaoDim = "publico" | "proposta" | "modelo";

export type SuposicaoItem = {
  descricao?: string;
  se_falsa?: string;
  como_testar?: string;
};

type Prob = "baixa" | "media" | "alta" | "";
type Impacto = "baixo" | "medio" | "alto" | "";

export type RiscoItem = {
  descricao?: string;
  probabilidade?: Prob;
  impacto?: Impacto;
  mitigacao?: string;
};

export type SuposicoesRiscosValue = {
  suposicoes?: Partial<Record<SuposicaoDim, SuposicaoItem>>;
  riscos?: RiscoItem[];
};

type DimSchema = {
  id: SuposicaoDim;
  titulo: string;
  hint: string;
  exemplo: string;
};

type Schema = {
  type?: "suposicoes_riscos";
  proposta_source_module_id?: string;
  bmc_source_module_id?: string;
  dimensoes?: DimSchema[];
  riscos?: { total?: number; min_chars?: number };
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: SuposicoesRiscosValue;
  suposicoesMap: Record<string, SuposicoesRiscosValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

function usePropostaAula13(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula15-proposta", sourceModuleId, user?.id],
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
        proposta_valor_aula13?: Record<
          string,
          { frase_ancora?: string; publico?: string; solucao?: string }
        >;
      };
      for (const v of Object.values(c.proposta_valor_aula13 ?? {})) {
        if (v?.frase_ancora || v?.publico) {
          return {
            frase_ancora: v.frase_ancora ?? "",
            publico: v.publico ?? "",
            solucao: v.solucao ?? "",
          };
        }
      }
      return null;
    },
  });
}

function useBMCAula14(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula15-bmc", sourceModuleId, user?.id],
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
        bmc_aula14?: Record<
          string,
          { segmento?: string; receitas?: string[] }
        >;
      };
      for (const v of Object.values(c.bmc_aula14 ?? {})) {
        if (v?.segmento || (v?.receitas?.length ?? 0) > 0) {
          return {
            segmento: v.segmento ?? "",
            receitas: v.receitas ?? [],
          };
        }
      }
      return null;
    },
  });
}

const DEFAULT_DIMS: DimSchema[] = [
  {
    id: "publico",
    titulo: "sobre o PÚBLICO",
    hint: "estou assumindo que [público] realmente [ação/comportamento].",
    exemplo: "estou assumindo que alunos do 1º ano querem pedir refeição via app com 1 dia de antecedência.",
  },
  {
    id: "proposta",
    titulo: "sobre a PROPOSTA DE VALOR",
    hint: "estou assumindo que o valor entregue é [valor] e que isso resolve [dor].",
    exemplo: "estou assumindo que economizar 15 min na fila é motivo suficiente pra baixar mais um app.",
  },
  {
    id: "modelo",
    titulo: "sobre o MODELO DE NEGÓCIO",
    hint: "estou assumindo que [alguém] paga [quanto] por [motivo].",
    exemplo: "estou assumindo que a escola paga r$ 800/mês por licença pra reduzir desperdício na cantina.",
  },
];

const PROB_OPTIONS: { v: Prob; l: string }[] = [
  { v: "baixa", l: "baixa" },
  { v: "media", l: "média" },
  { v: "alta", l: "alta" },
];
const IMPACTO_OPTIONS: { v: Impacto; l: string }[] = [
  { v: "baixo", l: "baixo" },
  { v: "medio", l: "médio" },
  { v: "alto", l: "alto" },
];

type Zona = "acao" | "planoB" | "monitorar" | "aceitar" | "vazio";
function classifyRisco(r: RiscoItem): Zona {
  if (!r.probabilidade || !r.impacto) return "vazio";
  const p = r.probabilidade;
  const i = r.impacto;
  const impAlto = i === "alto" || i === "medio";
  const probAlta = p === "alta" || p === "media";
  if (probAlta && impAlto) return "acao";
  if (!probAlta && impAlto) return "planoB";
  if (probAlta && !impAlto) return "monitorar";
  return "aceitar";
}

const zonaCopy: Record<Zona, { label: string; tone: string }> = {
  acao: { label: "AÇÃO IMEDIATA", tone: "bg-perestroika-vermelho/15 text-perestroika-vermelho border-perestroika-vermelho/50" },
  planoB: { label: "plano B pronto", tone: "bg-perestroika-laranja/15 text-perestroika-laranja border-perestroika-laranja/50" },
  monitorar: { label: "monitorar", tone: "bg-perestroika-preto/10 text-perestroika-preto/75 border-perestroika-preto/25" },
  aceitar: { label: "aceitar", tone: "bg-perestroika-preto/[0.04] text-perestroika-preto/55 border-perestroika-preto/15" },
  vazio: { label: "categorize", tone: "bg-white text-perestroika-preto/60 border-perestroika-preto/15" },
};

export function PillSuposicoesRiscos({
  pillId,
  schema,
  accent,
  initial,
  suposicoesMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const dimensoes = schema.dimensoes ?? DEFAULT_DIMS;
  const totalRiscos = schema.riscos?.total ?? 3;
  const riscoMinChars = schema.riscos?.min_chars ?? 20;
  const ctaLabel = schema.completion?.label ?? "entregar mapa";

  const propostaQ = usePropostaAula13(schema.proposta_source_module_id);
  const bmcQ = useBMCAula14(schema.bmc_source_module_id);

  const [value, setValue] = useState<SuposicoesRiscosValue>(() => ({
    suposicoes: initial?.suposicoes ?? {},
    riscos:
      initial?.riscos && initial.riscos.length === totalRiscos
        ? initial.riscos
        : Array.from({ length: totalRiscos }, () => ({})),
  }));

  const status = useAutoSaveField({
    value: { ...suposicoesMap, [pillId]: value },
    initial: suposicoesMap,
    save,
    field: "suposicoes_riscos_aula15",
  });

  const setSuposicao = (dim: SuposicaoDim, patch: Partial<SuposicaoItem>) =>
    setValue((prev) => ({
      ...prev,
      suposicoes: {
        ...(prev.suposicoes ?? {}),
        [dim]: { ...(prev.suposicoes?.[dim] ?? {}), ...patch },
      },
    }));

  const setRisco = (idx: number, patch: Partial<RiscoItem>) =>
    setValue((prev) => ({
      ...prev,
      riscos: (prev.riscos ?? []).map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));

  const supStatus = useMemo(() => {
    return dimensoes.map((d) => {
      const s = value.suposicoes?.[d.id] ?? {};
      const ok =
        (s.descricao ?? "").trim().length >= 40 &&
        (s.se_falsa ?? "").trim().length >= 20 &&
        (s.como_testar ?? "").trim().length >= 20;
      return { dim: d, ok };
    });
  }, [dimensoes, value.suposicoes]);

  const supOk = supStatus.every((s) => s.ok);

  const riscoStatus = useMemo(() => {
    return (value.riscos ?? []).map((r) => {
      const zona = classifyRisco(r);
      const descOk = (r.descricao ?? "").trim().length >= riscoMinChars;
      const catOk = !!r.probabilidade && !!r.impacto;
      const mitigNeeded = zona === "acao" || zona === "planoB";
      const mitigOk = !mitigNeeded || (r.mitigacao ?? "").trim().length >= 20;
      return { zona, descOk, catOk, mitigOk, ok: descOk && catOk && mitigOk };
    });
  }, [value.riscos, riscoMinChars]);

  const riscosOk = riscoStatus.every((r) => r.ok);
  const ready = supOk && riscosOk;

  return (
    <div className="space-y-6">
      {/* pull automático */}
      <aside
        className="rounded-2xl p-4 sm:p-5 space-y-3"
        style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
      >
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          o que puxamos das módulos anteriores
        </p>
        {propostaQ.data?.frase_ancora ? (
          <div>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50 mb-0.5">
              proposta de valor · módulo 13
            </p>
            <p className="font-body text-sm text-perestroika-preto/85 leading-snug">
              {propostaQ.data.frase_ancora}
            </p>
            {propostaQ.data.publico && (
              <p className="font-body text-[11px] text-perestroika-preto/60 mt-1">
                público: {propostaQ.data.publico}
              </p>
            )}
          </div>
        ) : (
          <p className="font-body text-xs text-perestroika-vermelho/85">
            você ainda não fechou a proposta da módulo 13.
          </p>
        )}
        {bmcQ.data?.segmento && (
          <div>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50 mb-0.5">
              modelo · módulo 14
            </p>
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              segmento: {bmcQ.data.segmento}
            </p>
            {(bmcQ.data.receitas?.length ?? 0) > 0 && (
              <p className="font-body text-xs text-perestroika-preto/75 leading-snug mt-1">
                receitas: {bmcQ.data.receitas.join(" · ")}
              </p>
            )}
          </div>
        )}
      </aside>

      {/* parte 1 · suposições */}
      <section className="space-y-3">
        <header>
          <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
            parte 1 · 3 suposições críticas
          </h3>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            uma em cada dimensão. suposição é sobre HIPÓTESE de comportamento ou valor, não sobre risco externo.
          </p>
        </header>
        <div className="grid gap-3">
          {dimensoes.map((d, i) => {
            const s = value.suposicoes?.[d.id] ?? {};
            const ok = supStatus[i].ok;
            return (
              <article
                key={d.id}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="font-display uppercase text-lg leading-none"
                      style={{ color: accent }}
                    >
                      suposição {i + 1} · {d.titulo}
                    </p>
                    <p className="font-body text-[11px] italic text-perestroika-preto/55 mt-1">
                      {d.hint}
                    </p>
                    <p className="font-body text-[11px] text-perestroika-preto/55 mt-1">
                      ex: {d.exemplo}
                    </p>
                  </div>
                  {ok && (
                    <span
                      className="rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider"
                      style={{ backgroundColor: `${accent}22`, color: accent }}
                    >
                      ok
                    </span>
                  )}
                </div>

                <Field
                  label="descrição da suposição"
                  value={s.descricao ?? ""}
                  onChange={(v) => setSuposicao(d.id, { descricao: v })}
                  placeholder={d.exemplo}
                  min={40}
                  multiline
                />
                <Field
                  label="se for falsa, o que acontece com o projeto?"
                  value={s.se_falsa ?? ""}
                  onChange={(v) => setSuposicao(d.id, { se_falsa: v })}
                  placeholder="ex: ninguém baixa o app, o esforço de desenvolvimento vira nada."
                  min={20}
                  multiline
                />
                <Field
                  label="como poderia ser testada em menos de 2 semanas?"
                  value={s.como_testar ?? ""}
                  onChange={(v) => setSuposicao(d.id, { como_testar: v })}
                  placeholder="ex: fazer 5 entrevistas rápidas com alunos + landing page falsa medindo cliques."
                  min={20}
                  multiline
                />
              </article>
            );
          })}
        </div>
      </section>

      {/* parte 2 · riscos + matriz */}
      <section className="space-y-3">
        <header>
          <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
            parte 2 · 3 riscos principais
          </h3>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            risco é evento externo que pode dar errado mesmo se a suposição estiver certa. classifique por probabilidade × impacto.
          </p>
        </header>

        <div className="grid gap-3">
          {(value.riscos ?? []).map((r, i) => {
            const st = riscoStatus[i];
            const zona = st.zona;
            const mitigNeeded = zona === "acao" || zona === "planoB";
            return (
              <article
                key={i}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="font-display uppercase text-lg leading-none"
                    style={{ color: accent }}
                  >
                    risco {i + 1}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-body text-[10px] uppercase tracking-wider ${zonaCopy[zona].tone}`}
                  >
                    {zonaCopy[zona].label}
                  </span>
                </div>
                <Field
                  label="qual é o risco?"
                  value={r.descricao ?? ""}
                  onChange={(v) => setRisco(i, { descricao: v })}
                  placeholder="ex: chuva forte no dia do teste presencial."
                  min={riscoMinChars}
                  multiline
                />
                <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                  <SelectPill
                    label="probabilidade"
                    value={r.probabilidade ?? ""}
                    options={PROB_OPTIONS}
                    onChange={(v) => setRisco(i, { probabilidade: v as Prob })}
                    accent={accent}
                  />
                  <SelectPill
                    label="impacto"
                    value={r.impacto ?? ""}
                    options={IMPACTO_OPTIONS}
                    onChange={(v) => setRisco(i, { impacto: v as Impacto })}
                    accent={accent}
                  />
                </div>
                {mitigNeeded && (
                  <Field
                    label={zona === "acao" ? "plano de mitigação (obrigatório · ação imediata)" : "plano B (obrigatório)"}
                    value={r.mitigacao ?? ""}
                    onChange={(v) => setRisco(i, { mitigacao: v })}
                    placeholder="ex: ter data reserva + espaço coberto."
                    min={20}
                    multiline
                    danger={zona === "acao"}
                  />
                )}
              </article>
            );
          })}
        </div>

        {/* matriz visual */}
        <MatrizVisual riscos={value.riscos ?? []} riscoStatus={riscoStatus.map((r) => r.zona)} accent={accent} />
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden />
              falta: {[
                !supOk && "fechar as 3 suposições",
                !riscosOk && "descrever, categorizar e mitigar os riscos",
              ]
                .filter(Boolean)
                .join(" · ")}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  min,
  multiline,
  danger,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min: number;
  multiline?: boolean;
  danger?: boolean;
}) {
  const len = value.trim().length;
  const ok = len >= min;
  const border = danger
    ? "border-perestroika-vermelho/50"
    : ok
      ? "border-perestroika-preto/40"
      : "border-perestroika-preto/15";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          {label}
        </label>
        <span
          className={`font-body text-[10px] tabular-nums ${
            ok ? "text-perestroika-preto/50" : "text-perestroika-preto/60"
          }`}
        >
          {len}/{min}
        </span>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y ${border}`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none ${border}`}
        />
      )}
    </div>
  );
}

function SelectPill<T extends string>({
  label,
  value,
  options,
  onChange,
  accent,
}: {
  label: string;
  value: T | "";
  options: { v: T; l: string }[];
  onChange: (v: T) => void;
  accent: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              className="rounded-full px-3 py-1 font-body text-xs uppercase tracking-wider transition-colors border-2"
              style={
                active
                  ? { backgroundColor: accent, color: "#fff", borderColor: accent }
                  : { backgroundColor: "transparent", color: "rgba(9,9,9,0.7)", borderColor: "rgba(9,9,9,0.15)" }
              }
            >
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatrizVisual({
  riscos,
  riscoStatus,
  accent,
}: {
  riscos: RiscoItem[];
  riscoStatus: Zona[];
  accent: string;
}) {
  // eixo x = impacto (baixo à esquerda, alto à direita)
  // eixo y = probabilidade (alta em cima, baixa embaixo)
  type Cell = { impacto: "baixo" | "alto"; prob: "alta" | "baixa"; label: string; zona: Zona };
  const cells: Cell[] = [
    { impacto: "baixo", prob: "alta", label: "monitorar", zona: "monitorar" },
    { impacto: "alto", prob: "alta", label: "AÇÃO IMEDIATA", zona: "acao" },
    { impacto: "baixo", prob: "baixa", label: "aceitar", zona: "aceitar" },
    { impacto: "alto", prob: "baixa", label: "plano B pronto", zona: "planoB" },
  ];
  const dotsByCell = (cell: Cell) =>
    riscos
      .map((_r, i) => ({ i, z: riscoStatus[i] }))
      .filter((d) => d.z === cell.zona);

  return (
    <div className="mt-2 rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-3">
        matriz probabilidade × impacto
      </p>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-[11px]">
        <div />
        <div className="text-center font-body uppercase tracking-wider text-perestroika-preto/55 pb-1">baixo impacto</div>
        <div className="text-center font-body uppercase tracking-wider text-perestroika-preto/55 pb-1">alto impacto</div>

        <div className="pr-2 flex items-center font-body uppercase tracking-wider text-perestroika-preto/55">alta prob</div>
        {cells.filter((c) => c.prob === "alta").map((c) => (
          <Cell key={`${c.prob}-${c.impacto}`} cell={c} dots={dotsByCell(c)} accent={accent} />
        ))}

        <div className="pr-2 flex items-center font-body uppercase tracking-wider text-perestroika-preto/55">baixa prob</div>
        {cells.filter((c) => c.prob === "baixa").map((c) => (
          <Cell key={`${c.prob}-${c.impacto}`} cell={c} dots={dotsByCell(c)} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function Cell({
  cell,
  dots,
  accent,
}: {
  cell: { label: string; zona: Zona };
  dots: { i: number }[];
  accent: string;
}) {
  const isAcao = cell.zona === "acao";
  return (
    <div
      className={`min-h-[64px] rounded-xl border-2 p-2 flex flex-col justify-between ${zonaCopy[cell.zona].tone}`}
    >
      <p className="font-body text-[10px] uppercase tracking-wider">{cell.label}</p>
      <div className="flex flex-wrap gap-1 justify-end">
        {dots.map((d) => (
          <span
            key={d.i}
            className="inline-flex items-center justify-center h-6 w-6 rounded-full font-display text-xs"
            style={{
              backgroundColor: isAcao ? accent : "rgba(9,9,9,0.85)",
              color: "#fff",
            }}
            aria-label={`risco ${d.i + 1}`}
          >
            {d.i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
