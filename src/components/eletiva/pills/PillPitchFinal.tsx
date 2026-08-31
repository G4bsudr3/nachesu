import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Circle, ExternalLink, Link as LinkIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import type { PitchRoteiroValue } from "./PillPitchRoteiro";


/**
 * pílula da MÓDULO 20 — PBL parte 1 + 2:
 * refina o roteiro do pitch (puxa do módulo 19) e grava versão final (90s-4min, máx 3 tentativas)
 */

export type PitchFinalValue = {
  hook?: string;
  problema?: string;
  solucao?: string;
  regenera?: string;
  modelo?: string;
  chamada?: string;
  roteiro_pronto?: boolean;
  video_url?: string | null;
  video_path?: string | null;
  video_name?: string | null;
  video_duracao_s?: number | null;
  tentativas?: number;
  confirmada_final?: boolean;
};

type Schema = {
  type?: "pitch_final";
  aula19_module_id?: string;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PitchFinalValue;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const BLOCOS: Array<{ key: keyof PitchFinalValue; numero: number; titulo: string; duracao: string; maxPalavras: number }> = [
  { key: "hook", numero: 1, titulo: "HOOK", duracao: "15-20s", maxPalavras: 40 },
  { key: "problema", numero: 2, titulo: "PROBLEMA + EVIDÊNCIA", duracao: "30-40s", maxPalavras: 70 },
  { key: "solucao", numero: 3, titulo: "SOLUÇÃO", duracao: "30-40s", maxPalavras: 70 },
  { key: "regenera", numero: 4, titulo: "COMO REGENERA", duracao: "20-30s", maxPalavras: 50 },
  { key: "modelo", numero: 5, titulo: "MODELO", duracao: "20-30s", maxPalavras: 50 },
  { key: "chamada", numero: 6, titulo: "CHAMADA", duracao: "10-15s", maxPalavras: 30 },
];

const BUCKET = "radar-evidences";
const MAX_MB = 500;
const MIN_DUR_S = 90;
const MAX_DUR_S = 240;
const MAX_REC_S = 260;
const MAX_TENTATIVAS = 3;

function countWords(s: string) {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * mede a duração de um arquivo de vídeo no próprio navegador.
 * devolve null quando o navegador não consegue ler os metadados
 * (formato exótico, mp4 fragmentado do celular, etc) — nesse caso a entrega
 * segue permitida, só com aviso leve.
 */
function readVideoDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const el = document.createElement("video");
      let done = false;
      const finish = (v: number | null) => {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        el.removeAttribute("src");
        resolve(v);
      };
      const tryRead = () => {
        const d = el.duration;
        if (Number.isFinite(d) && d > 0) {
          finish(Math.round(d));
          return true;
        }
        return false;
      };
      el.preload = "metadata";
      el.muted = true;
      el.playsInline = true;
      el.onloadedmetadata = () => {
        if (tryRead()) return;
        // webm/mov gravado no celular às vezes vem com duration = Infinity:
        // forçar um seek pro fim faz o navegador recalcular
        el.currentTime = 1e6;
      };
      el.ondurationchange = () => { tryRead(); };
      el.onloadeddata = () => { tryRead(); };
      el.onseeked = () => { tryRead(); };
      el.onerror = () => finish(null);
      setTimeout(() => finish(null), 12000);
      el.src = url;
    } catch {
      resolve(null);
    }
  });
}



function useAula19Pull(schema: Schema) {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["pitch-final-pull", schema.aula19_module_id, user?.id],
    enabled: !!user && !!schema.aula19_module_id,
    queryFn: async (): Promise<{ roteiro: PitchRoteiroValue | null; take: PitchRoteiroValue | null }> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", schema.aula19_module_id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const content = (data?.content ?? {}) as { pitch_roteiro?: Record<string, PitchRoteiroValue> };
      const first = content.pitch_roteiro ? Object.values(content.pitch_roteiro)[0] : null;
      return { roteiro: first ?? null, take: first ?? null };
    },
    staleTime: 60_000,
  });
  return q.data ?? { roteiro: null, take: null };
}

export function PillPitchFinal({ pillId, title, schema, accent, initial, save, onComplete, isCompleted, isCompleting }: Props) {
  const { user } = useAuth();
  const pull = useAula19Pull(schema);

  const [value, setValue] = useState<PitchFinalValue>(() => {
    // se ainda não editou, começa com o roteiro do módulo 19 (rascunho)
    const seed: PitchFinalValue = { tentativas: 0, ...initial };
    if (pull.roteiro && !initial.hook && !initial.problema) {
      seed.hook = pull.roteiro.hook ?? "";
      seed.problema = pull.roteiro.problema ?? "";
      seed.solucao = pull.roteiro.solucao ?? "";
      seed.regenera = pull.roteiro.regenera ?? "";
      seed.modelo = pull.roteiro.modelo ?? "";
      seed.chamada = pull.roteiro.chamada ?? "";
    }
    return seed;
  });

  useEffect(() => {
    if (pull.roteiro && !value.hook && !value.problema) {
      setValue((v) => ({
        ...v,
        hook: pull.roteiro?.hook ?? "",
        problema: pull.roteiro?.problema ?? "",
        solucao: pull.roteiro?.solucao ?? "",
        regenera: pull.roteiro?.regenera ?? "",
        modelo: pull.roteiro?.modelo ?? "",
        chamada: pull.roteiro?.chamada ?? "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pull.roteiro?.hook]);

  const status = useAutoSaveField({ value: { [pillId]: value }, initial: { [pillId]: initial }, save, field: "pitch_final" });

  const blocosOk = useMemo(
    () => BLOCOS.every((b) => {
      const v = (value[b.key] as string | undefined) ?? "";
      const words = countWords(v);
      return words > 0 && words <= b.maxPalavras;
    }),
    [value]
  );

  // duração não medida (o navegador não leu os metadados do arquivo) não bloqueia:
  // o estudante confirma no olho. só bloqueia quando a medição existe e está fora da faixa.
  const durationUnknown = !value.video_duracao_s;
  const durationOk =
    durationUnknown ||
    (value.video_duracao_s! >= MIN_DUR_S && value.video_duracao_s! <= MAX_DUR_S);
  const ready = blocosOk && !!value.roteiro_pronto && !!value.video_url && !!value.confirmada_final && durationOk;

  const previousTake = pull.take?.take_url ?? null;

  function updateBloco(key: keyof PitchFinalValue, v: string) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  return (
    <div className="space-y-6">
      {/* PARTE 1 — Refinar roteiro */}
      <section className="space-y-3">
        <SectionHeader n={1} title="refinar o roteiro" hint="side-by-side com o take do módulo 19" />

        {previousTake && (
          <div className="rounded-2xl border-2 overflow-hidden bg-black" style={{ borderColor: `${accent}55` }}>
            <video src={previousTake} controls className="w-full aspect-video bg-black" />
            <p className="px-3 py-1.5 font-body text-[11px] text-perestroika-preto/70 bg-perestroika-bege">
              seu primeiro take do módulo 19 — assiste e corta o que sobra.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {BLOCOS.map((b) => {
            const v = (value[b.key] as string | undefined) ?? "";
            const words = countWords(v);
            const dentro = words > 0 && words <= b.maxPalavras;
            return (
              <div key={b.key} className="rounded-xl border-2 border-perestroika-preto/15 bg-white p-3">
                <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-wrap">
                  <p className="font-display uppercase text-sm tracking-wide text-perestroika-preto">
                    <span className="text-perestroika-preto/60 mr-1">{b.numero}.</span>{b.titulo}
                    <span className="ml-2 font-body text-[10px] text-perestroika-preto/50">{b.duracao}</span>
                  </p>
                  <span className={`font-body text-[10px] uppercase tracking-wider ${dentro ? "text-perestroika-preto/60" : "text-[#fd4644]"}`}>
                    {words}/{b.maxPalavras} palavras
                  </span>
                </div>
                <textarea
                  value={v}
                  onChange={(e) => updateBloco(b.key, e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-perestroika-preto/15 bg-white px-2 py-1.5 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
                />
              </div>
            );
          })}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value.roteiro_pronto}
            onChange={(e) => setValue((v) => ({ ...v, roteiro_pronto: e.target.checked }))}
            className="h-4 w-4 accent-[currentColor]"
            style={{ accentColor: accent }}
          />
          <span className="font-body text-sm text-perestroika-preto">roteiro pronto pra gravar. testei em voz alta.</span>
        </label>
      </section>

      {/* PARTE 2 — Enviar link do vídeo final */}
      {value.roteiro_pronto && (
        <section className="space-y-3">
          <SectionHeader n={2} title="enviar a versão final" hint="90s a 4min · link público do vídeo" />

          <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-3">
            <p className="font-body text-xs text-perestroika-preto/75 leading-relaxed">
              grava do jeito que preferir (celular na horizontal, webcam, o que tiver). depois sobe pro seu drive, youtube não listado ou onedrive, deixa o link público pra quem tem o endereço e cola aqui embaixo.
            </p>
          </div>

          <VideoLinkFinal accent={accent} value={value} onChange={setValue} />

          {value.video_url && (
            <>
              {!durationOk && (
                <p className="font-body text-[12px] text-[#fd4644] flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
                  duração {value.video_duracao_s}s. o ideal é entre 1min30 e 4min. regrava.
                </p>
              )}

              <label className={`flex items-center gap-2 cursor-pointer ${!durationOk ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  checked={!!value.confirmada_final}
                  onChange={(e) => setValue((v) => ({ ...v, confirmada_final: e.target.checked }))}
                  className="h-4 w-4"
                  style={{ accentColor: accent }}
                />
                <span className="font-body text-sm text-perestroika-preto">testei o link numa aba anônima, abre pra qualquer pessoa. essa é a versão final.</span>
              </label>
            </>
          )}
        </section>
      )}


      {/* Status + CTA */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-perestroika-preto/15">
        <SaveIndicator status={status} />
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip ok={blocosOk} label="roteiro refinado" accent={accent} />
          <StatusChip ok={!!value.roteiro_pronto} label="pronto pra gravar" accent={accent} />
          <StatusChip ok={!!value.video_url && durationOk} label="vídeo final" accent={accent} />
          <StatusChip ok={!!value.confirmada_final} label="confirmado" accent={accent} />
        </div>
        <button
          type="button"
          onClick={() => !isCompleted && ready && onComplete()}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display uppercase text-sm text-perestroika-bege transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{ backgroundColor: isCompleted ? "#090909" : accent }}
        >
          {isCompleted ? <><Check className="h-4 w-4" aria-hidden /> entregue</> : <>entregar pitch final <ArrowRight className="h-4 w-4" aria-hidden /></>}
        </button>
      </div>
    </div>
  );
}

// -------- envio por link público --------
function isPublicUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname.includes(".");
  } catch {
    return false;
  }
}

function VideoLinkFinal({ accent, value, onChange }: {
  accent: string;
  value: PitchFinalValue;
  onChange: (v: PitchFinalValue | ((prev: PitchFinalValue) => PitchFinalValue)) => void;
}) {
  // entregas antigas ficaram salvas como arquivo no storage: mantém o player
  const legacyFile = !!value.video_path;
  const [draft, setDraft] = useState(legacyFile ? "" : (value.video_url ?? ""));
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const url = draft.trim();
    if (!isPublicUrl(url)) {
      setErro("cola um link completo, começando com https://");
      return;
    }
    setErro(null);
    onChange((v) => ({
      ...v,
      video_url: url,
      video_path: null,
      video_name: null,
      video_duracao_s: null,
      confirmada_final: false,
    }));
    toast.success("link do vídeo salvo.");
  }

  function limpar() {
    setDraft("");
    setErro(null);
    onChange((v) => ({
      ...v,
      video_url: null,
      video_path: null,
      video_name: null,
      video_duracao_s: null,
      confirmada_final: false,
    }));
  }

  const salvo = !!value.video_url && !legacyFile && value.video_url === draft.trim();

  return (
    <div className="space-y-3">
      {legacyFile && value.video_url && (
        <div className="rounded-2xl border-2 overflow-hidden bg-black" style={{ borderColor: `${accent}55` }}>
          <video src={value.video_url} controls className="w-full aspect-video bg-black" />
        </div>
      )}

      <div className="rounded-xl border-2 border-perestroika-preto/15 bg-white p-3 space-y-2">
        <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60" htmlFor="pitch-final-link">
          link público do vídeo
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            id="pitch-final-link"
            type="url"
            inputMode="url"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setErro(null); }}
            placeholder="https://drive.google.com/..."
            className="flex-1 min-w-[220px] rounded-xl border border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none"
          />
          <button
            type="button"
            onClick={salvar}
            disabled={!draft.trim() || salvo}
            className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm text-perestroika-preto hover:-translate-y-0.5 transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ borderColor: accent, backgroundColor: `${accent}12` }}
          >
            <LinkIcon className="h-4 w-4" aria-hidden /> {salvo ? "link salvo" : "salvar link"}
          </button>
        </div>

        <p className="font-body text-[11px] text-perestroika-preto/60">
          no google drive: botão compartilhar, acesso geral pra qualquer pessoa com o link, depois copiar link.
        </p>

        {erro && (
          <p role="alert" className="font-body text-[11px]" style={{ color: "#fd4644" }}>{erro}</p>
        )}

        {value.video_url && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <a
              href={value.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-body text-[12px] underline text-perestroika-preto/80 break-all"
            >
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden /> abrir o vídeo enviado
            </a>
            <button
              type="button"
              onClick={limpar}
              className="inline-flex items-center gap-1 rounded-full border-2 border-perestroika-preto/15 px-3 py-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/70 hover:border-perestroika-preto/50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> trocar link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function SectionHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">parte {n}</span>
      <h3 className="font-display uppercase text-xl sm:text-2xl leading-none tracking-wide text-perestroika-preto">{title}</h3>
      {hint && <span className="font-body text-[11px] text-perestroika-preto/60">{hint}</span>}
    </div>
  );
}

function StatusChip({ ok, label, accent }: { ok: boolean; label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-body text-[10px] uppercase tracking-wider"
      style={{
        backgroundColor: ok ? `${accent}18` : "transparent",
        border: `1px solid ${ok ? accent : "rgba(9,9,9,0.2)"}`,
        color: ok ? "#090909" : "rgba(9,9,9,0.6)",
      }}
    >
      {ok ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-2.5 w-2.5" aria-hidden />} {label}
    </span>
  );
}
