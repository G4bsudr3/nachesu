import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Ator = { nome: string; descricao: string };
type MapaValue = Record<string, Ator[]>;

type PillRow = {
  id: string;
  interaction_schema: {
    type?: string;
    quadrantes?: { id: string; label: string; hint?: string; accent?: string }[];
  } | null;
};

interface Props {
  moduleId: string;
}

/**
 * celebração pós-conclusão da aula 3 (economia circular).
 * mostra o mapa de atores 2x2 preenchido pelo estudante e permite baixar como PNG.
 */
export function ModuloConclusaoMapaAtores({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const mapRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const pillQuery = useQuery({
    queryKey: ["ecc-m3-mapa-pill", moduleId],
    enabled: !!moduleId,
    queryFn: async (): Promise<PillRow | null> => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, interaction_schema")
        .eq("module_id", moduleId)
        .order("order_index");
      if (error) throw error;
      const found = (data ?? []).find(
        (p) => (p.interaction_schema as { type?: string } | null)?.type === "mapa_atores_2x2",
      );
      return (found as PillRow) ?? null;
    },
  });

  const deliverableQuery = useQuery({
    queryKey: ["ecc-m3-deliverable-conclusion", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as { mapa_atores_aula3?: Record<string, MapaValue> };
    },
  });

  if (pillQuery.isLoading || deliverableQuery.isLoading) return null;
  const pill = pillQuery.data;
  const quadrantes = pill?.interaction_schema?.quadrantes ?? [];
  if (!pill || quadrantes.length === 0) return null;

  const mapaMap = deliverableQuery.data?.mapa_atores_aula3 ?? {};
  const mapa = (mapaMap[pill.id] ?? {}) as MapaValue;

  const totalAtores = quadrantes.reduce((acc, q) => {
    const list = mapa[q.id] ?? [];
    return acc + list.filter((a) => a.nome?.trim() && a.descricao?.trim()).length;
  }, 0);
  if (totalAtores === 0) return null;

  const handleDownload = async () => {
    if (!mapRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(mapRef.current, {
        backgroundColor: "#f2e4d8",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = "mapa-de-atores.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[mapa-atores] falha ao exportar png", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-label="mapa de atores concluído"
      className="mt-8 space-y-5"
    >
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55 mb-1">
            exercício 3 cumprido
          </p>
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
            seu mapa de atores
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-xl">
            esses são os {totalAtores} atores que você mapeou no jogo do seu problema. leva esse mapa
            pra próxima aula, ele vira base pras suas ideias.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          {downloading ? "gerando…" : "baixar png"}
        </button>
      </header>

      <div
        ref={mapRef}
        className="rounded-3xl border-2 border-perestroika-preto/20 bg-perestroika-bege p-4 sm:p-6"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {quadrantes.map((q) => {
            const list = (mapa[q.id] ?? []).filter((a) => a.nome?.trim());
            const accent = q.accent ?? "#090909";
            return (
              <div
                key={q.id}
                className="rounded-2xl border-2 bg-perestroika-bege p-4 space-y-3"
                style={{ borderColor: `${accent}55` }}
              >
                <div>
                  <p
                    className="font-display uppercase leading-tight"
                    style={{ color: accent, fontSize: "clamp(18px, 2.6vw, 22px)" }}
                  >
                    {q.label}
                  </p>
                  {q.hint && (
                    <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mt-0.5">
                      {q.hint}
                    </p>
                  )}
                </div>
                {list.length === 0 ? (
                  <p className="font-body text-xs italic text-perestroika-preto/50">
                    sem atores nesse quadrante.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((ator, i) => (
                      <li key={i} className="rounded-xl bg-perestroika-preto/5 p-2.5">
                        <p className="font-body text-sm font-medium text-perestroika-preto leading-tight">
                          {ator.nome}
                        </p>
                        {ator.descricao && (
                          <p className="font-body text-xs text-perestroika-preto/70 mt-1 leading-snug">
                            {ator.descricao}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
