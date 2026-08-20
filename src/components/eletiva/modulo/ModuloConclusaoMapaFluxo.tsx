import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Droplet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type MapaFluxoValue = {
  entrada?: string;
  transformacao?: string;
  saida?: string;
  vazamentos?: string[];
  imagem?: { evidence_kind?: string; evidence_name?: string };
};

type PillRow = { id: string; interaction_schema: { type?: string } | null };

interface Props {
  moduleId: string;
}

/**
 * celebração pós-conclusão da módulo 6 (economia circular).
 * mostra o esqueleto do sistema desenhado pelo estudante.
 */
export function ModuloConclusaoMapaFluxo({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m6-mapa-fluxo-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async (): Promise<PillRow | null> => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "mapa_fluxo",
      );
      return (found as PillRow) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m6-deliverable-conclusion", moduleId, user?.id],
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
        mapa_fluxo_aula6?: Record<string, MapaFluxoValue>;
      };
    },
  });

  const pill = pillQuery.data;
  const mapa = deliverableQuery.data?.mapa_fluxo_aula6 ?? {};
  const value = pill ? mapa[pill.id] : undefined;
  const vazamentos = useMemo(
    () => (value?.vazamentos ?? []).filter((v) => (v ?? "").trim().length > 0),
    [value],
  );

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || !value) return null;

  const temTexto = !!(value.entrada || value.transformacao || value.saida);
  const temImagem = value.imagem?.evidence_kind === "file" || value.imagem?.evidence_kind === "link";

  if (!temTexto && !temImagem) return null;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="mapa de fluxo entregue"
      className="mt-8 space-y-5"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          exercício cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          o esqueleto do seu sistema
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          você desenhou o fluxo atual do seu problema. semana que vem a gente transforma cada vazamento
          em oportunidade.
        </p>
      </header>

      {temTexto && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <BlocoResumo label="ENTRADA" text={value.entrada} arrow />
            <BlocoResumo label="TRANSFORMAÇÃO" text={value.transformacao} arrow />
            <BlocoResumo label="SAÍDA" text={value.saida} />
          </div>

          {vazamentos.length > 0 && (
            <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5">
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-2">
                vazamentos identificados · {vazamentos.length}
              </p>
              <ul className="space-y-1.5">
                {vazamentos.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 font-body text-sm text-perestroika-preto/85">
                    <Droplet className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-perestroika-preto/50" aria-hidden />
                    <span className="leading-snug">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {temImagem && (
        <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 flex items-center gap-3">
          <ArrowRight className="h-4 w-4 text-perestroika-preto/50" aria-hidden />
          <p className="font-body text-sm text-perestroika-preto/75">
            você enviou uma imagem do seu mapa
            {value.imagem?.evidence_name ? `: ${value.imagem.evidence_name}` : "."}
          </p>
        </div>
      )}
    </motion.section>
  );
}

function BlocoResumo({ label, text, arrow }: { label: string; text?: string; arrow?: boolean }) {
  return (
    <div className="relative rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4">
      <p className="font-display text-xs uppercase tracking-[0.2em] text-perestroika-preto/70 mb-1">
        {label}
      </p>
      <p className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
        {text ?? "—"}
      </p>
      {arrow && (
        <ArrowRight
          className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-perestroika-preto/60"
          aria-hidden
        />
      )}
    </div>
  );
}
