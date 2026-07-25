import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Stakeholder = {
  id?: string;
  categoria?: string;
  nome?: string;
  quadrante?: "aa" | "ab" | "ba" | "bb";
};

type Value = { stakeholders?: Stakeholder[] };

const QUADRANTES: { id: "aa" | "ab" | "ba" | "bb"; label: string; hint: string }[] = [
  { id: "aa", label: "alto poder · alto interesse", hint: "engajar como aliado" },
  { id: "ab", label: "alto poder · baixo interesse", hint: "monitorar de perto" },
  { id: "ba", label: "baixo poder · alto interesse", hint: "manter satisfeito" },
  { id: "bb", label: "baixo poder · baixo interesse", hint: "informar quando precisar" },
];

const CAT_LABEL: Record<string, string> = {
  usuarios: "usuários",
  influenciadores: "influenciadores",
  parceiros: "parceiros potenciais",
  oponentes: "oponentes",
};

interface Props {
  moduleId: string;
}

export function ModuloConclusaoStakeholders({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m10-stake-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "stakeholders_matriz",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m10-stake-deliverable", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { stakeholders_aula10?: Record<string, Value> };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.stakeholders_aula10 ?? {};
  const value = pill ? map[pill.id] : undefined;
  const stakeholders = (value?.stakeholders ?? []).filter((s) => (s.nome ?? "").trim().length >= 2);

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || stakeholders.length === 0) return null;

  const byCat = new Map<string, Stakeholder[]>();
  stakeholders.forEach((s) => {
    const c = s.categoria ?? "outros";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(s);
  });

  const byQuad = new Map<string, Stakeholder[]>();
  QUADRANTES.forEach((q) => byQuad.set(q.id, []));
  stakeholders.forEach((s) => {
    if (s.quadrante && byQuad.has(s.quadrante)) byQuad.get(s.quadrante)!.push(s);
  });

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="mapa de stakeholders"
      className="mt-8 space-y-6"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          trilha 2 cumprida
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          seus aliados — pelo nome
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          {stakeholders.length} stakeholders mapeados. semana que vem começa a trilha 3: criar.
        </p>
      </header>

      {/* por categoria */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from(byCat.entries()).map(([cat, list]) => (
          <article
            key={cat}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4"
          >
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
              {CAT_LABEL[cat] ?? cat}
            </p>
            <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums mb-2">
              {list.length}
            </p>
            <ul className="space-y-0.5">
              {list.slice(0, 4).map((s, i) => (
                <li key={i} className="font-body text-xs text-perestroika-preto/75 truncate">
                  · {s.nome}
                </li>
              ))}
              {list.length > 4 && (
                <li className="font-body text-[11px] text-perestroika-preto/50 italic">
                  +{list.length - 4} outros
                </li>
              )}
            </ul>
          </article>
        ))}
      </div>

      {/* matriz 2x2 */}
      <section>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 mb-2">
          matriz poder × interesse
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUADRANTES.map((q) => {
            const list = byQuad.get(q.id) ?? [];
            return (
              <article
                key={q.id}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2 min-h-[110px]"
              >
                <div>
                  <p className="font-display uppercase text-sm tracking-[0.12em] text-perestroika-preto">
                    {q.label}
                  </p>
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                    {q.hint}
                  </p>
                </div>
                {list.length === 0 ? (
                  <p className="font-body text-xs text-perestroika-preto/45 italic">
                    nenhum stakeholder aqui
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1">
                    {list.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-full bg-perestroika-preto/8 px-2 py-0.5 font-body text-xs text-perestroika-preto"
                      >
                        {s.nome}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </motion.section>
  );
}
