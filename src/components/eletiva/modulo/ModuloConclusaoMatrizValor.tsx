import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type MatrizLinha = {
  vazamento?: string;
  tipo?: string;
  valor_perdido?: string;
  oportunidade?: string;
  beneficiario?: string;
};

type PillRow = { id: string; interaction_schema: { type?: string } | null };

const TIPO_LABEL: Record<string, string> = {
  material: "material",
  tempo: "tempo",
  energia: "energia",
  potencial: "potencial humano",
  informacao: "informação",
};

interface Props {
  moduleId: string;
}

/** celebração pós-conclusão do módulo 7. */
export function ModuloConclusaoMatrizValor({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m7-matriz-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async (): Promise<PillRow | null> => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "matriz_valor",
      );
      return (found as PillRow) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m7-deliverable-conclusion", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as {
        matriz_valor_aula7?: Record<string, { linhas?: MatrizLinha[] }>;
      };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.matriz_valor_aula7 ?? {};
  const value = pill ? map[pill.id] : undefined;
  const linhas = useMemo(
    () =>
      (value?.linhas ?? []).filter(
        (l) => (l.vazamento ?? "").trim().length > 0 && (l.oportunidade ?? "").trim().length > 0,
      ),
    [value],
  );

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || linhas.length === 0) return null;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="matriz de valor entregue"
      className="mt-8 space-y-5"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
          exercício cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          {linhas.length} oportunidade{linhas.length > 1 ? "s" : ""} reai{linhas.length > 1 ? "s" : "l"} mapeada{linhas.length > 1 ? "s" : ""}
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem a gente filtra com os princípios da economia circular pra decidir quais valem
          a pena perseguir.
        </p>
      </header>

      <div className="grid gap-3">
        {linhas.map((l, i) => (
          <article
            key={i}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Sparkles className="h-3.5 w-3.5 text-perestroika-preto/50" aria-hidden />
              <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                oportunidade {i + 1}
              </span>
              {l.tipo && (
                <span className="font-body text-[11px] uppercase tracking-wider rounded-full bg-perestroika-preto/10 text-perestroika-preto/70 px-2 py-0.5">
                  {TIPO_LABEL[l.tipo] ?? l.tipo}
                </span>
              )}
              {l.valor_perdido && (
                <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                  · {l.valor_perdido}
                </span>
              )}
            </div>
            <p className="font-display text-lg leading-snug text-perestroika-preto mb-1">
              {l.oportunidade}
            </p>
            <p className="font-body text-sm text-perestroika-preto/70 leading-snug flex items-start gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-perestroika-preto/60" aria-hidden />
              <span>
                vazamento: <em className="not-italic text-perestroika-preto/75">{l.vazamento}</em>
                {" · "}
                beneficia: <strong>{l.beneficiario}</strong>
              </span>
            </p>
          </article>
        ))}
      </div>
    </motion.section>
  );
}
