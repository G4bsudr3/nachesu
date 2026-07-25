import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Users, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Linha = { estado_atual?: string; estado_desejado?: string; metrica?: string };
type Value = { planeta?: Linha; pessoas?: Linha; prosperidade?: Linha };

const DIMENSOES: { key: keyof Value; titulo: string; Icon: typeof Leaf }[] = [
  { key: "planeta", titulo: "planeta", Icon: Leaf },
  { key: "pessoas", titulo: "pessoas", Icon: Users },
  { key: "prosperidade", titulo: "prosperidade", Icon: Coins },
];

interface Props {
  moduleId: string;
}

export function ModuloConclusaoImpactos({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m9-impactos-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "impactos_3p",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m9-impactos-deliverable", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { impactos_aula9?: Record<string, Value> };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.impactos_aula9 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value?.planeta?.metrica) return null;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="impactos definidos"
      className="mt-8 space-y-5"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          missão 9 cumprida
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          seu projeto tem impacto concreto, com métrica
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem: quem precisa estar do seu lado pra isso acontecer.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {DIMENSOES.map(({ key, titulo, Icon }) => {
          const linha = value[key];
          if (!linha?.metrica) return null;
          return (
            <article
              key={key}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5 text-perestroika-preto/60" aria-hidden />
                <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                  {titulo}
                </p>
              </div>
              <p className="font-display text-lg leading-snug text-perestroika-preto mb-2">
                {linha.estado_desejado}
              </p>
              <p className="font-body text-sm text-perestroika-preto/75 leading-relaxed">
                <span className="font-semibold">métrica:</span> {linha.metrica}
              </p>
              {linha.estado_atual && (
                <p className="font-body text-xs text-perestroika-preto/55 italic leading-relaxed mt-2">
                  hoje: {linha.estado_atual}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </motion.section>
  );
}
