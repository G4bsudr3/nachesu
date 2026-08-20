import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

type Metodo = "entrevista" | "prototipo" | "landing" | "concierge" | "fakedoor";

export type InstrumentoColetaValue = {
  metodo?: Metodo;
  instrumento?: Record<string, string>;
  cronograma_refinado?: string[];
};

type Schema = {
  type?: "instrumento_coleta";
  plano_source_module_id?: string;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: InstrumentoColetaValue;
  instrumentoMap: Record<string, InstrumentoColetaValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

type CampoDef = { id: string; label: string; hint?: string; min: number; multiline?: boolean };

const CAMPOS_POR_METODO: Record<Metodo, { titulo: string; campos: CampoDef[] }> = {
  entrevista: {
    titulo: "instrumento · entrevista de validação",
    campos: [
      { id: "roteiro", label: "roteiro de 5 perguntas abertas", hint: "1 por linha. abertas — evita 'você usaria?'.", min: 80, multiline: true },
      { id: "local_horario", label: "local + horário planejado", hint: "onde e quando você vai abordar as pessoas.", min: 15 },
      { id: "registro", label: "como vai registrar", hint: "gravação com permissão? notas na hora?", min: 15 },
    ],
  },
  prototipo: {
    titulo: "instrumento · protótipo de papel",
    campos: [
      { id: "prototipo_link", label: "foto/link do protótipo", hint: "cola link do drive/figma ou descreve o que desenhou.", min: 15 },
      { id: "roteiro_teste", label: "roteiro do teste com usuário", hint: "o que vai pedir pro usuário fazer? o que vai observar?", min: 60, multiline: true },
      { id: "quantos", label: "quantas pessoas vai testar + onde", hint: "mín 3 pessoas. de preferência do público-alvo.", min: 15 },
    ],
  },
  landing: {
    titulo: "instrumento · landing page falsa",
    campos: [
      { id: "link_pagina", label: "link da página", hint: "notion, carrd, framer, wix free. link publicável.", min: 10 },
      { id: "onde_divulgar", label: "onde vai divulgar", hint: "instagram, whatsapp, grupo, boca a boca. quanto tempo cada canal.", min: 30, multiline: true },
      { id: "analytics", label: "ferramenta de análise", hint: "conta cliques como? url encurtada, analytics simples, contador.", min: 15 },
    ],
  },
  concierge: {
    titulo: "instrumento · mvp concierge",
    campos: [
      { id: "pessoas", label: "lista das 3-5 pessoas que vão ser servidas", hint: "nome + como conheceu + por que combinam com o público.", min: 40, multiline: true },
      { id: "como_entregar", label: "como você vai entregar o serviço na prática", hint: "passo a passo do que VOCÊ faz na mão pra essas pessoas.", min: 60, multiline: true },
      { id: "o_que_medir_extra", label: "o que vai medir de perto", hint: "além do critério do módulo 16, o que observa em cada atendimento.", min: 30, multiline: true },
    ],
  },
  fakedoor: {
    titulo: "instrumento · fake door",
    campos: [
      { id: "onde_botao", label: "onde vai colocar o 'botão que não existe'", hint: "post no instagram, story com link, página falsa, etc.", min: 15 },
      { id: "acao_pos_clique", label: "o que aparece quando alguém clica", hint: "'em breve', 'entra na lista', pesquisa curta.", min: 20 },
      { id: "como_contar", label: "como vai contar os cliques", hint: "url encurtada, analytics, screenshot manual.", min: 15 },
    ],
  },
};

function usePlanoAula16(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula17-plano", sourceModuleId, user?.id],
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
        experimento_plano_aula16?: Record<
          string,
          { metodo?: Metodo; criterio_sucesso?: string; suposicao_texto?: string }
        >;
      };
      for (const v of Object.values(c.experimento_plano_aula16 ?? {})) {
        if (v?.metodo) {
          return {
            metodo: v.metodo,
            criterio_sucesso: v.criterio_sucesso ?? "",
            suposicao_texto: v.suposicao_texto ?? "",
          };
        }
      }
      return null;
    },
  });
}

export function PillInstrumentoColeta({
  pillId,
  schema,
  accent,
  initial,
  instrumentoMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const ctaLabel = schema.completion?.label ?? "salvar e ir executar";
  const planoQ = usePlanoAula16(schema.plano_source_module_id);
  const metodoFromPlano = planoQ.data?.metodo;

  const [value, setValue] = useState<InstrumentoColetaValue>(() => ({
    metodo: initial?.metodo ?? metodoFromPlano,
    instrumento: initial?.instrumento ?? {},
    cronograma_refinado: initial?.cronograma_refinado?.length ? initial.cronograma_refinado : ["", "", ""],
  }));

  // if plano loads after mount and value.metodo not set, sync
  const activeMetodo = value.metodo ?? metodoFromPlano;
  const def = activeMetodo ? CAMPOS_POR_METODO[activeMetodo] : null;

  const status = useAutoSaveField({
    value: { ...instrumentoMap, [pillId]: { ...value, metodo: activeMetodo } },
    initial: instrumentoMap,
    save,
    field: "instrumento_coleta_aula17",
  });

  const setCampo = (id: string, v: string) =>
    setValue((prev) => ({ ...prev, instrumento: { ...(prev.instrumento ?? {}), [id]: v } }));

  const setCronDia = (i: number, v: string) =>
    setValue((prev) => {
      const arr = [...(prev.cronograma_refinado ?? [])];
      arr[i] = v;
      return { ...prev, cronograma_refinado: arr };
    });

  const addDia = () =>
    setValue((prev) => ({ ...prev, cronograma_refinado: [...(prev.cronograma_refinado ?? []), ""] }));

  const removeDia = (i: number) =>
    setValue((prev) => ({
      ...prev,
      cronograma_refinado: (prev.cronograma_refinado ?? []).filter((_, idx) => idx !== i),
    }));

  const camposOk = useMemo(() => {
    if (!def) return false;
    return def.campos.every((c) => (value.instrumento?.[c.id] ?? "").trim().length >= c.min);
  }, [def, value.instrumento]);

  const cronOk = (value.cronograma_refinado ?? []).filter((d) => d.trim().length >= 8).length >= 3;
  const ready = !!activeMetodo && camposOk && cronOk;

  if (planoQ.isLoading) {
    return <p className="font-body text-xs text-perestroika-preto/60">carregando seu plano do módulo 16…</p>;
  }

  if (!metodoFromPlano && !initial?.metodo) {
    return (
      <div
        className="rounded-2xl p-4 flex items-start gap-2"
        style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
      >
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
        <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
          você ainda não escolheu método no módulo 16. volta lá antes de montar o instrumento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {planoQ.data && (
        <div
          className="rounded-2xl p-3 space-y-1"
          style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
        >
          <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/60">
            do seu plano · módulo 16
          </p>
          <p className="font-body text-xs text-perestroika-preto/85">
            <span className="font-semibold">suposição: </span>
            {planoQ.data.suposicao_texto || "—"}
          </p>
          <p className="font-body text-xs text-perestroika-preto/85">
            <span className="font-semibold">critério: </span>
            {planoQ.data.criterio_sucesso || "—"}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <SectionHeader n={1} title={def!.titulo.toUpperCase()} hint="preenche o que o método pede. tudo específico." />
        <div className="grid gap-3">
          {def!.campos.map((c) => (
            <Field
              key={c.id}
              label={c.label}
              hint={c.hint}
              value={value.instrumento?.[c.id] ?? ""}
              onChange={(v) => setCampo(c.id, v)}
              min={c.min}
              multiline={c.multiline}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          n={2}
          title="CRONOGRAMA REFINADO"
          hint="mín 3 dias. dia 8: você volta aqui pra registrar."
        />
        <div className="grid gap-2">
          {(value.cronograma_refinado ?? []).map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/60 flex-shrink-0 w-12">
                dia {i + 1}
              </span>
              <input
                value={d}
                onChange={(e) => setCronDia(i, e.target.value)}
                placeholder={
                  i === 0
                    ? "ex: montar o instrumento + testar comigo mesmo."
                    : i === (value.cronograma_refinado?.length ?? 1) - 1
                      ? "ex: analisar dados + voltar pra parte 2."
                      : "ex: rodar o teste."
                }
                className="flex-1 rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none"
              />
              {(value.cronograma_refinado?.length ?? 0) > 3 && (
                <button
                  type="button"
                  onClick={() => removeDia(i)}
                  className="text-perestroika-preto/60 hover:text-perestroika-vermelho"
                  aria-label="remover dia"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addDia}
            className="inline-flex items-center gap-1 self-start rounded-full border-2 border-perestroika-preto/20 px-3 py-1.5 font-body text-xs text-perestroika-preto/70 hover:border-perestroika-preto/50"
          >
            <Plus className="h-3.5 w-3.5" /> adicionar dia
          </button>
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
                  !camposOk && "campos do instrumento",
                  !cronOk && "3+ dias no cronograma",
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
              <Check className="h-4 w-4" aria-hidden /> pronto
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

function Field({
  label,
  hint,
  value,
  onChange,
  min,
  multiline,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  multiline?: boolean;
}) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <div className="space-y-1.5">
      <div>
        <p className="font-body text-sm font-semibold text-perestroika-preto">{label}</p>
        {hint && <p className="font-body text-xs text-perestroika-preto/60">{hint}</p>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y ${
            ok ? "border-perestroika-preto/40" : "border-perestroika-preto/15"
          }`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none ${
            ok ? "border-perestroika-preto/40" : "border-perestroika-preto/15"
          }`}
        />
      )}
      <p className={`font-body text-[10px] tabular-nums text-right ${ok ? "text-perestroika-preto/50" : "text-perestroika-preto/60"}`}>
        {len}/{min}
      </p>
    </div>
  );
}
