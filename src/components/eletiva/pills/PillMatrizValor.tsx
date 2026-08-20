import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Droplet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

export type MatrizLinha = {
  vazamento?: string;
  tipo?: string;
  valor_perdido?: string;
  oportunidade?: string;
  beneficiario?: string;
};

export type MatrizValorValue = {
  linhas?: MatrizLinha[];
};

type Schema = {
  type?: "matriz_valor";
  mapa_source_module_id?: string;
  min_linhas?: number;
  min_tipos_diferentes?: number;
  beneficiario_bloqueio?: string[];
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: MatrizValorValue;
  matrizMap: Record<string, MatrizValorValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const TIPO_OPTIONS = [
  { value: "material", label: "material desperdiçado" },
  { value: "tempo", label: "tempo perdido" },
  { value: "energia", label: "energia gasta à toa" },
  { value: "potencial", label: "potencial humano subutilizado" },
  { value: "informacao", label: "informação/conhecimento desperdiçado" },
];

const DEFAULT_BLOQUEIO = ["todos", "todo mundo", "sociedade", "comunidade", "as pessoas", "gente"];

function usePreenchidoDoMapa(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula7-matriz-mapa-source", sourceModuleId, user?.id],
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
        mapa_fluxo_aula6?: Record<string, { vazamentos?: string[] }>;
      };
      const acc: string[] = [];
      for (const entry of Object.values(content.mapa_fluxo_aula6 ?? {})) {
        for (const v of entry?.vazamentos ?? []) {
          const s = (v ?? "").trim();
          if (s && !acc.includes(s)) acc.push(s);
        }
      }
      return acc;
    },
  });
}

function linhaVazia(vazamento = ""): MatrizLinha {
  return { vazamento, tipo: "", valor_perdido: "", oportunidade: "", beneficiario: "" };
}

export function PillMatrizValor({
  pillId,
  schema,
  accent,
  initial,
  matrizMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const minLinhas = schema.min_linhas ?? 5;
  const minTipos = schema.min_tipos_diferentes ?? 3;
  const bloqueio = (schema.beneficiario_bloqueio ?? DEFAULT_BLOQUEIO).map((s) => s.toLowerCase().trim());
  const ctaLabel = schema.completion?.label ?? "entregar matriz";

  const mapaQuery = usePreenchidoDoMapa(schema.mapa_source_module_id);
  const vazamentosMapa = mapaQuery.data ?? [];

  const buildInitial = (): MatrizValorValue => {
    if (initial?.linhas && initial.linhas.length > 0) return { linhas: initial.linhas };
    const linhas = Array.from({ length: minLinhas }, (_, i) => linhaVazia(vazamentosMapa[i] ?? ""));
    return { linhas };
  };

  const [value, setValue] = useState<MatrizValorValue>(buildInitial);

  // hidrata quando initial ou vazamentos do mapa chegarem depois
  useEffect(() => {
    if (initial?.linhas && initial.linhas.length > 0) {
      setValue({ linhas: initial.linhas });
      return;
    }
    if (vazamentosMapa.length > 0) {
      setValue((prev) => {
        const linhas = [...(prev.linhas ?? [])];
        while (linhas.length < minLinhas) linhas.push(linhaVazia());
        for (let i = 0; i < linhas.length; i++) {
          if (!linhas[i].vazamento && vazamentosMapa[i]) {
            linhas[i] = { ...linhas[i], vazamento: vazamentosMapa[i] };
          }
        }
        return { linhas };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.linhas?.length, vazamentosMapa.length]);

  const status = useAutoSaveField({
    value: { ...matrizMap, [pillId]: value },
    initial: matrizMap,
    save,
    field: "matriz_valor_aula7",
  });

  const linhas = value.linhas ?? [];

  const linhasCompletas = useMemo(
    () =>
      linhas.filter(
        (l) =>
          (l.vazamento ?? "").trim().length > 0 &&
          (l.tipo ?? "").trim().length > 0 &&
          (l.valor_perdido ?? "").trim().length > 0 &&
          (l.oportunidade ?? "").trim().length > 5 &&
          (l.beneficiario ?? "").trim().length > 0,
      ),
    [linhas],
  );

  const tiposDiferentes = useMemo(
    () => new Set(linhasCompletas.map((l) => l.tipo).filter(Boolean)).size,
    [linhasCompletas],
  );

  const beneficiarioGenerico = (b: string) => {
    const norm = b.toLowerCase().trim();
    if (!norm) return false;
    return bloqueio.some((bloco) => norm === bloco || norm === `a ${bloco}` || norm === `o ${bloco}`);
  };

  const linhasComBeneficiarioOk = linhasCompletas.filter((l) => !beneficiarioGenerico(l.beneficiario ?? ""));
  const temGenerico = linhasCompletas.length !== linhasComBeneficiarioOk.length;

  const ready =
    linhasCompletas.length >= minLinhas &&
    tiposDiferentes >= minTipos &&
    !temGenerico;

  function updateLinha(i: number, patch: Partial<MatrizLinha>) {
    setValue((prev) => {
      const arr = [...(prev.linhas ?? [])];
      arr[i] = { ...arr[i], ...patch };
      return { linhas: arr };
    });
  }

  function addLinha() {
    setValue((prev) => ({ linhas: [...(prev.linhas ?? []), linhaVazia()] }));
  }

  return (
    <div className="space-y-6">
      {/* contexto do mapa aula 6 */}
      {vazamentosMapa.length > 0 && (
        <aside
          className="rounded-2xl p-4 sm:p-5"
          style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-2">
            do seu mapa de fluxo (aula 6) · {vazamentosMapa.length} vazamento{vazamentosMapa.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-1">
            {vazamentosMapa.slice(0, 6).map((v, i) => (
              <li key={i} className="flex items-start gap-2 font-body text-sm text-perestroika-preto/85">
                <Droplet className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-perestroika-preto/50" aria-hidden />
                <span className="leading-snug">{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {vazamentosMapa.length > 0 && vazamentosMapa.length < minLinhas && (
        <div className="rounded-2xl border-2 border-perestroika-preto/25 bg-perestroika-bege p-4">
          <p className="font-body text-sm text-perestroika-preto/85">
            seu mapa da aula 6 tem só <strong>{vazamentosMapa.length}</strong> vazamento(s). volta lá e cava
            mais {minLinhas - vazamentosMapa.length} — a matriz precisa de {minLinhas} linhas pra funcionar.
          </p>
        </div>
      )}

      {/* instruções */}
      <div className="rounded-2xl bg-[#F5EEE1] p-4 sm:p-5 border-2 border-perestroika-preto/15">
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed">
          cinco linhas. uma pra cada vazamento. cada oportunidade precisa ter{" "}
          <span className="font-semibold">nome</span> e{" "}
          <span className="font-semibold">beneficiário específico</span>. "todo mundo" e "sociedade" não valem —
          quem paga o boleto tem nome.
        </p>
        <p className="font-body text-xs text-perestroika-preto/60 mt-2">
          use pelo menos {minTipos} tipos diferentes de valor (evita "só material").
        </p>
      </div>

      {/* tabela / cards */}
      <div className="space-y-3">
        {linhas.map((linha, i) => {
          const done =
            (linha.vazamento ?? "").trim().length > 0 &&
            (linha.tipo ?? "").trim().length > 0 &&
            (linha.oportunidade ?? "").trim().length > 5 &&
            (linha.beneficiario ?? "").trim().length > 0;
          const generico = beneficiarioGenerico(linha.beneficiario ?? "");
          return (
            <article
              key={i}
              className="rounded-2xl border-2 p-4 space-y-3"
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
                  {i + 1}
                </span>
                <p className="font-display text-xs uppercase tracking-[0.2em] text-perestroika-preto/70">
                  linha {i + 1}
                </p>
              </div>

              <div>
                <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
                  vazamento
                </label>
                <TextareaWithVoice
                  value={linha.vazamento ?? ""}
                  onChange={(e) => updateLinha(i, { vazamento: e.target.value })}
                  placeholder="onde o valor escapa"
                  rows={2}
                  className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
                    tipo
                  </label>
                  <select
                    value={linha.tipo ?? ""}
                    onChange={(e) => updateLinha(i, { tipo: e.target.value })}
                    className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm h-[42px]"
                  >
                    <option value="">selecione…</option>
                    {TIPO_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
                    valor perdido
                  </label>
                  <input
                    type="text"
                    value={linha.valor_perdido ?? ""}
                    onChange={(e) => updateLinha(i, { valor_perdido: e.target.value })}
                    placeholder="R$ 200/mês · 8 kg/dia · 3 h/semana"
                    className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm h-[42px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
                  oportunidade
                </label>
                <TextareaWithVoice
                  value={linha.oportunidade ?? ""}
                  onChange={(e) => updateLinha(i, { oportunidade: e.target.value })}
                  placeholder='capturar valor através de X (evite "reduzir Y" — isso é objetivo, não oportunidade)'
                  rows={2}
                  className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
                />
              </div>

              <div>
                <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 block mb-1">
                  quem se beneficiaria
                </label>
                <input
                  type="text"
                  value={linha.beneficiario ?? ""}
                  onChange={(e) => updateLinha(i, { beneficiario: e.target.value })}
                  placeholder="nome específico · ex: hortas urbanas do bairro tal"
                  className="w-full rounded-xl border p-2 font-body text-sm h-[42px] bg-perestroika-bege"
                  style={{
                    borderColor: generico ? "#fd4644" : "rgba(9,9,9,0.15)",
                  }}
                />
                {generico && (
                  <p className="mt-1 font-body text-xs text-[#fd4644]">
                    "todo mundo" não paga boleto. dá um nome específico.
                  </p>
                )}
              </div>
            </article>
          );
        })}

        {linhas.length < 8 && (
          <button
            type="button"
            onClick={addLinha}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/25 px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/80 hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
          >
            adicionar linha
          </button>
        )}
      </div>

      {/* status validações */}
      <div className="rounded-2xl bg-perestroika-preto/[0.04] p-4 text-xs font-body text-perestroika-preto/70 space-y-1">
        <p>
          linhas completas: <strong>{linhasCompletas.length}</strong> / {minLinhas}
        </p>
        <p>
          tipos diferentes: <strong>{tiposDiferentes}</strong> / {minTipos}
        </p>
        {temGenerico && (
          <p className="text-[#fd4644]">tem beneficiário genérico numa das linhas. corrige.</p>
        )}
      </div>

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
