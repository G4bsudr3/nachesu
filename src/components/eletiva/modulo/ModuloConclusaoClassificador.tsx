import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Category = "linear" | "circular" | "regenerativo";

type ClassificadorValue = {
  classifications?: Record<string, Category>;
  justifications?: Record<string, string>;
};

type FixedItem = { id: string; text: string };

type PillRow = {
  id: string;
  interaction_schema: {
    type?: string;
    fixed_items?: FixedItem[];
    radar_source_module_id?: string;
  } | null;
};

type RadarItem = { what?: string; where?: string };

const catMeta: Record<Category, { label: string; bg: string; ink: string; border: string }> = {
  linear: { label: "linear", bg: "#9AA0A7", ink: "#1f1f22", border: "#7a7f85" },
  circular: { label: "circular", bg: "#75BF9C", ink: "#0f2c22", border: "#4f9c78" },
  regenerativo: { label: "regenerativo", bg: "#448FF2", ink: "#0a1e4a", border: "#2b6ec9" },
};

interface Props {
  moduleId: string;
}

/**
 * celebração pós-conclusão da aula 2 (economia circular).
 * mostra os 13 itens que o estudante classificou (10 fixos + 3 do radar),
 * agrupados em 3 colunas por categoria com a cor de cada uma.
 * so renderiza quando existe classificacao salva no deliverable.
 */
export function ModuloConclusaoClassificador({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m2-classificador-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async (): Promise<PillRow | null> => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) =>
          (p.interaction_schema as { type?: string } | null)?.type ===
          "classificador_linear_circular_regenerativo",
      );
      return (found as PillRow) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m2-deliverable-conclusion", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { classificacao_aula2?: Record<string, ClassificadorValue> };
    },
  });

  const radarSourceModuleId = pillQuery.data?.interaction_schema?.radar_source_module_id;
  const radarQuery = useQuery({
    queryKey: ["ecc-m2-radar-source", radarSourceModuleId, user?.id],
    enabled: !!user && !!radarSourceModuleId,
    queryFn: async (): Promise<FixedItem[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", radarSourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as { items?: RadarItem[] };
      return (content.items ?? []).slice(0, 3).map((it, i) => {
        const what = (it.what ?? "").trim();
        const where = (it.where ?? "").trim();
        const text = [what, where].filter(Boolean).join(" · ") || `item ${i + 1}`;
        return { id: `radar-${i + 1}`, text };
      });
    },
  });

  const pill = pillQuery.data;
  const value = useMemo<ClassificadorValue>(() => {
    if (!pill) return {};
    const map = deliverableQuery.data?.classificacao_aula2 ?? {};
    return map[pill.id] ?? {};
  }, [pill, deliverableQuery.data]);

  const items = useMemo<FixedItem[]>(() => {
    const fixed = pill?.interaction_schema?.fixed_items ?? [];
    return [...fixed, ...(radarQuery.data ?? [])];
  }, [pill, radarQuery.data]);

  const grouped = useMemo(() => {
    const out: Record<Category, Array<{ item: FixedItem; justification?: string; isRadar: boolean }>> = {
      linear: [],
      circular: [],
      regenerativo: [],
    };
    const classifications = value.classifications ?? {};
    const justifications = value.justifications ?? {};
    items.forEach((item) => {
      const cat = classifications[item.id];
      if (!cat) return;
      out[cat].push({
        item,
        justification: (justifications[item.id] ?? "").trim() || undefined,
        isRadar: item.id.startsWith("radar-"),
      });
    });
    return out;
  }, [items, value]);

  const totals = {
    linear: grouped.linear.length,
    circular: grouped.circular.length,
    regenerativo: grouped.regenerativo.length,
  };
  const totalClassified = totals.linear + totals.circular + totals.regenerativo;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || totalClassified === 0) return null;

  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.section
      {...fade}
      aria-label="missão do classificador cumprida"
      className="my-8 rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-5 py-8 sm:px-8 sm:py-10 space-y-6"
    >
      <header className="space-y-2 text-center sm:text-left">
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/60">
          missão cumprida
        </p>
        <h2
          className="font-display-duduo font-black uppercase leading-[0.92] text-perestroika-preto"
          style={{ fontSize: "clamp(28px, 5.5vw, 44px)" }}
        >
          seu mapa mental do que é economia circular
        </h2>
        <p className="font-body text-sm text-perestroika-preto/75 max-w-2xl">
          você classificou {totalClassified} itens. essa é a lente que você vai carregar pras próximas aulas.
        </p>
        <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
          {(Object.keys(catMeta) as Category[]).map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-body text-xs uppercase tracking-wider"
              style={{ backgroundColor: catMeta[cat].bg, color: "#fff" }}
            >
              <span className="tabular-nums">{totals[cat]}</span> {catMeta[cat].label}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(catMeta) as Category[]).map((cat) => {
          const meta = catMeta[cat];
          const list = grouped[cat];
          return (
            <div
              key={cat}
              className="rounded-2xl border-2 p-3 sm:p-4 space-y-3"
              style={{ borderColor: meta.border, backgroundColor: `${meta.bg}22` }}
            >
              <div
                className="rounded-xl px-3 py-2 flex items-center justify-between"
                style={{ backgroundColor: meta.bg, color: "#fff" }}
              >
                <span className="font-body text-xs uppercase tracking-[0.2em]">{meta.label}</span>
                <span className="font-display leading-none text-2xl tabular-nums">
                  {String(list.length).padStart(2, "0")}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="font-body text-xs text-perestroika-preto/50 italic px-1">
                  nenhum item nessa categoria.
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map(({ item, justification, isRadar }) => (
                    <li
                      key={item.id}
                      className="rounded-xl bg-perestroika-bege border-2 p-3 space-y-1.5"
                      style={{ borderColor: meta.border }}
                    >
                      {isRadar && (
                        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                          do seu radar
                        </p>
                      )}
                      <p className="font-body text-sm text-perestroika-preto leading-snug">
                        {item.text}
                      </p>
                      {justification && (
                        <p
                          className="font-body text-xs italic leading-snug pt-1 border-t"
                          style={{ borderColor: `${meta.border}44`, color: meta.ink }}
                        >
                          “{justification}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
