import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Value = {
  segmento?: string;
  canais?: string;
  receitas?: string[];
  custos?: string[];
  autoteste?: {
    opera_sem_principal?: string;
    custo_menor_receita?: string;
    parceiro_critico?: string;
    parceiro_nome?: string;
  };
};

interface Props {
  moduleId: string;
}

export function ModuloConclusaoBMC({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m14-bmc-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "bmc_simplificado",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m14-bmc-deliverable", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { bmc_aula14?: Record<string, Value> };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.bmc_aula14 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value) return null;

  const receitas = value.receitas ?? [];
  const custos = value.custos ?? [];
  const at = value.autoteste ?? {};
  const risco =
    at.opera_sem_principal === "nao" ||
    at.custo_menor_receita === "nao" ||
    at.parceiro_critico === "sim";

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="business model canvas"
      className="mt-8 space-y-6"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          exercício 14 cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          você tem modelo
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem: onde ele pode dar errado, e o que vale testar primeiro.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card label="segmento de clientes">{value.segmento || "—"}</Card>
        <Card label="canais">{value.canais || "—"}</Card>
        <Card label={`fontes de receita (${receitas.length})`} full>
          {receitas.length === 0 ? "—" : (
            <ul className="list-disc pl-4 space-y-1">
              {receitas.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </Card>
        <Card label={`estrutura de custos (${custos.length})`} full>
          {custos.length === 0 ? "—" : (
            <ul className="list-disc pl-4 space-y-1">
              {custos.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </Card>
      </div>

      <article
        className={`rounded-2xl border-2 p-4 sm:p-5 space-y-2 ${
          risco
            ? "border-perestroika-laranja/60 bg-perestroika-laranja/10"
            : "border-perestroika-preto/15 bg-perestroika-bege"
        }`}
      >
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
          autoteste de sustentabilidade
        </p>
        <ul className="font-body text-sm text-perestroika-preto/85 leading-snug space-y-1">
          <li>opera sem a fonte principal: <strong>{at.opera_sem_principal ?? "—"}</strong></li>
          <li>custo &lt; receita em 12 meses: <strong>{at.custo_menor_receita ?? "—"}</strong></li>
          <li>parceiro crítico único: <strong>{at.parceiro_critico ?? "—"}{at.parceiro_nome ? ` · ${at.parceiro_nome}` : ""}</strong></li>
        </ul>
        {risco && (
          <p className="font-body text-xs text-perestroika-preto/75">
            atenção: seu modelo tem pontos frágeis. reforce antes de testar com gente real.
          </p>
        )}
      </article>
    </motion.section>
  );
}

function Card({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <article
      className={`rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
        {label}
      </p>
      <div className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
        {children}
      </div>
    </article>
  );
}
