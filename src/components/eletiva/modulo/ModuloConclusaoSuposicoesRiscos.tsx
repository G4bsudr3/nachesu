import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SuposicoesRiscosValue, RiscoItem } from "@/components/eletiva/pills/PillSuposicoesRiscos";

interface Props {
  moduleId: string;
}

function classify(r: RiscoItem) {
  if (!r.probabilidade || !r.impacto) return "vazio" as const;
  const impAlto = r.impacto === "alto" || r.impacto === "medio";
  const probAlta = r.probabilidade === "alta" || r.probabilidade === "media";
  if (probAlta && impAlto) return "acao" as const;
  if (!probAlta && impAlto) return "planoB" as const;
  if (probAlta && !impAlto) return "monitorar" as const;
  return "aceitar" as const;
}

const zonaLabel = {
  acao: "AÇÃO IMEDIATA",
  planoB: "plano B pronto",
  monitorar: "monitorar",
  aceitar: "aceitar",
  vazio: "—",
} as const;

export function ModuloConclusaoSuposicoesRiscos({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m15-supr-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "suposicoes_riscos",
      );
      return (found as { id: string } | undefined) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m15-supr-deliv", moduleId, user?.id],
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
        suposicoes_riscos_aula15?: Record<string, SuposicoesRiscosValue>;
      };
    },
  });

  const pill = pillQuery.data;
  const map = deliverableQuery.data?.suposicoes_riscos_aula15 ?? {};
  const value = pill ? map[pill.id] : undefined;

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value) return null;

  const sup = value.suposicoes ?? {};
  const riscos = value.riscos ?? [];
  const riscosCriticos = riscos.filter((r) => classify(r) === "acao").length;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 space-y-6"
      aria-label="mapa de suposições e riscos"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
          trilha 3 cumprida 🎯
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          você fechou a fase criar
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          ideia refinada, proposta de valor, modelo de negócio, suposições e riscos. trilha 4 começa semana que vem: testar e contar.
        </p>
      </header>

      <div className="grid gap-3">
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
          3 suposições críticas
        </p>
        {(["publico", "proposta", "modelo"] as const).map((k) => {
          const s = sup[k];
          if (!s?.descricao) return null;
          return (
            <article
              key={k}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2"
            >
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                {k === "publico" ? "sobre o público" : k === "proposta" ? "sobre a proposta" : "sobre o modelo"}
              </p>
              <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
                {s.descricao}
              </p>
              {s.se_falsa && (
                <p className="font-body text-xs text-perestroika-preto/70 leading-snug">
                  <span className="uppercase tracking-wider">se falsa · </span>
                  {s.se_falsa}
                </p>
              )}
              {s.como_testar && (
                <p className="font-body text-xs text-perestroika-preto/70 leading-snug">
                  <span className="uppercase tracking-wider">como testar · </span>
                  {s.como_testar}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            3 riscos mapeados
          </p>
          {riscosCriticos > 0 && (
            <span className="rounded-full border-2 border-perestroika-vermelho/50 bg-perestroika-vermelho/15 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-vermelho">
              {riscosCriticos} exige ação imediata
            </span>
          )}
        </div>
        <div className="grid gap-2">
          {riscos.map((r, i) => {
            const zona = classify(r);
            return (
              <article
                key={i}
                className="rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-body text-sm text-perestroika-preto/90">
                    <span className="font-display uppercase mr-2">risco {i + 1}</span>
                    {r.descricao || "—"}
                  </p>
                  <span className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/60">
                    {zonaLabel[zona]}
                  </span>
                </div>
                {r.mitigacao && (
                  <p className="font-body text-xs text-perestroika-preto/70 leading-snug">
                    <span className="uppercase tracking-wider">mitigação · </span>
                    {r.mitigacao}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
