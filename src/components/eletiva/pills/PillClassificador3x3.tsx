import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";
import { PillMarkdown } from "@/components/eletiva/PillMarkdown";

type Category = "linear" | "circular" | "regenerativo";

type FixedItem = { id: string; text: string };

type Schema = {
  type?: "classificador_linear_circular_regenerativo";
  intro_md?: string;
  destaque_md?: string;
  fixed_items?: FixedItem[];
  radar_source_module_id?: string;
  radar_fallback_href?: string;
  justify_count?: number;
  justify_min_chars?: number;
  completion?: { label?: string };
};

type Value = {
  classifications?: Record<string, Category>;
  justifications?: Record<string, string>;
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: Value;
  classMap: Record<string, Value>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const catMeta: Record<Category, { label: string; color: string; bg: string }> = {
  linear: { label: "linear", color: "#5b6066", bg: "#9AA0A7" },
  circular: { label: "circular", color: "#1f4f3a", bg: "#75BF9C" },
  regenerativo: { label: "regenerativo", color: "#0d2c66", bg: "#448FF2" },
};

type RadarItem = { what?: string; where?: string };

function useAula1RadarItems(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula1-radar", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as { items?: RadarItem[] };
      const items = (content.items ?? []).slice(0, 3).map((it, i) => {
        const what = (it.what ?? "").trim();
        const where = (it.where ?? "").trim();
        const text = [what, where].filter(Boolean).join(" · ") || `item ${i + 1}`;
        return { id: `radar-${i + 1}`, text };
      });
      return items;
    },
  });
}

export function PillClassificador3x3({
  pillId,
  title,
  schema,
  accent,
  initial,
  classMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [value, setValue] = useState<Value>(initial ?? {});

  useEffect(() => {
    setValue((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...classMap, [pillId]: value },
    initial: classMap,
    save,
    field: "classificacao_aula2",
  });

  const justifyCount = schema.justify_count ?? 3;
  const justifyMin = schema.justify_min_chars ?? 50;
  const ctaLabel = schema.completion?.label ?? "concluir classificação";

  const radarQuery = useAula1RadarItems(schema.radar_source_module_id);
  const radarItems = radarQuery.data ?? [];
  const hasEnoughRadar = radarItems.length >= 3;

  const fixed = schema.fixed_items ?? [];
  const allItems: FixedItem[] = useMemo(
    () => [...fixed, ...radarItems],
    [fixed, radarItems],
  );

  const classifications = value.classifications ?? {};
  const justifications = value.justifications ?? {};

  const allClassified = allItems.length > 0 && allItems.every((i) => !!classifications[i.id]);
  const justifiedCount = Object.entries(justifications).filter(
    ([, v]) => (v ?? "").trim().length >= justifyMin,
  ).length;
  const enoughJustified = justifiedCount >= justifyCount;
  const ready = hasEnoughRadar && allClassified && enoughJustified;

  const setCategory = (itemId: string, cat: Category) =>
    setValue((prev) => ({
      ...prev,
      classifications: { ...(prev.classifications ?? {}), [itemId]: cat },
    }));

  const setJustification = (itemId: string, text: string) =>
    setValue((prev) => ({
      ...prev,
      justifications: { ...(prev.justifications ?? {}), [itemId]: text },
    }));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          {title}
        </h2>
        <SaveIndicator status={status} />
      </header>

      {schema.intro_md && (
        <PillMarkdown accent={accent} className="text-perestroika-preto/80">{schema.intro_md}</PillMarkdown>
      )}

      {schema.destaque_md && (
        <div
          className="rounded-2xl border-2 px-4 py-3 font-body text-sm leading-snug"
          style={{
            backgroundColor: "#fff4d6",
            borderColor: "#e2bd4a",
            color: "#5a4310",
          }}
        >
          {schema.destaque_md}
        </div>
      )}

      {!hasEnoughRadar && (
        <div className="space-y-3">
          {radarQuery.isLoading ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border-2 border-perestroika-preto/10 bg-perestroika-bege/60 h-24 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border-2 border-perestroika-vermelho/40 bg-perestroika-vermelho/[0.08] p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 text-perestroika-vermelho shrink-0" aria-hidden />
                <p className="font-body text-sm text-perestroika-preto">
                  {`faltam ${3 - radarItems.length} ${
                    3 - radarItems.length === 1 ? "item" : "itens"
                  } no seu radar da missão 1 pra liberar essa missão.`}
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                  seu radar até agora
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => {
                    const item = radarItems[i];
                    const filled = !!item;
                    return (
                      <div
                        key={i}
                        className={`rounded-2xl p-4 min-h-[6rem] flex flex-col gap-1 ${
                          filled
                            ? "border-2 bg-perestroika-bege"
                            : "border-2 border-dashed bg-perestroika-bege/40"
                        }`}
                        style={
                          filled
                            ? { borderColor: "#75BF9C" }
                            : { borderColor: "rgba(9,9,9,0.18)" }
                        }
                      >
                        <span
                          className="font-display leading-none"
                          style={{
                            color: filled ? "#1f4f3a" : "rgba(9,9,9,0.25)",
                            fontSize: "clamp(20px, 3vw, 28px)",
                          }}
                          aria-hidden
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {filled ? (
                          <p className="font-body text-sm text-perestroika-preto leading-snug">
                            {item.text}
                          </p>
                        ) : (
                          <p className="font-body text-xs text-perestroika-preto/55 leading-snug">
                            faltando — volta na missão 1 e adiciona um item aqui.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {schema.radar_fallback_href && (
                  <Link
                    to={schema.radar_fallback_href}
                    className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wider underline"
                    style={{ color: accent }}
                  >
                    voltar pra missão 1 <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <section
        aria-label="itens a classificar"
        aria-disabled={!hasEnoughRadar}
        className={`space-y-3 ${!hasEnoughRadar ? "pointer-events-none opacity-60" : ""}`}
      >
        {allItems.map((item, idx) => {
          const isRadar = item.id.startsWith("radar-");
          const chosen = classifications[item.id];
          const justifying = justifications[item.id] !== undefined;
          const just = justifications[item.id] ?? "";
          const remaining = Math.max(0, justifyMin - just.trim().length);
          return (
            <article
              key={item.id}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 space-y-3"
              style={chosen ? { borderColor: catMeta[chosen].bg } : undefined}
            >
              <div className="flex items-start gap-3">
                <span
                  className="font-display leading-none"
                  style={{ color: accent, fontSize: "clamp(24px, 4vw, 32px)" }}
                  aria-hidden
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  {isRadar && (
                    <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
                      do seu radar
                    </p>
                  )}
                  <p className="font-body text-sm sm:text-base text-perestroika-preto leading-snug">
                    {item.text}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(catMeta) as Category[]).map((cat) => {
                  const selected = chosen === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(item.id, cat)}
                      className={`rounded-full px-4 py-1.5 font-body text-xs uppercase tracking-wider border-2 transition-transform ${
                        selected ? "scale-105" : "hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: selected ? catMeta[cat].bg : "transparent",
                        borderColor: catMeta[cat].bg,
                        color: selected ? "#fff" : catMeta[cat].bg,
                      }}
                    >
                      {catMeta[cat].label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setValue((prev) => {
                      const next = { ...(prev.justifications ?? {}) };
                      if (justifying) delete next[item.id];
                      else next[item.id] = "";
                      return { ...prev, justifications: next };
                    })
                  }
                  className="font-body text-xs uppercase tracking-wider text-perestroika-preto/65 hover:text-perestroika-preto underline"
                >
                  {justifying ? "remover justificativa" : "justificar este"}
                </button>
                {justifying && (
                  <span className="font-body text-[11px] text-perestroika-preto/55">
                    {remaining > 0 ? `faltam ${remaining} chars` : "✓ ok"}
                  </span>
                )}
              </div>

              {justifying && (
                <TextareaWithVoice
                  value={just}
                  onChange={(e) => setJustification(item.id, e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none transition-colors resize-y"
                  placeholder="por que essa categoria? 1 frase basta."
                  voiceAriaLabel="gravar justificativa por voz"
                />
              )}
            </article>
          );
        })}
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55">
          {!hasEnoughRadar
            ? "complete a missão 1 primeiro."
            : !allClassified
              ? `classifique todos os ${allItems.length} itens.`
              : !enoughJustified
                ? `justifique pelo menos ${justifyCount} (faltam ${justifyCount - justifiedCount}).`
                : "pode entregar."}
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
          {isCompleted ? "missão entregue" : ctaLabel}
          {!isCompleted && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export type ClassificadorValue = Value;
