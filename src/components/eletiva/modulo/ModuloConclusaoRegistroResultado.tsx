import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RegistroResultadoValue } from "@/components/eletiva/pills/PillRegistroResultado";

interface Props {
  moduleId: string;
}

const CRIT_LABEL: Record<string, string> = {
  atingiu: "critério atingido",
  parcial: "critério parcialmente atingido",
  nao_atingiu: "critério não atingido",
};

export function ModuloConclusaoRegistroResultado({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m17-registro-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "registro_resultado",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m17-registro-deliv", moduleId, user?.id],
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
        experimento_resultado_aula17?: Record<string, RegistroResultadoValue>;
      };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.experimento_resultado_aula17 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value) return null;

  const evidenciasCount = (value.evidencias ?? []).filter(
    (e) => (e.evidence_kind === "file" && e.evidence_path) || (e.evidence_kind === "link" && e.evidence_link),
  ).length;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 space-y-6"
      aria-label="registro do experimento"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          exercício cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          você tem dados reais
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem: o que fazer com eles.
        </p>
      </header>

      <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3">
        {value.criterio_resultado && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              resultado
            </p>
            <p className="font-display uppercase text-2xl leading-none text-perestroika-preto">
              {CRIT_LABEL[value.criterio_resultado] ?? value.criterio_resultado}
            </p>
          </div>
        )}
        {value.o_que_fez && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              o que você fez
            </p>
            <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
              {value.o_que_fez}
            </p>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <MicroCard label="quantidade / dados">{value.quantidade || "—"}</MicroCard>
          <MicroCard label="evidências enviadas">{evidenciasCount}</MicroCard>
          {value.obs_surpresa && <MicroCard label="mais me surpreendeu">{value.obs_surpresa}</MicroCard>}
          {value.obs_incomodou && <MicroCard label="mais me incomodou">{value.obs_incomodou}</MicroCard>}
          {value.frase_marcou && <MicroCard label="frase que marcou">"{value.frase_marcou}"</MicroCard>}
          {value.honestidade_atalho && (
            <MicroCard label="honestidade">
              {value.honestidade_atalho === "nao"
                ? "executei como planejado."
                : `tomei atalho: ${value.honestidade_qual ?? ""}`}
            </MicroCard>
          )}
        </div>
      </article>
    </motion.section>
  );
}

function MicroCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-perestroika-preto/15 bg-white p-3 space-y-1">
      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55">
        {label}
      </p>
      <p className="font-body text-xs text-perestroika-preto/85 leading-snug">{children}</p>
    </div>
  );
}
