import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Value = {
  principio1?: string;
  justificativa1?: string;
  exemplo1?: string;
  principio2?: string;
  justificativa2?: string;
  exemplo2?: string;
  rs_taticos?: string[];
  como_ajudam?: string;
};

const PRINCIPIO_LABEL: Record<string, string> = {
  eliminar: "eliminar desperdício desde o design",
  circular: "circular no valor mais alto",
  regenerar: "regenerar a natureza",
};

interface Props {
  moduleId: string;
}

export function ModuloConclusaoRegrasJogo({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m8-regras-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "regras_jogo",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m8-regras-deliverable", moduleId, user?.id],
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
        regras_jogo_aula8?: Record<string, Value>;
      };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.regras_jogo_aula8 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value?.principio1 || !value?.principio2) return null;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="regras do jogo definidas"
      className="mt-8 space-y-5"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          exercício cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          suas regras do jogo estão de pé
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem você define os impactos positivos concretos que sua solução vai gerar.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <PrincipioCard n={1} value={value.principio1} justificativa={value.justificativa1} exemplo={value.exemplo1} />
        <PrincipioCard n={2} value={value.principio2} justificativa={value.justificativa2} exemplo={value.exemplo2} />
      </div>

      {(value.rs_taticos ?? []).length > 0 && (
        <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-perestroika-preto/60" aria-hidden />
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
              R's táticos
            </p>
          </div>
          <p className="font-display text-xl leading-snug text-perestroika-preto mb-2">
            {(value.rs_taticos ?? []).join(" + ")}
          </p>
          {value.como_ajudam && (
            <p className="font-body text-sm text-perestroika-preto/75 leading-relaxed">
              {value.como_ajudam}
            </p>
          )}
        </article>
      )}
    </motion.section>
  );
}

function PrincipioCard({
  n,
  value,
  justificativa,
  exemplo,
}: {
  n: number;
  value?: string;
  justificativa?: string;
  exemplo?: string;
}) {
  return (
    <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
        princípio {n}
      </p>
      <p className="font-display text-lg leading-snug text-perestroika-preto mb-3">
        {PRINCIPIO_LABEL[value ?? ""] ?? value}
      </p>
      {justificativa && (
        <p className="font-body text-sm text-perestroika-preto/75 leading-relaxed mb-2">
          {justificativa}
        </p>
      )}
      {exemplo && (
        <p className="font-body text-sm text-perestroika-preto/60 italic leading-relaxed">
          exemplo: {exemplo}
        </p>
      )}
    </article>
  );
}
