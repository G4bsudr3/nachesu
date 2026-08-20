import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { PillMarkdown } from "@/components/eletiva/PillMarkdown";

type Ator = { nome: string; descricao: string };

type QuadranteId = string;

type Quadrante = {
  id: QuadranteId;
  label: string;
  hint?: string;
  min?: number;
  hard_required?: boolean;
  accent?: string;
};

type Schema = {
  type?: "mapa_atores_2x2";
  radar_source_module_id?: string;
  intro_md?: string;
  aviso_md?: string;
  quadrantes?: Quadrante[];
  completion?: { label?: string };
};

export type MapaAtoresValue = Record<QuadranteId, Ator[]>;

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: MapaAtoresValue;
  mapaMap: Record<string, MapaAtoresValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

type RadarItem = { what?: string; where?: string };

function useProblemaEscolhido(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula3-problema-escolhido", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as { items?: RadarItem[] };
      return (content.items ?? []).slice(0, 3).map((it, i) => {
        const what = (it.what ?? "").trim();
        const where = (it.where ?? "").trim();
        return [what, where].filter(Boolean).join(" · ") || `item ${i + 1}`;
      });
    },
  });
}

const emptyAtor = (): Ator => ({ nome: "", descricao: "" });

/**
 * pílula 03 — exercício mapa de atores (aula 3, economia circular).
 * grid 2x2 editável, mínimo 2 atores por quadrante, "ganha" é obrigatório.
 * puxa o problema escolhido (radar da aula 1) pra ancorar o foco no topo.
 */
export function PillMapaAtores({
  pillId,
  title,
  schema,
  accent,
  initial,
  mapaMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const quadrantes = schema.quadrantes ?? [];
  const ctaLabel = schema.completion?.label ?? "entregar mapa";

  const buildInitial = (): MapaAtoresValue => {
    const out: MapaAtoresValue = {};
    quadrantes.forEach((q) => {
      const cur = initial?.[q.id];
      out[q.id] = Array.isArray(cur) && cur.length > 0 ? cur : [emptyAtor(), emptyAtor()];
    });
    return out;
  };

  const [value, setValue] = useState<MapaAtoresValue>(buildInitial);

  useEffect(() => {
    setValue((prev) => {
      const merged: MapaAtoresValue = { ...prev };
      quadrantes.forEach((q) => {
        const fromServer = initial?.[q.id];
        if (Array.isArray(fromServer) && fromServer.length > 0 && (prev[q.id]?.every(a => !a.nome && !a.descricao) ?? true)) {
          merged[q.id] = fromServer;
        }
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...mapaMap, [pillId]: value },
    initial: mapaMap,
    save,
    field: "mapa_atores_aula3",
  });

  const problemaQuery = useProblemaEscolhido(schema.radar_source_module_id);
  const problemaItems = problemaQuery.data ?? [];

  const validAtor = (a: Ator) => a.nome.trim().length >= 2 && a.descricao.trim().length >= 5;

  const perQuadrantValid = useMemo(() => {
    const out: Record<string, { filled: number; needed: number; ok: boolean }> = {};
    quadrantes.forEach((q) => {
      const list = value[q.id] ?? [];
      const filled = list.filter(validAtor).length;
      const needed = q.min ?? 2;
      out[q.id] = { filled, needed, ok: filled >= needed };
    });
    return out;
  }, [value, quadrantes]);

  const ganhaOk = (perQuadrantValid["ganha"]?.filled ?? 0) >= 1;
  const allQuadOk = quadrantes.every((q) => perQuadrantValid[q.id]?.ok);
  const ready = allQuadOk && ganhaOk;

  const updateAtor = (qid: string, idx: number, patch: Partial<Ator>) => {
    setValue((prev) => {
      const list = [...(prev[qid] ?? [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [qid]: list };
    });
  };

  const addAtor = (qid: string) => {
    setValue((prev) => ({ ...prev, [qid]: [...(prev[qid] ?? []), emptyAtor()] }));
  };

  const removeAtor = (qid: string, idx: number) => {
    setValue((prev) => {
      const list = [...(prev[qid] ?? [])];
      list.splice(idx, 1);
      return { ...prev, [qid]: list.length > 0 ? list : [emptyAtor()] };
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">{title}</h2>
        <SaveIndicator status={status} />
      </header>

      {schema.intro_md && (
        <PillMarkdown accent={accent} className="text-perestroika-preto/80">{schema.intro_md}</PillMarkdown>
      )}

      {/* âncora: problema escolhido */}
      <div
        className="rounded-2xl border-2 p-4 space-y-2"
        style={{ borderColor: `${accent}55`, backgroundColor: `${accent}10` }}
      >
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
          o problema que você escolheu (do seu radar)
        </p>
        {problemaQuery.isLoading ? (
          <p className="font-body text-sm text-perestroika-preto/55">carregando…</p>
        ) : problemaItems.length === 0 ? (
          <p className="font-body text-sm text-perestroika-preto/70">
            você ainda não preencheu o radar da aula 1. volta lá primeiro pra ancorar seu mapa.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {problemaItems.map((text, i) => (
              <li key={i} className="flex items-start gap-2 font-body text-sm text-perestroika-preto">
                <span
                  className="font-display leading-none tabular-nums"
                  style={{ color: accent, fontSize: "clamp(18px, 2.5vw, 24px)" }}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="pt-1 leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {schema.aviso_md && (
        <div
          className="rounded-2xl border-2 px-4 py-3 font-body text-sm leading-snug flex items-start gap-2"
          style={{ backgroundColor: "#F2BC5722", borderColor: "#F2BC57", color: "#5a4310" }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#a37b1f" }} aria-hidden />
          <span className="whitespace-pre-wrap">{schema.aviso_md}</span>
        </div>
      )}

      {/* grid 2x2 (1 col no mobile) */}
      <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {quadrantes.map((q) => {
          const list = value[q.id] ?? [];
          const state = perQuadrantValid[q.id];
          const qAccent = q.accent ?? accent;
          return (
            <section
              key={q.id}
              aria-label={q.label}
              className="rounded-2xl border-2 bg-perestroika-bege p-4 space-y-3"
              style={{ borderColor: state?.ok ? qAccent : "rgba(9,9,9,0.15)" }}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className="font-display uppercase leading-tight"
                    style={{ color: qAccent, fontSize: "clamp(18px, 2.8vw, 22px)" }}
                  >
                    {q.label}
                  </p>
                  {q.hint && (
                    <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mt-0.5">
                      {q.hint}
                    </p>
                  )}
                </div>
                <span
                  className="rounded-full px-2 py-0.5 font-body text-[11px] uppercase tracking-wider tabular-nums"
                  style={{
                    backgroundColor: state?.ok ? qAccent : "rgba(9,9,9,0.08)",
                    color: state?.ok ? "#fff" : "rgba(9,9,9,0.55)",
                  }}
                >
                  {state?.filled ?? 0}/{state?.needed ?? 2}
                </span>
              </header>

              <ul className="space-y-2">
                {list.map((ator, idx) => (
                  <li
                    key={idx}
                    className="rounded-xl border-2 border-perestroika-preto/10 bg-perestroika-bege/60 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ator.nome}
                        onChange={(e) => updateAtor(q.id, idx, { nome: e.target.value })}
                        className="flex-1 rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
                        placeholder="nome específico do ator"
                        aria-label={`nome do ator ${idx + 1} em ${q.label}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeAtor(q.id, idx)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-perestroika-preto/55 hover:text-perestroika-vermelho hover:bg-perestroika-vermelho/10 transition-colors"
                        aria-label={`remover ator ${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={ator.descricao}
                      onChange={(e) => updateAtor(q.id, idx, { descricao: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
                      placeholder="1 frase: o que essa pessoa ganha, perde, decide ou sofre?"
                      aria-label={`descrição do ator ${idx + 1}`}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => addAtor(q.id)}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-perestroika-preto/25 px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/65 hover:border-perestroika-preto hover:text-perestroika-preto transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> adicionar ator
              </button>
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <p className="font-body text-xs text-perestroika-preto/55">
          {!ganhaOk
            ? "explica pelo menos 1 ator em 'ganha com o problema'."
            : !allQuadOk
              ? "faltam atores válidos em algum quadrante (nome + 1 frase)."
              : "pode entregar o mapa."}
        </p>
        <button
          type="button"
          onClick={onComplete}
          disabled={!ready || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !ready || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!ready || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? "mapa entregue" : ctaLabel}
          {!isCompleted && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
