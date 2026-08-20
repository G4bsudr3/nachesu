import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanoExperimentoValue } from "@/components/eletiva/pills/PillPlanoExperimento";

interface Props {
  moduleId: string;
}

const METODO_LABEL: Record<string, string> = {
  entrevista: "entrevista de validação",
  prototipo: "protótipo de papel",
  landing: "landing page falsa",
  concierge: "MVP concierge",
  fakedoor: "fake door",
};

const DIM_LABEL: Record<string, string> = {
  publico: "sobre o público",
  proposta: "sobre a proposta de valor",
  modelo: "sobre o modelo de negócio",
};

export function ModuloConclusaoPlanoExperimento({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m16-plano-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "plano_experimento",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m16-plano-deliv", moduleId, user?.id],
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
        experimento_plano_aula16?: Record<string, PlanoExperimentoValue>;
      };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.experimento_plano_aula16 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value) return null;

  const cron = value.cronograma ?? {};

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 space-y-6"
      aria-label="plano de experimento"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
          exercício cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          plano na mão
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          próxima semana: execução. bora fazer contato com o mundo real.
        </p>
      </header>

      <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3">
        {value.suposicao_key && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              suposição a testar · {DIM_LABEL[value.suposicao_key] ?? value.suposicao_key}
            </p>
            <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
              {value.suposicao_texto || "—"}
            </p>
          </div>
        )}
        {value.metodo && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              método
            </p>
            <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
              {METODO_LABEL[value.metodo] ?? value.metodo}
            </p>
          </div>
        )}
        {value.o_que_medir && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              o que medir
            </p>
            <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
              {value.o_que_medir}
            </p>
          </div>
        )}
        {value.criterio_sucesso && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              critério de sucesso
            </p>
            <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
              {value.criterio_sucesso}
            </p>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <CronCard label="dia 1-3 · preparação">{cron.preparacao || "—"}</CronCard>
          <CronCard label="dia 4-8 · execução">{cron.execucao || "—"}</CronCard>
          <CronCard label="dia 9-10 · análise">{cron.analise || "—"}</CronCard>
        </div>
      </article>
    </motion.section>
  );
}

function CronCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-perestroika-preto/15 bg-white p-3 space-y-1">
      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55">
        {label}
      </p>
      <p className="font-body text-xs text-perestroika-preto/85 leading-snug">{children}</p>
    </div>
  );
}
