import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Leaf, Users, Coins, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

export type ImpactoLinha = {
  estado_atual?: string;
  estado_desejado?: string;
  metrica?: string;
};

export type Impactos3PValue = {
  planeta?: ImpactoLinha;
  pessoas?: ImpactoLinha;
  prosperidade?: ImpactoLinha;
};

type AncorasMap = Partial<Record<Dimensao, { atual?: string; desejado?: string; metrica?: string }>>;

type Schema = {
  type?: "impactos_3p";
  briefing_source_module_id?: string;
  regras_source_module_id?: string;
  min_chars_atual?: number;
  min_chars_desejado?: number;
  ancoras?: AncorasMap;
  palavras_bloqueadas?: string[];
  completion?: { label?: string };
};

type Dimensao = "planeta" | "pessoas" | "prosperidade";

const DIMENSOES: {
  key: Dimensao;
  titulo: string;
  legenda: string;
  Icon: typeof Leaf;
}[] = [
  { key: "planeta", titulo: "PLANETA", legenda: "ambiental", Icon: Leaf },
  { key: "pessoas", titulo: "PESSOAS", legenda: "social", Icon: Users },
  { key: "prosperidade", titulo: "PROSPERIDADE", legenda: "econômica", Icon: Coins },
];

const DEFAULT_BLOQ = ["reduzir", "diminuir", "minimizar"];

const DEFAULT_ANCORAS: AncorasMap = {
  planeta: {
    atual: "8kg de comida/dia vira lixo",
    desejado: "todo resíduo vira composto",
    metrica: "100% dos 8kg compostados em 6 meses",
  },
  pessoas: {
    atual: "cozinheiras não sabem quanto se desperdiça",
    desejado: "painel diário visível pra todo mundo",
    metrica: "dashboard atualizado 3x/semana por 12 semanas",
  },
  prosperidade: {
    atual: "custo do descarte + compra excedente = R$X/mês",
    desejado: "menos compra + venda do composto",
    metrica: "economia de R$X/mês + R$Y de receita em 12 meses",
  },
};

const METRICA_RE = /\d+/;

function useHmw(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula9-hmw", sourceModuleId, user?.id],
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

function usePrincipios(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula9-principios", sourceModuleId, user?.id],
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
        regras_jogo_aula8?: Record<string, { principio1?: string; principio2?: string }>;
      };
      const acc: string[] = [];
      for (const v of Object.values(content.regras_jogo_aula8 ?? {})) {
        if (v?.principio1) acc.push(v.principio1);
        if (v?.principio2) acc.push(v.principio2);
      }
      return Array.from(new Set(acc));
    },
  });
}

const PRINCIPIO_LABEL: Record<string, string> = {
  eliminar: "eliminar desperdício desde o design",
  circular: "circular no valor mais alto",
  regenerar: "regenerar a natureza",
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: Impactos3PValue;
  impactosMap: Record<string, Impactos3PValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

export function PillImpactos3P({
  pillId,
  schema,
  accent,
  initial,
  impactosMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const minAtual = schema.min_chars_atual ?? 20;
  const minDesejado = schema.min_chars_desejado ?? 20;
  const ancoras = schema.ancoras ?? DEFAULT_ANCORAS;
  const bloqueadas = (schema.palavras_bloqueadas ?? DEFAULT_BLOQ).map((x) => x.toLowerCase());
  const ctaLabel = schema.completion?.label ?? "definir meus impactos";

  const hmwQ = useHmw(schema.briefing_source_module_id);
  const princQ = usePrincipios(schema.regras_source_module_id);

  const [value, setValue] = useState<Impactos3PValue>(() => ({ ...initial }));

  useEffect(() => {
    if (initial && Object.keys(initial).length > 0) {
      setValue((prev) => ({ ...prev, ...initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.planeta?.metrica, initial?.pessoas?.metrica, initial?.prosperidade?.metrica]);

  const status = useAutoSaveField({
    value: { ...impactosMap, [pillId]: value },
    initial: impactosMap,
    save,
    field: "impactos_aula9",
  });

  const updateLinha = (dim: Dimensao, patch: Partial<ImpactoLinha>) => {
    setValue((prev) => ({ ...prev, [dim]: { ...(prev[dim] ?? {}), ...patch } }));
  };

  const validaLinha = (linha?: ImpactoLinha) => {
    if (!linha) return false;
    const atual = (linha.estado_atual ?? "").trim();
    const desejado = (linha.estado_desejado ?? "").trim();
    const metrica = (linha.metrica ?? "").trim();
    if (atual.length < minAtual) return false;
    if (desejado.length < minDesejado) return false;
    if (!metrica || !METRICA_RE.test(metrica)) return false;
    return true;
  };

  const ready = useMemo(
    () => validaLinha(value.planeta) && validaLinha(value.pessoas) && validaLinha(value.prosperidade),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  );

  const hmw = hmwQ.data;
  const principios = princQ.data ?? [];

  return (
    <div className="space-y-6">
      {(hmw || principios.length > 0) && (
        <aside
          className="rounded-2xl p-4 sm:p-5 space-y-3"
          style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
        >
          {hmw && (
            <div>
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                seu HMW (briefing · módulo 5)
              </p>
              <p className="font-display text-base sm:text-lg leading-snug text-perestroika-preto">
                {hmw}
              </p>
            </div>
          )}
          {principios.length > 0 && (
            <div>
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                seus princípios EMF (módulo 8)
              </p>
              <p className="font-body text-sm text-perestroika-preto/85">
                {principios.map((p) => PRINCIPIO_LABEL[p] ?? p).join(" + ")}
              </p>
            </div>
          )}
        </aside>
      )}

      <div className="rounded-2xl bg-[#F5EEE1] p-4 sm:p-5 border-2 border-perestroika-preto/15">
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed">
          preencha as <strong>3 dimensões</strong>. cada linha exige <em>estado atual</em>, <em>estado desejado</em> e{" "}
          <em>métrica</em>. métrica precisa ter número, unidade e prazo — sem número, não valida.
        </p>
        <p className="font-body text-xs text-perestroika-preto/60 mt-2">
          evite "reduzir", "diminuir", "minimizar" sozinhos no estado desejado — regenerativo é construir, aumentar,
          restaurar.
        </p>
      </div>

      <div className="space-y-3">
        {DIMENSOES.map((d) => (
          <DimensaoBlock
            key={d.key}
            dim={d}
            accent={accent}
            value={value[d.key]}
            onChange={(patch) => updateLinha(d.key, patch)}
            minAtual={minAtual}
            minDesejado={minDesejado}
            ancora={ancoras[d.key]}
            bloqueadas={bloqueadas}
            valid={validaLinha(value[d.key])}
          />
        ))}
      </div>

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

function DimensaoBlock({
  dim,
  accent,
  value,
  onChange,
  minAtual,
  minDesejado,
  ancora,
  bloqueadas,
  valid,
}: {
  dim: { key: Dimensao; titulo: string; legenda: string; Icon: typeof Leaf };
  accent: string;
  value?: ImpactoLinha;
  onChange: (patch: Partial<ImpactoLinha>) => void;
  minAtual: number;
  minDesejado: number;
  ancora?: { atual?: string; desejado?: string; metrica?: string };
  bloqueadas: string[];
  valid: boolean;
}) {
  const atual = value?.estado_atual ?? "";
  const desejado = value?.estado_desejado ?? "";
  const metrica = value?.metrica ?? "";

  const desejadoTokens = desejado.toLowerCase().split(/[^a-zà-ú]+/i).filter(Boolean);
  const bloqHit = bloqueadas.filter((b) => desejadoTokens.includes(b));
  const soPalavraBloqueada =
    bloqHit.length > 0 && desejadoTokens.length <= 3;

  const metricaTemNumero = metrica.trim().length > 0 && METRICA_RE.test(metrica);
  const metricaFaltandoNumero = metrica.trim().length > 0 && !metricaTemNumero;

  const { Icon } = dim;

  return (
    <article
      className="rounded-2xl border-2 p-4 sm:p-5 space-y-3"
      style={{
        borderColor: valid ? accent : "rgba(9,9,9,0.15)",
        backgroundColor: valid ? `${accent}0F` : "transparent",
      }}
    >
      <header className="flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white flex-shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display uppercase text-sm tracking-[0.18em] text-perestroika-preto">
            {dim.titulo}
          </p>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            {dim.legenda}
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
            estado atual ({atual.trim().length}/{minAtual})
          </label>
          <TextareaWithVoice
            value={atual}
            onChange={(ev) => onChange({ estado_atual: ev.target.value })}
            placeholder={ancora?.atual ? `ex.: ${ancora.atual}` : "descreva a situação hoje"}
            rows={3}
            className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
          />
        </div>
        <div>
          <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
            estado desejado ({desejado.trim().length}/{minDesejado})
          </label>
          <TextareaWithVoice
            value={desejado}
            onChange={(ev) => onChange({ estado_desejado: ev.target.value })}
            placeholder={ancora?.desejado ? `ex.: ${ancora.desejado}` : "descreva com a solução implementada"}
            rows={3}
            className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
          />
          {soPalavraBloqueada && (
            <p className="flex items-start gap-1 mt-1 font-body text-[11px] text-[#fd4644]">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden />
              <span>
                "{bloqHit.join(", ")}" sozinho é só evitar dano. escreva o que vai <strong>construir</strong> ou{" "}
                <strong>aumentar</strong>.
              </span>
            </p>
          )}
        </div>
        <div>
          <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
            métrica (número + unidade + prazo)
          </label>
          <TextareaWithVoice
            value={metrica}
            onChange={(ev) => onChange({ metrica: ev.target.value })}
            placeholder={ancora?.metrica ? `ex.: ${ancora.metrica}` : "ex.: 200 mudas plantadas em 6 meses"}
            rows={3}
            className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
          />
          {metricaFaltandoNumero && (
            <p className="flex items-start gap-1 mt-1 font-body text-[11px] text-[#fd4644]">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden />
              <span>sem número, é discurso. coloca uma quantidade concreta.</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
