import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { toast } from "sonner";

// áudio longo demais estoura o tempo limite da transcrição no servidor (504).
// 2 min cobre uma reflexão falada e mantém a transcrição rápida e confiável.
const MAX_DURATION = 120; // 2 minutos
// gravação minúscula (mic mudo, clique sem querer) é rejeitada pelo modelo.
const MIN_BLOB_BYTES = 2048;

interface Props {
  onAudioReady: (blob: Blob) => void;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
  isTranscribing?: boolean;
  /** rótulo curto pra acessibilidade. ex: "gravar reflexão por voz" */
  ariaLabel?: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LiveWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const primary = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      ctx.strokeStyle = primary ? `hsl(${primary} / 0.7)` : "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return <canvas ref={canvasRef} width={120} height={24} className="rounded" />;
}

/**
 * botão de microfone reutilizável pras pílulas.
 * grava com MediaRecorder (webm/opus), mostra waveform + timer enquanto grava,
 * e devolve o blob via onAudioReady. transcrição é feita no consumidor.
 */
export function VoiceInput({
  onAudioReady,
  onRecordingChange,
  disabled,
  isTranscribing,
  ariaLabel = "gravar resposta por voz",
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setAnalyserNode(null);
    setElapsed(0);
  }, []);

  const cancel = useCallback(() => {
    chunksRef.current = [];
    cleanup();
    setIsRecording(false);
    onRecordingChange?.(false);
  }, [cleanup, onRecordingChange]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setAnalyserNode(null);
    setIsRecording(false);
    onRecordingChange?.(false);
  }, [onRecordingChange]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          if (blob.size < MIN_BLOB_BYTES) {
            toast.error("gravação muito curta. segura o microfone e fala por alguns segundos.");
            return;
          }
          onAudioReady(blob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);

      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            stop();
            toast.info("gravação encerrada · limite de 5 min atingido.");
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      setIsRecording(true);
      onRecordingChange?.(true);
    } catch (err: any) {
      console.error("mic access error", err);
      if (err?.name === "NotAllowedError") {
        toast.error("libera o microfone nas permissões do navegador.");
      } else {
        toast.error("não deu pra acessar o microfone. tenta de novo.");
      }
    }
  }, [onAudioReady, onRecordingChange, stop]);

  useEffect(() => () => cleanup(), [cleanup]);

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
      {isRecording && (
        <div className="flex items-center gap-2 rounded-full border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-1.5 shadow-sm">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-perestroika-vermelho/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-perestroika-vermelho" />
          </span>
          <LiveWaveform analyser={analyserNode} />
          <span className="font-body text-[11px] tabular-nums text-perestroika-preto/75">
            {formatTime(elapsed)}
          </span>
          <button
            type="button"
            onClick={cancel}
            className="ml-1 inline-flex items-center gap-1 font-body text-[11px] text-perestroika-preto/55 hover:text-perestroika-vermelho transition-colors"
            aria-label="descartar gravação"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            descartar
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={isRecording ? stop : start}
        disabled={disabled || isTranscribing}
        aria-label={
          isTranscribing
            ? "transcrevendo áudio"
            : isRecording
              ? "parar gravação"
              : ariaLabel
        }
        aria-pressed={isRecording}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege disabled:opacity-50 disabled:cursor-not-allowed ${
          isTranscribing
            ? "bg-primary/10 text-primary cursor-wait"
            : isRecording
              ? "bg-primary text-perestroika-bege shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
              : "bg-perestroika-preto/[0.06] text-perestroika-preto/70 hover:bg-perestroika-preto hover:text-perestroika-bege"
        }`}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : isRecording ? (
          <Square className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
