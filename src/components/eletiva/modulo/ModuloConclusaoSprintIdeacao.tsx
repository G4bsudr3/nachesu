import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Ideia = { id?: string; rodada?: 1 | 2 | 3 | 4; texto?: string };
type Value = { ideias?: Ideia[] };

const ROUND_LABEL: Record<number, string> = {
  1: "scamper",
  2: "biomimética",
  3: "deslocamento",
  4: "analogias",
};

interface Props {
  moduleId: string;
}

export function ModuloConclusaoSprintIdeacao({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m11-sprint-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "sprint_ideacao",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m11-sprint-deliverable", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { ideias_aula11?: Record<string, Value> };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.ideias_aula11 ?? {};
  const value = pill ? map[pill.id] : undefined;
  const ideias = (value?.ideias ?? []).filter((i) => (i.texto ?? "").trim().length >= 3);

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || ideias.length === 0) return null;

  const perRound: Record<number, Ideia[]> = { 1: [], 2: [], 3: [], 4: [] };
  ideias.forEach((i) => {
    if (i.rodada && perRound[i.rodada]) perRound[i.rodada].push(i);
  });

  const ultimas = ideias.slice(-5).reverse();

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="sprint de ideação"
      className="mt-8 space-y-6"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          missão 11 cumprida
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          {ideias.length} ideias na mesa
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem você escolhe UMA — a que vale investir seu tempo. até lá, deixa descansar.
        </p>
      </header>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <article
            key={n}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4"
          >
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              rodada {n}
            </p>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/40 mb-2">
              {ROUND_LABEL[n]}
            </p>
            <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">
              {perRound[n].length}
            </p>
          </article>
        ))}
      </div>

      <section>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 mb-2">
          últimas 5 ideias
        </p>
        <ul className="space-y-1.5">
          {ultimas.map((i, idx) => (
            <li
              key={i.id ?? idx}
              className="rounded-xl border-2 border-perestroika-preto/10 bg-perestroika-bege px-3 py-2 flex items-start gap-2"
            >
              <span className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/45 pt-0.5 flex-shrink-0">
                r{i.rodada ?? "?"}
              </span>
              <p className="font-body text-sm text-perestroika-preto/85 leading-snug">
                {i.texto}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </motion.section>
  );
}
