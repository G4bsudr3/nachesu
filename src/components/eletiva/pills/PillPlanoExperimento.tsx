import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

type SuposicaoKey = "publico" | "proposta" | "modelo";
type Metodo = "entrevista" | "prototipo" | "landing" | "concierge" | "fakedoor";

export type PlanoExperimentoValue = {
  suposicao_key?: SuposicaoKey;
  suposicao_texto?: string;
  metodo?: Metodo;
  o_que_medir?: string;
  criterio_sucesso?: string;
  cronograma?: {
    preparacao?: string;
    execucao?: string;
    analise?: string;
  };
};

type MetodoDef = {
  id: Metodo;
  titulo: string;
  descricao: string;
  bom_para: string;
};

type Schema = {
  type?: "plano_experimento";
  suposicoes_source_module_id?: string;
  metodos?: MetodoDef[];
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PlanoExperimentoValue;
  planoMap: Record<string, PlanoExperimentoValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const DEFAULT_METODOS: MetodoDef[] = [
  { id: "entrevista", titulo: "entrevista de validação", descricao: "5-10 conversas de 15-20 min com pessoas do seu público.", bom_para: "testa suposição sobre PÚBLICO e dor." },
  { id: "prototipo", titulo: "protótipo de papel", descricao: "desenha telas no papel, mostra pra 3-5 pessoas, observa reação.", bom_para: "testa suposição sobre FLUXO e usabilidade." },
  { id: "landing", titulo: "landing page falsa", descricao: "página simples com botão que ainda não funciona. mede cliques.", bom_para: "testa suposição sobre INTERESSE e proposta de valor." },
  { id: "concierge", titulo: "MVP concierge", descricao: "faz o serviço manualmente pra 3-5 pessoas, sem tecnologia.", bom_para: "testa suposição sobre VALOR real entregue." },
  { id: "fakedoor", titulo: "fake door", descricao: "botão de recurso que ainda não existe, mede quantos clicam.", bom_para: "testa DEMANDA por funcionalidade específica." },
];

type SuposicaoFromAula15 = { key: SuposicaoKey; texto: string; label: string };

const DIM_LABEL: Record<SuposicaoKey, string> = {
  publico: "sobre o público",
  proposta: "sobre a proposta de valor",
  modelo: "sobre o modelo de negócio",
};

function useSuposicoesAula15(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula16-suposicoes", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<SuposicaoFromAula15[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const c = (data?.content ?? {}) as {
        suposicoes_riscos_aula15?: Record<
          string,
          { suposicoes?: Partial<Record<SuposicaoKey, { descricao?: string }>> }
        >;
      };
      const out: SuposicaoFromAula15[] = [];
      for (const v of Object.values(c.suposicoes_riscos_aula15 ?? {})) {
        const sup = v?.suposicoes ?? {};
        (["publico", "proposta", "modelo"] as SuposicaoKey[]).forEach((k) => {
          const t = sup[k]?.descricao?.trim();
          if (t && !out.some((s) => s.key === k)) {
            out.push({ key: k, texto: t, label: DIM_LABEL[k] });
          }
        });
        if (out.length === 3) break;
      }
      return out;
    },
  });
}

const NUM_RE = /(\d+\s*%|\d+\s*(pessoas|alunos|cliques|entrevistas|dias|vezes|de\s*\d+)|>\s*\d+|>=?\s*\d+|\d+\s*\/\s*\d+)/i;

export function PillPlanoExperimento({
  pillId,
  schema,
  accent,
  initial,
  planoMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const metodos = schema.metodos ?? DEFAULT_METODOS;
  const ctaLabel = schema.completion?.label ?? "entregar plano";

  const supQ = useSuposicoesAula15(schema.suposicoes_source_module_id);
  const suposicoes = supQ.data ?? [];

  const [value, setValue] = useState<PlanoExperimentoValue>(() => ({
    suposicao_key: initial?.suposicao_key,
    suposicao_texto: initial?.suposicao_texto ?? "",
    metodo: initial?.metodo,
    o_que_medir: initial?.o_que_medir ?? "",
    criterio_sucesso: initial?.criterio_sucesso ?? "",
    cronograma: initial?.cronograma ?? {},
  }));

  const status = useAutoSaveField({
    value: { ...planoMap, [pillId]: value },
    initial: planoMap,
    save,
    field: "experimento_plano_aula16",
  });

  const selectSuposicao = (s: SuposicaoFromAula15) =>
    setValue((prev) => ({
      ...prev,
      suposicao_key: s.key,
      suposicao_texto: s.texto,
    }));

  const setMetodo = (m: Metodo) => setValue((prev) => ({ ...prev, metodo: m }));
  const setCron = (k: "preparacao" | "execucao" | "analise", v: string) =>
    setValue((prev) => ({ ...prev, cronograma: { ...(prev.cronograma ?? {}), [k]: v } }));

  const supOk = !!value.suposicao_key && (value.suposicao_texto ?? "").length > 10;
  const metodoOk = !!value.metodo;
  const medirLen = (value.o_que_medir ?? "").trim().length;
  const medirOk = medirLen >= 25;
  const criterioTxt = (value.criterio_sucesso ?? "").trim();
  const criterioLen = criterioTxt.length;
  const criterioHasNum = NUM_RE.test(criterioTxt);
  const criterioOk = criterioLen >= 20 && criterioHasNum;
  const cron = value.cronograma ?? {};
  const cronOk =
    (cron.preparacao ?? "").trim().length >= 10 &&
    (cron.execucao ?? "").trim().length >= 10 &&
    (cron.analise ?? "").trim().length >= 10;

  const ready = supOk && metodoOk && medirOk && criterioOk && cronOk;

  const selectedMetodo = useMemo(
    () => metodos.find((m) => m.id === value.metodo),
    [metodos, value.metodo],
  );

  return (
    <div className="space-y-6">
      {/* 1. suposição a testar */}
      <section className="space-y-3">
        <SectionHeader
          n={1}
          title="SUPOSIÇÃO A TESTAR"
          hint="escolha uma das 3 que você mapeou no módulo 15. só uma."
        />
        {supQ.isLoading ? (
          <p className="font-body text-xs text-perestroika-preto/60">carregando suas suposições do módulo 15…</p>
        ) : suposicoes.length === 0 ? (
          <div
            className="rounded-2xl p-4 flex items-start gap-2"
            style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
            <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
              você ainda não fechou o mapa do módulo 15. volta lá antes de planejar o experimento.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {suposicoes.map((s) => {
              const active = value.suposicao_key === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => selectSuposicao(s)}
                  className="text-left rounded-2xl border-2 p-4 transition-colors"
                  style={{
                    borderColor: active ? accent : "rgba(9,9,9,0.15)",
                    backgroundColor: active ? `${accent}12` : "rgba(255,255,255,0.4)",
                  }}
                >
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                    {s.label}
                  </p>
                  <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
                    {s.texto}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. método */}
      <section className="space-y-3">
        <SectionHeader
          n={2}
          title="MÉTODO ESCOLHIDO"
          hint="5 tipos. cada um serve pra uma dimensão diferente."
        />
        <div className="grid gap-2">
          {metodos.map((m) => {
            const active = value.metodo === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetodo(m.id)}
                className="text-left rounded-2xl border-2 p-3 transition-colors flex gap-3"
                style={{
                  borderColor: active ? accent : "rgba(9,9,9,0.15)",
                  backgroundColor: active ? `${accent}12` : "rgba(255,255,255,0.4)",
                }}
              >
                <span
                  className="inline-flex h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5"
                  style={{
                    borderColor: active ? accent : "rgba(9,9,9,0.4)",
                    backgroundColor: active ? accent : "transparent",
                  }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display uppercase text-base leading-none" style={{ color: active ? accent : "rgba(9,9,9,0.9)" }}>
                    {m.titulo}
                  </p>
                  <p className="font-body text-xs text-perestroika-preto/70 mt-1 leading-snug">
                    {m.descricao}
                  </p>
                  <p className="font-body text-[11px] italic text-perestroika-preto/55 mt-1">
                    {m.bom_para}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. o que medir */}
      <section className="space-y-3">
        <SectionHeader
          n={3}
          title="O QUE OBSERVAR / MEDIR"
          hint="dado específico, quantificável. observa comportamento, não intenção declarada."
        />
        <TextField
          value={value.o_que_medir ?? ""}
          onChange={(v) => setValue((prev) => ({ ...prev, o_que_medir: v }))}
          placeholder={
            selectedMetodo?.id === "landing"
              ? "ex: quantos alunos clicam no botão 'pedir refeição antecipada' na landing page."
              : selectedMetodo?.id === "entrevista"
                ? "ex: quantos entrevistados descrevem a mesma dor sem eu induzir."
                : selectedMetodo?.id === "concierge"
                  ? "ex: quantos dos 5 usam o serviço mais de 1 vez em 2 semanas."
                  : "dado específico e observável."
          }
          min={25}
        />
      </section>

      {/* 4. critério de sucesso */}
      <section className="space-y-3">
        <SectionHeader
          n={4}
          title="CRITÉRIO DE SUCESSO"
          hint="definido AGORA, antes do teste. tem que ter número. sem número, você vira advogado da ideia."
        />
        <TextField
          value={value.criterio_sucesso ?? ""}
          onChange={(v) => setValue((prev) => ({ ...prev, criterio_sucesso: v }))}
          placeholder="ex: se >30% dos que veem a landing page clicam, suposição validada. abaixo disso, refaço."
          min={20}
        />
        {criterioLen > 0 && !criterioHasNum && (
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              falta número. critério sem número ("bastante", "muitas pessoas") não separa fracasso de sucesso — vira interpretação.
            </p>
          </div>
        )}
      </section>

      {/* 5. cronograma */}
      <section className="space-y-3">
        <SectionHeader
          n={5}
          title="CRONOGRAMA DE 2 SEMANAS"
          hint="regra: menos de r$ 100 e menos de 2 semanas do começo ao fim."
        />
        <div className="grid gap-2">
          <CronRow label="dia 1-3 · preparação" value={cron.preparacao ?? ""} onChange={(v) => setCron("preparacao", v)} placeholder="ex: montar landing page em 1 hora + escrever 3 posts de divulgação." />
          <CronRow label="dia 4-8 · execução" value={cron.execucao ?? ""} onChange={(v) => setCron("execucao", v)} placeholder="ex: divulgar em 2 grupos, deixar rodar 5 dias." />
          <CronRow label="dia 9-10 · análise" value={cron.analise ?? ""} onChange={(v) => setCron("analise", v)} placeholder="ex: contar cliques, comparar com critério, escrever conclusão." />
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5 min-w-0">
              <Sparkles className="h-3 w-3 flex-shrink-0" aria-hidden />
              <span className="truncate">
                falta: {[
                  !supOk && "escolher suposição",
                  !metodoOk && "escolher método",
                  !medirOk && "o que medir",
                  !criterioOk && "critério com número",
                  !cronOk && "cronograma",
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

function TextField({
  value,
  onChange,
  placeholder,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min: number;
}) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y ${
          ok ? "border-perestroika-preto/30" : "border-perestroika-preto/15"
        }`}
      />
      <p
        className={`font-body text-[10px] tabular-nums text-right ${
          ok ? "text-perestroika-preto/50" : "text-perestroika-preto/60"
        }`}
      >
        {len}/{min}
      </p>
    </div>
  );
}

function CronRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ok = value.trim().length >= 10;
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 space-y-1.5">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none ${
          ok ? "border-perestroika-preto/30" : "border-perestroika-preto/15"
        }`}
      />
    </div>
  );
}
