import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Camera, Mic, Link2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Evidencia = {
  tipo: "observacao" | "entrevista" | "coleta";
  data?: string;
  local?: string;
  descricao?: string;
  quantidade?: string;
  foto?: { evidence_kind?: string; evidence_path?: string; evidence_name?: string };
  entrevistado?: string;
  audio?: { evidence_kind?: string; evidence_path?: string; evidence_name?: string };
  frase1?: string;
  frase2?: string;
  frase3?: string;
  link?: string;
  fonte?: string;
  data_fonte?: string;
  prova?: string;
};

type PillRow = {
  id: string;
  interaction_schema: { type?: string } | null;
};

interface Props {
  moduleId: string;
}

/**
 * celebração pós-conclusão da aula 4 (economia circular).
 * mostra as 3 evidências + síntese que o estudante entregou.
 */
export function ModuloConclusaoEvidencias({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const pillQuery = useQuery({
    queryKey: ["ecc-m4-caca-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async (): Promise<PillRow | null> => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "caca_evidencias",
      );
      return (found as PillRow) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m4-deliverable-conclusion", moduleId, user?.id],
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
        caca_evidencias?: Record<string, { evidencias?: Evidencia[]; sintese?: string }>;
      };
    },
  });

  const pill = pillQuery.data;
  const cacaMap = deliverableQuery.data?.caca_evidencias ?? {};
  const value = pill ? cacaMap[pill.id] : undefined;
  const evidencias = useMemo(
    () => (value?.evidencias ?? []).filter((e) => e && e.tipo),
    [value],
  );

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  if (!pill || evidencias.length === 0) return null;

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="evidências concluídas"
      className="mt-8 space-y-5"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
          exercício 4 cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          suas 3 evidências
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          você não tá mais achando, você tá sabendo. semana que vem a gente fecha a trilha 1 escolhendo
          o problema definitivo pras próximas 15 semanas, com base no que você descobriu hoje.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {evidencias.slice(0, 3).map((ev, i) => (
          <EvidenceCard key={i} idx={i} ev={ev} />
        ))}
      </div>

      {value?.sintese && value.sintese.trim().length > 0 && (
        <div className="rounded-2xl border-2 border-perestroika-preto/20 bg-perestroika-bege p-4 sm:p-5">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1.5">
            sua síntese
          </p>
          <p className="font-body text-sm text-perestroika-preto/85 whitespace-pre-wrap leading-relaxed">
            {value.sintese}
          </p>
        </div>
      )}
    </motion.section>
  );
}

function EvidenceCard({ idx, ev }: { idx: number; ev: Evidencia }) {
  const Icon = ev.tipo === "observacao" ? Camera : ev.tipo === "entrevista" ? Mic : Link2;
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2">
      <header className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-perestroika-preto/60">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>evidência {idx + 1}</span>
        <span>·</span>
        <span>{ev.tipo === "observacao" ? "observação" : ev.tipo}</span>
      </header>

      {ev.tipo === "observacao" && (
        <div className="space-y-1.5 font-body text-sm text-perestroika-preto/85">
          {(ev.data || ev.local) && (
            <p className="text-xs text-perestroika-preto/60">
              {[ev.data, ev.local].filter(Boolean).join(" · ")}
            </p>
          )}
          {ev.descricao && <p className="leading-snug">{ev.descricao}</p>}
          {ev.quantidade && (
            <p className="text-xs text-perestroika-preto/60">📏 {ev.quantidade}</p>
          )}
          {ev.foto?.evidence_name && (
            <p className="text-xs text-perestroika-preto/60 truncate">📷 {ev.foto.evidence_name}</p>
          )}
        </div>
      )}

      {ev.tipo === "entrevista" && (
        <div className="space-y-1.5 font-body text-sm text-perestroika-preto/85">
          {ev.entrevistado && (
            <p className="text-xs text-perestroika-preto/60">com: {ev.entrevistado}</p>
          )}
          {[ev.frase1, ev.frase2, ev.frase3]
            .filter((f) => f && f.trim())
            .map((f, i) => (
              <p key={i} className="italic leading-snug">
                “{f}”
              </p>
            ))}
          {ev.audio?.evidence_name && (
            <p className="text-xs text-perestroika-preto/60 truncate">🎙️ {ev.audio.evidence_name}</p>
          )}
        </div>
      )}

      {ev.tipo === "coleta" && (
        <div className="space-y-1.5 font-body text-sm text-perestroika-preto/85">
          {ev.fonte && (
            <p className="text-xs text-perestroika-preto/60">
              {ev.fonte}
              {ev.data_fonte ? ` · ${ev.data_fonte}` : ""}
            </p>
          )}
          {ev.prova && <p className="leading-snug">{ev.prova}</p>}
          {ev.link && (
            <a
              href={ev.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-perestroika-preto/70 hover:text-perestroika-preto underline"
            >
              abrir fonte <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
