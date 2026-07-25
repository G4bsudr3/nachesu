import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Value = {
  problema?: string;
  publico?: string;
  solucao?: string;
  como_circula?: string;
  por_que_agora?: string;
  frase_ancora?: string;
};

interface Props {
  moduleId: string;
}

const BLOCO_LABELS: Array<{ id: keyof Value; label: string }> = [
  { id: "problema", label: "problema" },
  { id: "publico", label: "público" },
  { id: "solucao", label: "solução" },
  { id: "como_circula", label: "como circula / regenera" },
  { id: "por_que_agora", label: "por que agora" },
];

export function ModuloConclusaoPropostaValor({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m13-proposta-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "proposta_valor",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m13-proposta-deliverable", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { proposta_valor_aula13?: Record<string, Value> };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.proposta_valor_aula13 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value?.frase_ancora) return null;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="proposta de valor"
      className="mt-8 space-y-6"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          missão 13 cumprida
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          sua proposta tem nome e forma
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem: modelo de negócio — como isso se paga.
        </p>
      </header>

      <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 space-y-2">
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
          frase-âncora
        </p>
        <p className="font-display uppercase text-2xl sm:text-3xl leading-tight text-perestroika-preto">
          {value.frase_ancora}
        </p>
      </article>

      <section>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 mb-2">
          canvas · 5 blocos
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {BLOCO_LABELS.map((b, i) => {
            const full = i >= 2;
            return (
              <article
                key={b.id}
                className={`rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2 ${
                  full ? "sm:col-span-2" : ""
                }`}
              >
                <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                  {b.label}
                </p>
                <p className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
                  {value[b.id] || "—"}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </motion.section>
  );
}
