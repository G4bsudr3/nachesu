import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, Copy, Download, ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

/**
 * pílula AULA 20 — Parte C: mini-dossiê digital.
 * puxa artefatos das aulas 4, 6, 9, 10, 15, 17, 18, 20 e mostra grid.
 * link permanente: /dossie/:user_id
 */

export type MiniDossieValue = {
  gerado_em?: string;
  publico?: boolean;
};

type Schema = {
  type?: "mini_dossie";
  aula4_module_id?: string;
  aula6_module_id?: string;
  aula9_module_id?: string;
  aula10_module_id?: string;
  aula15_module_id?: string;
  aula17_module_id?: string;
  aula18_module_id?: string;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: MiniDossieValue;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const BLOCOS_DOSSIE = [
  { key: "aula4_module_id", n: 1, titulo: "problema local + 3 evidências", origem: "aula 4" },
  { key: "aula10_module_id", n: 2, titulo: "personas / stakeholders", origem: "aula 10" },
  { key: "aula6_module_id", n: 3, titulo: "mapa de fluxo circular", origem: "aula 6" },
  { key: "aula18_module_id", n: 4, titulo: "proposta de valor v2", origem: "aula 18" },
  { key: "aula18_module_id", n: 5, titulo: "modelo de negócio v2", origem: "aula 18" },
  { key: "aula9_module_id", n: 6, titulo: "impactos regenerativos", origem: "aula 9" },
  { key: "aula15_module_id", n: 7, titulo: "3 riscos + 3 suposições", origem: "aula 15" },
  { key: "aula17_module_id", n: 8, titulo: "experimento executado", origem: "aula 17" },
  { key: "_local", n: 9, titulo: "pitch em vídeo", origem: "hoje" },
  { key: "_local", n: 10, titulo: "carta de encerramento", origem: "hoje" },
] as const;

function useArtefatosStatus(schema: Schema) {
  const { user } = useAuth();
  const ids = [
    schema.aula4_module_id, schema.aula6_module_id, schema.aula9_module_id,
    schema.aula10_module_id, schema.aula15_module_id, schema.aula17_module_id, schema.aula18_module_id,
  ].filter(Boolean) as string[];

  const q = useQuery({
    queryKey: ["dossie-artefatos", ids, user?.id],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("module_id, content, submitted_at")
        .in("module_id", ids)
        .eq("user_id", user!.id);
      const map = new Map<string, boolean>();
      (data ?? []).forEach((r) => {
        const c = (r.content ?? {}) as Record<string, unknown>;
        const hasContent = Object.values(c).some((v) => v && (typeof v !== "object" || Object.keys(v as object).length > 0));
        map.set(r.module_id, hasContent);
      });
      return map;
    },
    staleTime: 30_000,
  });
  return q.data ?? new Map<string, boolean>();
}

export function PillMiniDossie({ pillId, schema, accent, initial, save, onComplete, isCompleted, isCompleting }: Props) {
  const { user } = useAuth();
  const artefatos = useArtefatosStatus(schema);
  const [value, setValue] = useState<MiniDossieValue>(() => ({ publico: true, ...initial }));
  const [copiado, setCopiado] = useState(false);

  const status = useAutoSaveField({
    value: { [pillId]: value },
    initial: { [pillId]: initial },
    save,
    field: "mini_dossie",
  });

  const dossieUrl = user ? `${window.location.origin}/dossie/${user.id}` : "";

  const totalPresentes = useMemo(
    () => BLOCOS_DOSSIE.filter((b) => {
      if (b.key === "_local") return true; // gerado hoje
      const modId = schema[b.key as keyof Schema] as string | undefined;
      return modId ? artefatos.get(modId) : false;
    }).length,
    [artefatos, schema]
  );

  async function copiarLink() {
    if (!dossieUrl) return;
    try {
      await navigator.clipboard.writeText(dossieUrl);
      setCopiado(true);
      toast.success("link copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("não deu pra copiar. seleciona e copia manual.");
    }
  }

  function gerar() {
    setValue((v) => ({ ...v, gerado_em: new Date().toISOString(), publico: true }));
    toast.success("mini-dossiê gerado.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}44` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display uppercase text-2xl leading-none tracking-wide text-perestroika-preto">
              seu mini-dossiê
            </h3>
            <p className="font-body text-sm text-perestroika-preto/70 mt-1">
              todo o trabalho das 20 semanas em uma página. você leva pra vida.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-body text-xs text-perestroika-preto border border-perestroika-preto/15">
            <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden />
            {totalPresentes}/10 elementos
          </span>
        </div>
      </section>

      {/* GRID dos 10 elementos */}
      <div className="grid gap-2 sm:grid-cols-2">
        {BLOCOS_DOSSIE.map((b) => {
          const modId = b.key === "_local" ? null : (schema[b.key as keyof Schema] as string | undefined);
          const preenchido = b.key === "_local" ? true : (modId ? artefatos.get(modId) ?? false : false);
          return (
            <article
              key={b.n}
              className="rounded-xl border-2 bg-white p-3 flex items-center gap-3"
              style={{ borderColor: preenchido ? `${accent}55` : "rgba(9,9,9,0.12)" }}
            >
              <div
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display text-sm"
                style={{ backgroundColor: preenchido ? accent : "rgba(9,9,9,0.08)", color: preenchido ? "#f2e4d8" : "rgba(9,9,9,0.4)" }}
              >
                {String(b.n).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-perestroika-preto leading-snug">{b.titulo}</p>
                <p className="font-body text-[11px] text-perestroika-preto/50">
                  {b.origem} · {preenchido ? "pronto" : "não preenchido"}
                </p>
              </div>
              {preenchido && <Check className="h-4 w-4 flex-shrink-0" style={{ color: accent }} aria-hidden />}
            </article>
          );
        })}
      </div>

      {/* Ações: gerar + baixar + compartilhar + certificado */}
      <section className="space-y-3">
        {!value.gerado_em && (
          <button
            type="button"
            onClick={gerar}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-display uppercase text-base text-perestroika-bege hover:-translate-y-0.5 transition-transform"
            style={{ backgroundColor: accent }}
          >
            <FileText className="h-5 w-5" aria-hidden /> gerar meu mini-dossiê
          </button>
        )}

        {value.gerado_em && dossieUrl && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <a
                href={dossieUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 font-display uppercase text-sm text-perestroika-bege hover:-translate-y-0.5 transition-transform"
                style={{ backgroundColor: accent }}
              >
                <ExternalLink className="h-4 w-4" aria-hidden /> abrir dossiê
              </a>
              <a
                href={`${dossieUrl}?print=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-perestroika-preto/20 px-4 py-2.5 font-body text-sm text-perestroika-preto hover:border-perestroika-preto/50"
              >
                <Download className="h-4 w-4" aria-hidden /> baixar pdf
              </a>
              <button
                type="button"
                onClick={copiarLink}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-perestroika-preto/20 px-4 py-2.5 font-body text-sm text-perestroika-preto hover:border-perestroika-preto/50"
              >
                {copiado ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copiado ? "copiado" : "copiar link"}
              </button>
            </div>

            <a
              href={dossieUrl + "?certificado=1"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-perestroika-preto/20 px-4 py-2 font-body text-sm text-perestroika-preto hover:border-perestroika-preto/50"
            >
              <Award className="h-4 w-4" aria-hidden /> ver certificado
            </a>

            <p className="font-body text-[11px] text-perestroika-preto/55 text-center">
              gerado em {new Date(value.gerado_em).toLocaleDateString("pt-BR")} · link permanente
            </p>
          </>
        )}
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-perestroika-preto/10">
        <SaveIndicator status={status} />
        <button
          type="button"
          onClick={() => !isCompleted && value.gerado_em && onComplete()}
          disabled={!value.gerado_em || isCompleted || isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display uppercase text-sm text-perestroika-bege transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{ backgroundColor: isCompleted ? "#090909" : accent }}
        >
          {isCompleted ? <><Check className="h-4 w-4" aria-hidden /> concluído</> : <>concluir eletiva</>}
        </button>
      </div>
    </div>
  );
}
