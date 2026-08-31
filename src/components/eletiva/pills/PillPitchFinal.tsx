import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Circle, Loader2, Mic, RotateCcw, Trash2, Upload, Video } from "lucide-react";
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
const MAX_MB = 100;
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
        resolve(v);
      };
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const d = el.duration;
        finish(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
      };
      el.onerror = () => finish(null);
      // safety net: metadados que nunca chegam não podem travar o upload
      setTimeout(() => finish(null), 8000);
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

  const durationOk = !!value.video_duracao_s && value.video_duracao_s >= MIN_DUR_S && value.video_duracao_s <= MAX_DUR_S;
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

      {/* PARTE 2 — Gravar versão final */}
      {value.roteiro_pronto && (
        <section className="space-y-3">
          <SectionHeader n={2} title="gravar versão final" hint="90s a 4min · máx 3 tentativas" />

          <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-3">
            <p className="font-body text-xs text-perestroika-preto/75 leading-relaxed">
              silêncio ao redor. luz na cara. celular na horizontal ou webcam. se errar, começa de novo. perfeccionismo aqui é fuga — máximo {MAX_TENTATIVAS} tentativas, depois escolhe a menos ruim.
            </p>
          </div>

          <VideoRecorderFinal
            userId={user?.id ?? null}
            accent={accent}
            value={value}
            onChange={setValue}
          />

          {value.video_url && (
            <>
              {!durationOk && (
                <p className="font-body text-[12px] text-[#fd4644] flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
                  duração {value.video_duracao_s ? `${value.video_duracao_s}s` : "desconhecida"} — precisa ficar entre 90s e 4min. regrava.
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
                <span className="font-body text-sm text-perestroika-preto">essa é a versão final. tá honesto.</span>
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

// -------- recorder com contador de tentativas --------
function VideoRecorderFinal({ userId, accent, value, onChange }: {
  userId: string | null;
  accent: string;
  value: PitchFinalValue;
  onChange: (v: PitchFinalValue | ((prev: PitchFinalValue) => PitchFinalValue)) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const tentativas = value.tentativas ?? 0;
  const podeMais = tentativas < MAX_TENTATIVAS;

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function uploadBlob(blob: Blob, filename: string, duracao: number | null) {
    if (!userId) { toast.error("faz login pra enviar."); return; }
    if (blob.size > MAX_MB * 1024 * 1024) { toast.error(`arquivo > ${MAX_MB}mb.`); return; }
    setErro(null); setUploading(true); setProgress("subindo...");
    try {
      if (value.video_path) {
        await supabase.storage.from(BUCKET).remove([value.video_path]).catch(() => {});
      }
      const extGuess = filename.split(".").pop()?.toLowerCase();
      const ext = extGuess && /^(mp4|webm|mov|m4v|ogg)$/.test(extGuess) ? extGuess : (blob.type.includes("mp4") ? "mp4" : "webm");
      const path = `${userId}/pitch-final-aula20-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: false, contentType: blob.type || `video/${ext}`, cacheControl: "3600" });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      onChange((v) => ({
        ...v,
        video_url: signed?.signedUrl ?? null,
        video_path: path,
        video_name: filename,
        video_duracao_s: duracao,
        tentativas: (v.tentativas ?? 0) + 1,
        confirmada_final: false,
      }));
      setProgress("versão final salva.");
      toast.success("versão final salva.");
      setTimeout(() => setProgress(null), 1500);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "erro no upload";
      setErro(raw); setProgress(null); toast.error(raw);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 480 }, audio: true });
      streamRef.current = stream;
      if (videoLiveRef.current) { videoLiveRef.current.srcObject = stream; await videoLiveRef.current.play().catch(() => {}); }
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        const dur = Math.round((Date.now() - startedAtRef.current) / 1000);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoLiveRef.current) videoLiveRef.current.srcObject = null;
        await uploadBlob(blob, `pitch-final.${(rec.mimeType || "video/webm").includes("mp4") ? "mp4" : "webm"}`, dur);
      };
      rec.start(1000);
      startedAtRef.current = Date.now();
      setRecording(true); setRecTime(0);
      timerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startedAtRef.current) / 1000);
        setRecTime(s);
        if (s >= MAX_REC_S) stopRecording();
      }, 500);
    } catch {
      setErro("não deu acesso à câmera. usa o upload.");
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setRecording(false);
  }

  async function clear() {
    if (value.video_path) await supabase.storage.from(BUCKET).remove([value.video_path]).catch(() => {});
    onChange((v) => ({ ...v, video_url: null, video_path: null, video_name: null, video_duracao_s: null, confirmada_final: false }));
  }

  return (
    <div className="space-y-3">
      {recording && (
        <div className="rounded-2xl border-2 overflow-hidden bg-black" style={{ borderColor: "#fd4644" }}>
          <div className="relative">
            <video ref={videoLiveRef} muted className="w-full aspect-video bg-black" playsInline />
            <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-[#fd4644] px-2.5 py-1 font-body text-[11px] uppercase tracking-wider text-white">
              <Circle className="h-2.5 w-2.5 fill-white" aria-hidden /> rec · {Math.floor(recTime / 60)}:{String(recTime % 60).padStart(2, "0")}
            </div>
          </div>
        </div>
      )}

      {value.video_url && !recording && (
        <div className="rounded-2xl border-2 overflow-hidden bg-black" style={{ borderColor: `${accent}55` }}>
          <video src={value.video_url} controls className="w-full aspect-video bg-black" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={uploading || !podeMais}
              className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm text-perestroika-preto hover:-translate-y-0.5 transition-transform disabled:opacity-40"
              style={{ borderColor: accent, backgroundColor: `${accent}12` }}
            >
              <Video className="h-4 w-4" aria-hidden />
              {value.video_url ? "regravar" : "gravar versão final"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm text-white bg-[#fd4644]"
            >
              <Mic className="h-4 w-4" aria-hidden /> parar e enviar
            </button>
          )}

          <label className={`inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto/20 px-4 py-2 font-body text-sm text-perestroika-preto cursor-pointer hover:border-perestroika-preto/50 ${(uploading || !podeMais) ? "opacity-40 cursor-not-allowed" : ""}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            {uploading ? "subindo..." : "upload de vídeo"}
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadBlob(f, f.name, null); e.target.value = ""; }}
              disabled={uploading || recording || !podeMais}
            />
          </label>

          {value.video_url && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-full border-2 border-perestroika-preto/15 px-3 py-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/70 hover:border-perestroika-preto/50">
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> apagar
            </button>
          )}
        </div>

        <span className="inline-flex items-center gap-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          <RotateCcw className="h-3 w-3" aria-hidden /> tentativa {Math.min(tentativas, MAX_TENTATIVAS)}/{MAX_TENTATIVAS}
        </span>
      </div>

      {(progress || erro) && (
        <p role={erro ? "alert" : "status"} className="font-body text-[11px]" style={{ color: erro ? "#fd4644" : "#75BF9C" }}>
          {erro ?? progress}
        </p>
      )}

      {!podeMais && !value.confirmada_final && (
        <p className="font-body text-[11px] text-perestroika-preto/60">
          usou as {MAX_TENTATIVAS} tentativas. escolhe a menos ruim e confirma abaixo.
        </p>
      )}
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
