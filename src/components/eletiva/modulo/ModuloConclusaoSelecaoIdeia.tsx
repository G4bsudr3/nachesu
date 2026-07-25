import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Value = {
  ideia_final?: string;
  raridade?: "rara" | "meio_obvia" | "obvia";
  versao_a?: string;
  versao_b?: string;
  versao_c?: string;
};

const RARIDADE_LABEL: Record<string, string> = {
  rara: "rara",
  meio_obvia: "meio óbvia",
  obvia: "óbvia",
};

interface Props {
  moduleId: string;
}

export function ModuloConclusaoSelecaoIdeia({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m12-selecao-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "selecao_ideia",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m12-selecao-deliverable", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { selecao_aula12?: Record<string, Value> };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.selecao_aula12 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value?.ideia_final) return null;

  const versoes = [
    { label: "A · original", texto: value.versao_a ?? value.ideia_final },
    { label: "B · escala", texto: value.versao_b ?? "" },
    { label: "C · ângulo", texto: value.versao_c ?? "" },
  ];

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="seleção da ideia"
      className="mt-8 space-y-6"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          missão 12 cumprida
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          você tem uma ideia
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem ela vira proposta de valor articulada. até lá, deixa ela descansar.
        </p>
      </header>

      <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            ideia escolhida
          </p>
          {value.raridade && (
            <span className="rounded-full border-2 border-perestroika-preto/25 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/75">
              raridade · {RARIDADE_LABEL[value.raridade] ?? value.raridade}
            </span>
          )}
        </div>
        <p className="font-display uppercase text-2xl sm:text-3xl leading-tight text-perestroika-preto">
          {value.ideia_final}
        </p>
      </article>

      <section>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 mb-2">
          3 versões da ideia
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {versoes.map((v) => (
            <article
              key={v.label}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2"
            >
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                {v.label}
              </p>
              <p className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
                {v.texto || "—"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </motion.section>
  );
}
