import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ListChecks, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { EvidenceUploader } from "./EvidenceUploader";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import type { RadarItem } from "./PillRadar";

type FluxoOpt = { label: string; value: string };

interface Props {
  /** itens consolidados do radar (vem de deliverable.content.items) */
  items: RadarItem[];
  /** dicionário de fluxos (label/value) declarado no interaction_schema da pílula radar */
  fluxos: FluxoOpt[];
  /** cor accent do módulo (duduo dentro da módulo 1) */
  accent: string;
  /** persiste mudanças quando aluno completa evidência faltante na tela final */
  save: (patch: DeliverableContent) => Promise<unknown>;
  /** rota pra voltar ao início (eletiva sebrae) */
  homeHref?: string;
}

const fluxoColors: Record<string, string> = {
  material: "#75BF9C",
  alimentacao: "#F2BC57",
  energia: "#F25E3D",
  agua: "#448FF2",
  mobilidade: "#9B6BC9",
  tecnologia: "#202124",
};

/**
 * RadarFinal — tela pós-conclusão da módulo 1.
 *
 * mostra o radar consolidado do aluno agrupado por fluxo, com cards bonitos
 * pra cada item: o que vi, onde, evidência (preview de foto/áudio/link).
 * se algum item ainda está sem evidência, libera o EvidenceUploader inline
 * pra completar — porque o fechamento da pílula só exige evidência nas
 * required, mas tela final convida o aluno a fechar tudo bonito.
 */
export function RadarFinal({ items, fluxos, accent, save, homeHref = "/app" }: Props) {
  const [localItems, setLocalItems] = useState<RadarItem[]>(items);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => setLocalItems(items), [items]);

  const status = useAutoSaveField({
    value: localItems,
    initial: items,
    save,
    field: "items",
  });

  // gera signed urls (1h) pras evidências em arquivo, pra preview/download
  useEffect(() => {
    const paths = localItems
      .map((it) => it.evidence_path)
      .filter((p): p is string => !!p);
    if (paths.length === 0) return;
    let cancelled = false;
    void supabase.storage
      .from("radar-evidences")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, string> = {};
        data.forEach((d, idx) => {
          if (d.signedUrl) map[paths[idx]] = d.signedUrl;
        });
        setSignedUrls(map);
      });
    return () => {
      cancelled = true;
    };
  }, [localItems]);

  const fluxoLabel = useMemo(() => {
    const map: Record<string, string> = {};
    fluxos.forEach((f) => (map[f.value] = f.label));
    return map;
  }, [fluxos]);

  const grouped = useMemo(() => {
    const map = new Map<string, RadarItem[]>();
    localItems
      .filter((it) => it.what.trim() && it.where.trim() && it.fluxo)
      .forEach((it) => {
        const arr = map.get(it.fluxo) ?? [];
        arr.push(it);
        map.set(it.fluxo, arr);
      });
    // ordena por contagem decrescente pra fluxos mais densos aparecerem primeiro
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [localItems]);

  const totalFilled = localItems.filter((it) => it.what.trim() && it.where.trim() && it.fluxo).length;
  const distinctFlows = grouped.length;
  const missingEvidence = localItems.filter(
    (it) => it.what.trim() && it.evidence_kind === "none" && !it.evidence_link && !it.evidence_path,
  ).length;

  const updateItem = (id: string, patch: Partial<RadarItem>) =>
    setLocalItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-8">
      {/* hero de celebração */}
      <header className="text-center space-y-4 pb-2">
        <div className="flex justify-center">
          <EletivaSymbol size={88} pose="celebrating" />
        </div>
        <p
          className="font-body text-[11px] uppercase tracking-[0.25em]"
          style={{ color: accent }}
        >
          módulo 1 · concluída
        </p>
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-[0.9]">
          exercício cumprido
        </h1>
        <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-xl mx-auto">
          tu treinou o olho. saiu com {totalFilled} {totalFilled === 1 ? "vazamento mapeado" : "vazamentos mapeados"}{" "}
          em {distinctFlows} {distinctFlows === 1 ? "fluxo diferente" : "fluxos diferentes"}.
          isso é o começo do teu radar de detetive regenerativo.
        </p>
      </header>

      {/* selo de stats */}
      <section
        aria-label="resumo do radar"
        className="grid grid-cols-3 gap-3 rounded-2xl border-2 p-4 sm:p-5"
        style={{ borderColor: accent, backgroundColor: `${accent}10` }}
      >
        <div className="text-center">
          <p className="font-display text-3xl sm:text-4xl leading-none" style={{ color: accent }}>
            {totalFilled}
          </p>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mt-1">
            itens
          </p>
        </div>
        <div className="text-center border-x-2" style={{ borderColor: `${accent}30` }}>
          <p className="font-display text-3xl sm:text-4xl leading-none" style={{ color: accent }}>
            {distinctFlows}
          </p>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mt-1">
            fluxos
          </p>
        </div>
        <div className="text-center">
          <p className="font-display text-3xl sm:text-4xl leading-none" style={{ color: accent }}>
            {totalFilled - missingEvidence}/{totalFilled}
          </p>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mt-1">
            com evidência
          </p>
        </div>
      </section>

      {/* convite pra completar evidências faltantes */}
      {missingEvidence > 0 && (
        <div
          className="rounded-2xl border-2 border-dashed p-4 flex items-start gap-3"
          style={{ borderColor: accent }}
        >
          <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: accent }} aria-hidden="true" />
          <div className="flex-1">
            <p className="font-body text-sm font-medium text-perestroika-preto">
              {missingEvidence} {missingEvidence === 1 ? "item ainda sem evidência" : "itens ainda sem evidência"}
            </p>
            <p className="font-body text-xs text-perestroika-preto/65 mt-0.5">
              fica de bônus: foto, áudio ou link reforça teu caso quando o pessoal pedir.
            </p>
          </div>
          <SaveIndicator status={status} />
        </div>
      )}

      {/* radar agrupado por fluxo */}
      <section aria-label="meu radar" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display uppercase text-2xl inline-flex items-center gap-2">
            <ListChecks className="h-5 w-5" aria-hidden="true" /> meu radar
          </h2>
          {missingEvidence === 0 && <SaveIndicator status={status} />}
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/20 p-6 text-center">
            <p className="font-body text-sm text-perestroika-preto/65">
              não encontrei nenhum item completo no teu radar. volta no passo 3 pra preencher.
            </p>
          </div>
        ) : (
          grouped.map(([fluxoValue, fluxoItems]) => {
            const color = fluxoColors[fluxoValue] ?? accent;
            return (
              <div key={fluxoValue} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <h3 className="font-display uppercase text-lg">
                    {fluxoLabel[fluxoValue] ?? fluxoValue}
                  </h3>
                  <span className="font-body text-xs text-perestroika-preto/55">
                    · {fluxoItems.length} {fluxoItems.length === 1 ? "item" : "itens"}
                  </span>
                </div>

                <ul className="grid sm:grid-cols-2 gap-3">
                  {fluxoItems.map((item) => {
                    const previewUrl = item.evidence_path ? signedUrls[item.evidence_path] : null;
                    const isImage =
                      previewUrl && item.evidence_name?.match(/\.(jpe?g|png|webp|gif)$/i);
                    const isAudio =
                      previewUrl && item.evidence_name?.match(/\.(mp3|m4a|ogg|wav)$/i);
                    const hasEvidence =
                      item.evidence_kind !== "none" && (item.evidence_link || item.evidence_path);
                    return (
                      <li
                        key={item.id}
                        className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege overflow-hidden"
                      >
                        {/* preview da evidência se for imagem */}
                        {isImage && previewUrl && (
                          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={previewUrl}
                              alt={`evidência: ${item.what}`}
                              className="w-full aspect-video object-cover"
                              loading="lazy"
                            />
                          </a>
                        )}
                        {isAudio && previewUrl && (
                          <audio controls src={previewUrl} className="w-full" preload="none">
                            <track kind="captions" />
                          </audio>
                        )}

                        <div className="p-4 space-y-2">
                          <p className="font-body text-sm text-perestroika-preto leading-snug">
                            {item.what}
                          </p>
                          <p className="inline-flex items-center gap-1 font-body text-xs text-perestroika-preto/60">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {item.where}
                          </p>

                          {/* uploader inline pra quem ainda não tem evidência */}
                          {!hasEvidence ? (
                            <div className="pt-1">
                              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1.5">
                                falta evidência
                              </p>
                              <EvidenceUploader
                                itemId={item.id}
                                value={{
                                  evidence_kind: item.evidence_kind,
                                  evidence_link: item.evidence_link,
                                  evidence_path: item.evidence_path,
                                  evidence_name: item.evidence_name,
                                }}
                                onChange={(next) => updateItem(item.id, next)}
                                accent={accent}
                                compact
                              />
                            </div>
                          ) : (
                            !isImage &&
                            !isAudio && (
                              <div className="pt-1">
                                <EvidenceUploader
                                  itemId={item.id}
                                  value={{
                                    evidence_kind: item.evidence_kind,
                                    evidence_link: item.evidence_link,
                                    evidence_path: item.evidence_path,
                                    evidence_name: item.evidence_name,
                                  }}
                                  onChange={(next) => updateItem(item.id, next)}
                                  accent={accent}
                                  previewUrl={previewUrl}
                                  compact
                                />
                              </div>
                            )
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>

      {/* CTAs finais */}
      <footer className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <Link
          to={homeHref}
          className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto px-5 py-2.5 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> voltar pro início
        </Link>
        <a
          href="#meu-radar"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm uppercase tracking-wide text-perestroika-bege hover:scale-105 active:scale-95 transition-transform"
          style={{ backgroundColor: accent }}
        >
          ver minha lista de novo <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
