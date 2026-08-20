import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Circle, Loader2, Mic, Sparkles, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import type { CacaEvidenciasValue } from "./PillCacaEvidencias";
import type { Impactos3PValue } from "./PillImpactos3P";
import type { ChangelogV2Value } from "./PillChangelogV2";
import type { PropostaValorValue } from "./PillPropostaValor";
import type { BMCValue } from "./PillBMCSimplificado";

export type PitchBlockKey = "hook" | "problema" | "solucao" | "regenera" | "modelo" | "chamada";

export type PitchRoteiroValue = {
  hook?: string;
  hook_tipo?: "cena" | "numero" | "pergunta" | "contraste" | "";
  problema?: string;
  solucao?: string;
  regenera?: string;
  modelo?: string;
  chamada?: string;
  take_url?: string | null;
  take_path?: string | null;
  take_name?: string | null;
  take_duracao_s?: number | null;
  auto_avaliacao?: string;
};

type Schema = {
  type?: "pitch_roteiro";
  evidencias_source_module_id?: string;
  impactos_source_module_id?: string;
  proposta_v2_source_module_id?: string;
  bmc_v2_source_module_id?: string;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PitchRoteiroValue;
  pitchMap: Record<string, PitchRoteiroValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const BLOCOS: Array<{
  key: PitchBlockKey;
  numero: number;
  titulo: string;
  duracao: string;
  maxPalavras: number;
  regra: string;
  placeholder: string;
}> = [
  { key: "hook", numero: 1, titulo: "HOOK", duracao: "15-20s", maxPalavras: 40, regra: "cena, número, pergunta ou contraste. nunca comece com \"olá, meu nome é...\".", placeholder: "ex: todo dia 8 quilos de comida vai pro lixo na cantina do Sebrae — quilos, não gramas." },
  { key: "problema", numero: 2, titulo: "PROBLEMA + EVIDÊNCIA", duracao: "30-40s", maxPalavras: 70, regra: "puxa 1 das 3 evidências do módulo 4. cita fonte da prova.", placeholder: "ex: entrevistei 12 alunos que almoçam na escola. 9 disseram que jogam parte da comida fora." },
  { key: "solucao", numero: 3, titulo: "SOLUÇÃO", duracao: "30-40s", maxPalavras: 70, regra: "linguagem simples. um primo de 12 anos entenderia? sem jargão.", placeholder: "ex: uma redistribuição via app entre mesas antes do descarte. o que sobrou de um vira almoço de outro." },
  { key: "regenera", numero: 4, titulo: "COMO REGENERA", duracao: "20-30s", maxPalavras: 50, regra: "cita princípio EMF (módulo 8) e o fluxo que muda (módulo 6).", placeholder: "ex: fecha o loop de alimento antes de virar resíduo. reduz descarte na origem, sem gasto novo de energia." },
  { key: "modelo", numero: 5, titulo: "MODELO", duracao: "20-30s", maxPalavras: 50, regra: "quem paga, quanto, por quê. tira do BMC v2 do módulo 18.", placeholder: "ex: parceria com a cantina, custo zero. troco por relatório mensal que a escola usa em comunicação." },
  { key: "chamada", numero: 6, titulo: "CHAMADA", duracao: "10-15s", maxPalavras: 30, regra: "ação específica. não termine com \"obrigado por ouvir\".", placeholder: "ex: quero 3 parceiros dispostos a testar comigo em 60 dias. quem topa, me procura." },
];

const HOOK_TIPOS: Array<{ id: NonNullable<PitchRoteiroValue["hook_tipo"]>; label: string; hint: string }> = [
  { id: "cena", label: "cena", hint: "descrever momento vivido" },
  { id: "numero", label: "número", hint: "dado surpreendente" },
  { id: "pergunta", label: "pergunta", hint: "que desestabiliza" },
  { id: "contraste", label: "contraste", hint: "o que parece × o que é" },
];

const HOOK_PROIBIDOS = ["olá", "ola", "meu nome é", "meu nome e", "hoje vou apresentar", "hoje eu vou apresentar", "bom dia meu nome", "boa tarde meu nome"];

const BUCKET = "radar-evidences";
const MAX_MB = 100;
const MAX_DUR_S = 200; // 3 min + folga

function countWords(s: string) {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function hookRuim(hook: string) {
  const low = hook.trim().toLowerCase();
  if (!low) return false;
  return HOOK_PROIBIDOS.some((p) => low.startsWith(p));
}

// pulls read-only das aulas anteriores
type Pulls = {
  evidencias: CacaEvidenciasValue["evidencias"] | null;
  impactos: Impactos3PValue | null;
  propostaV2: PropostaValorValue | null;
  bmcV2: ChangelogV2Value["bmc_v2"] | null;
};

function usePulls(schema: Schema): Pulls {
  const { user } = useAuth();
  const ids = [schema.evidencias_source_module_id, schema.impactos_source_module_id, schema.proposta_v2_source_module_id, schema.bmc_v2_source_module_id]
    .filter(Boolean) as string[];
  const q = useQuery({
    queryKey: ["pitch-pulls-aula19", ids, user?.id],
    enabled: !!user && ids.length > 0,
    queryFn: async (): Promise<Pulls> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("module_id, content")
        .in("module_id", ids)
        .eq("user_id", user!.id);
      const byId = new Map<string, Record<string, unknown>>();
      (data ?? []).forEach((r) => byId.set(r.module_id, (r.content ?? {}) as Record<string, unknown>));

      const evc = schema.evidencias_source_module_id ? (byId.get(schema.evidencias_source_module_id) as { caca_evidencias?: Record<string, CacaEvidenciasValue> } | undefined) : undefined;
      const evVal = evc?.caca_evidencias ? Object.values(evc.caca_evidencias)[0] : undefined;

      const impC = schema.impactos_source_module_id ? (byId.get(schema.impactos_source_module_id) as { impactos_aula9?: Record<string, Impactos3PValue> } | undefined) : undefined;
      const impVal = impC?.impactos_aula9 ? Object.values(impC.impactos_aula9)[0] : undefined;

      const chgC = schema.proposta_v2_source_module_id ? (byId.get(schema.proposta_v2_source_module_id) as { changelog_aula18?: Record<string, ChangelogV2Value> } | undefined) : undefined;
      const chgVal = chgC?.changelog_aula18 ? Object.values(chgC.changelog_aula18)[0] : undefined;

      // fallback pra proposta original / bmc original se v2 ainda não existir
      const propC = chgC as { proposta_valor_aula13?: Record<string, PropostaValorValue> } | undefined;
      const bmcC = chgC as { bmc_aula14?: Record<string, BMCValue> } | undefined;
      const propostaV1 = propC?.proposta_valor_aula13 ? Object.values(propC.proposta_valor_aula13)[0] : undefined;
      const bmcV1 = bmcC?.bmc_aula14 ? Object.values(bmcC.bmc_aula14)[0] : undefined;

      return {
        evidencias: evVal?.evidencias ?? null,
        impactos: (impVal as Impactos3PValue) ?? null,
        propostaV2: (chgVal?.proposta_v2 as PropostaValorValue) ?? (propostaV1 as PropostaValorValue) ?? null,
        bmcV2: (chgVal?.bmc_v2 as ChangelogV2Value["bmc_v2"]) ?? (bmcV1 ? { segmento: (bmcV1 as BMCValue).segmento, canais: (bmcV1 as BMCValue).canais } : null),
      };
    },
  });
  return q.data ?? { evidencias: null, impactos: null, propostaV2: null, bmcV2: null };
}

export function PillPitchRoteiro({ pillId, schema, accent, initial, pitchMap, save, onComplete, isCompleted, isCompleting }: Props) {
  const ctaLabel = schema.completion?.label ?? "entregar roteiro + take";
  const { user } = useAuth();
  const pulls = usePulls(schema);

  const [value, setValue] = useState<PitchRoteiroValue>(() => ({
    hook: initial?.hook ?? "",
    hook_tipo: initial?.hook_tipo ?? "",
    problema: initial?.problema ?? "",
    solucao: initial?.solucao ?? "",
    regenera: initial?.regenera ?? "",
    modelo: initial?.modelo ?? "",
    chamada: initial?.chamada ?? "",
    take_url: initial?.take_url ?? null,
    take_path: initial?.take_path ?? null,
    take_name: initial?.take_name ?? null,
    take_duracao_s: initial?.take_duracao_s ?? null,
    auto_avaliacao: initial?.auto_avaliacao ?? "",
  }));

  const status = useAutoSaveField({
    value: { ...pitchMap, [pillId]: value },
    initial: pitchMap,
    save,
    field: "pitch_aula19",
  });

  const set = <K extends keyof PitchRoteiroValue>(k: K, v: PitchRoteiroValue[K]) =>
    setValue((prev) => ({ ...prev, [k]: v }));

  const blocosOk = useMemo(() => BLOCOS.map((b) => {
    const txt = (value[b.key] as string) ?? "";
    const words = countWords(txt);
    const preenchido = words >= 8;
    const dentroLimite = words <= b.maxPalavras;
    return { ...b, words, preenchido, dentroLimite };
  }), [value]);

  const hookBadStart = hookRuim(value.hook ?? "");
  const hookOk = blocosOk[0].preenchido && blocosOk[0].dentroLimite;
  const todosOk = blocosOk.every((b) => b.preenchido && b.dentroLimite);
  const totalPalavras = blocosOk.reduce((acc, b) => acc + b.words, 0);
  const temTake = !!value.take_url;
  const autoOk = (value.auto_avaliacao ?? "").trim().length >= 80;
  const ready = todosOk && temTake && autoOk;

  return (
    <div className="space-y-8">
      {/* PULLS */}
      <PullsPainel pulls={pulls} accent={accent} />

      {/* 6 BLOCOS */}
      <section className="space-y-4">
        <SectionHeader
          n={1}
          title="ROTEIRO EM 6 BLOCOS"
          hint={`total ideal: ~260-310 palavras (2-3 min falado). agora você tem ${totalPalavras}.`}
        />

        <div className="grid gap-3">
          {blocosOk.map((b, idx) => {
            const txt = (value[b.key] as string) ?? "";
            const border = b.preenchido && b.dentroLimite ? `${accent}77` : "rgba(9,9,9,0.15)";
            return (
              <article
                key={b.key}
                className="rounded-2xl border-2 p-3 sm:p-4 space-y-2 bg-white"
                style={{ borderColor: border }}
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-sm text-perestroika-bege"
                      style={{ backgroundColor: accent }}
                    >
                      {b.numero}
                    </span>
                    <h4 className="font-display uppercase text-lg text-perestroika-preto tracking-wide">
                      {b.titulo}
                    </h4>
                    <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/50">
                      {b.duracao}
                    </span>
                  </div>
                  <span
                    className={`font-body text-[11px] tabular-nums ${
                      !b.dentroLimite ? "text-[#fd4644] font-semibold" : "text-perestroika-preto/55"
                    }`}
                  >
                    {b.words}/{b.maxPalavras} palavras
                  </span>
                </header>

                <p className="font-body text-[11px] text-perestroika-preto/60 leading-snug">
                  {b.regra}
                </p>

                {b.key === "hook" && (
                  <div className="flex flex-wrap gap-1.5">
                    {HOOK_TIPOS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => set("hook_tipo", value.hook_tipo === h.id ? "" : h.id)}
                        className="inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 font-body text-[11px] uppercase tracking-wider transition-colors"
                        style={{
                          borderColor: value.hook_tipo === h.id ? accent : "rgba(9,9,9,0.15)",
                          backgroundColor: value.hook_tipo === h.id ? `${accent}18` : "transparent",
                          color: "#090909",
                        }}
                        title={h.hint}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  value={txt}
                  onChange={(e) => set(b.key, e.target.value as never)}
                  placeholder={b.placeholder}
                  rows={b.key === "chamada" || b.key === "regenera" ? 2 : 3}
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege/40 px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
                />

                {b.key === "hook" && hookBadStart && (
                  <div className="rounded-xl p-2.5 flex items-start gap-2" style={{ backgroundColor: "#fd464412", border: "1px solid #fd464455" }}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#fd4644" }} aria-hidden />
                    <p className="font-body text-[11px] text-perestroika-preto/85 leading-snug">
                      seu hook começa com uma abertura genérica ("olá", "meu nome é", "hoje vou apresentar"). o ouvinte já dormiu. começa com CENA, NÚMERO, PERGUNTA ou CONTRASTE.
                    </p>
                  </div>
                )}

                {!b.dentroLimite && (
                  <p className="font-body text-[11px] text-[#fd4644]">
                    passou do limite. corta {b.words - b.maxPalavras} palavras.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* TAKE */}
      <section className="space-y-3">
        <SectionHeader
          n={2}
          title="PRIMEIRO TAKE"
          hint="rascunho. grava uma vez, sem ensaio. depois assiste. semana que vem: versão final."
        />
        <TakeUploader
          userId={user?.id ?? null}
          value={{ url: value.take_url ?? null, path: value.take_path ?? null, name: value.take_name ?? null, duracao: value.take_duracao_s ?? null }}
          onChange={(next) => setValue((p) => ({ ...p, take_url: next.url, take_path: next.path, take_name: next.name, take_duracao_s: next.duracao }))}
          accent={accent}
        />
      </section>

      {/* AUTO-AVALIAÇÃO */}
      <section className="space-y-3">
        <SectionHeader
          n={3}
          title="ASSISTA E ANOTA"
          hint="depois de assistir seu take, em 1 frase: o que mais chama atenção (positivo) e o que mais atrapalha? vira seu foco pra aula 20."
        />
        <textarea
          value={value.auto_avaliacao ?? ""}
          onChange={(e) => set("auto_avaliacao", e.target.value)}
          placeholder="ex: gostei da energia no hook, mas gaguejei no bloco do modelo. preciso decorar essa parte."
          rows={3}
          className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
        />
        {!autoOk && (value.auto_avaliacao ?? "").length > 0 && (
          <p className="font-body text-[11px] text-perestroika-preto/55">
            {(value.auto_avaliacao ?? "").trim().length}/80 caracteres.
          </p>
        )}
      </section>

      {/* STATUS + CTA */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-perestroika-preto/10">
        <SaveIndicator status={status} />

        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip ok={todosOk} label={`${blocosOk.filter((b) => b.preenchido && b.dentroLimite).length}/6 blocos`} accent={accent} />
          <StatusChip ok={temTake} label={temTake ? "take enviado" : "take pendente"} accent={accent} />
          <StatusChip ok={autoOk} label="auto-avaliação" accent={accent} />
        </div>

        <button
          type="button"
          onClick={() => !isCompleted && ready && onComplete()}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display uppercase text-sm text-perestroika-bege transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{ backgroundColor: isCompleted ? "#090909" : accent }}
        >
          {isCompleted ? <><Check className="h-4 w-4" aria-hidden /> entregue</> : <>{ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden /></>}
        </button>
      </div>

      {!ready && !isCompleted && (
        <p className="font-body text-[11px] text-perestroika-preto/60 flex items-start gap-1.5">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
          libera a entrega quando os 6 blocos estiverem dentro do limite, o take estiver enviado e a auto-avaliação tiver pelo menos 80 caracteres.
        </p>
      )}
    </div>
  );
}

// ------------- painel de pulls -------------
function PullsPainel({ pulls, accent }: { pulls: Pulls; accent: string }) {
  const nada = !pulls.evidencias?.length && !pulls.impactos && !pulls.propostaV2 && !pulls.bmcV2;
  if (nada) return null;
  return (
    <section
      className="rounded-2xl p-3 sm:p-4 space-y-2"
      style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}44` }}
    >
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
        material das aulas anteriores · use como referência enquanto escreve
      </p>
      <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        {pulls.evidencias?.length ? (
          <RefCard title={`evidências (aula 4) · ${pulls.evidencias.length}`}>
            <ul className="space-y-1">
              {pulls.evidencias.slice(0, 3).map((ev, i) => {
                const resumo = ev.descricao || ev.frase1 || ev.prova || ev.entrevistado || "—";
                return (
                  <li key={i} className="font-body text-xs text-perestroika-preto/75 leading-snug">
                    <span className="text-perestroika-preto/50">#{i + 1}</span> {resumo}
                  </li>
                );
              })}
            </ul>
          </RefCard>
        ) : null}
        {pulls.propostaV2 ? (
          <RefCard title="proposta de valor v2 (aula 18)">
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              <strong>{pulls.propostaV2.frase_ancora || pulls.propostaV2.solucao || "—"}</strong>
            </p>
            {pulls.propostaV2.publico && (
              <p className="font-body text-[11px] text-perestroika-preto/60 mt-1">para: {pulls.propostaV2.publico}</p>
            )}
          </RefCard>
        ) : null}
        {pulls.impactos ? (
          <RefCard title="impactos regenerativos (aula 9)">
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              {pulls.impactos.pessoas?.estado_desejado || pulls.impactos.planeta?.estado_desejado || pulls.impactos.prosperidade?.estado_desejado || "—"}
            </p>
          </RefCard>
        ) : null}
        {pulls.bmcV2 ? (
          <RefCard title="modelo v2 (aula 18)">
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              <span className="text-perestroika-preto/50">segmento:</span> {pulls.bmcV2.segmento || "—"}
            </p>
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              <span className="text-perestroika-preto/50">canais:</span> {pulls.bmcV2.canais || "—"}
            </p>
          </RefCard>
        ) : null}
      </div>
    </section>
  );
}

function RefCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-perestroika-preto/10 bg-white p-2.5">
      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55 mb-1">{title}</p>
      {children}
    </article>
  );
}

// ------------- take uploader com gravação + upload -------------
type TakeState = { url: string | null; path: string | null; name: string | null; duracao: number | null };

function TakeUploader({ userId, value, onChange, accent }: { userId: string | null; value: TakeState; onChange: (v: TakeState) => void; accent: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // gravação
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    // cleanup no unmount
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function uploadBlob(blob: Blob, filename: string, duracao: number | null) {
    if (!userId) {
      const m = "precisa estar logado pra enviar o take.";
      setErro(m); toast.error(m); return;
    }
    if (blob.size > MAX_MB * 1024 * 1024) {
      const m = `arquivo passa de ${MAX_MB}mb. grava menor ou comprime.`;
      setErro(m); toast.error(m); return;
    }
    setErro(null); setUploading(true); setProgress("subindo...");
    try {
      if (value.path) {
        await supabase.storage.from(BUCKET).remove([value.path]).catch(() => {});
      }
      const extGuess = filename.split(".").pop()?.toLowerCase();
      const ext = extGuess && /^(mp4|webm|mov|m4v|ogg)$/.test(extGuess) ? extGuess : (blob.type.includes("mp4") ? "mp4" : "webm");
      const path = `${userId}/pitch-aula19-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: false, contentType: blob.type || `video/${ext}`, cacheControl: "3600" });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
      onChange({ url: signed?.signedUrl ?? null, path, name: filename, duracao });
      setProgress("take salvo."); toast.success("take salvo.");
      setTimeout(() => setProgress(null), 1500);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "erro no upload";
      const msg = /row-level security|not authorized|permission/i.test(raw) ? "sem permissão. faz login de novo." : raw;
      setErro(msg); setProgress(null); toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      streamRef.current = stream;
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        await videoLiveRef.current.play().catch(() => {});
      }
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
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
        await uploadBlob(blob, `take-navegador.${(rec.mimeType || "video/webm").includes("mp4") ? "mp4" : "webm"}`, dur);
      };
      rec.start(1000);
      startedAtRef.current = Date.now();
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startedAtRef.current) / 1000);
        setRecTime(s);
        if (s >= MAX_DUR_S) stopRecording();
      }, 500);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setErro("não deu acesso à câmera/microfone. use o upload.");
      console.warn("[PillPitchRoteiro] getUserMedia fail:", raw);
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  async function clear() {
    if (value.path) await supabase.storage.from(BUCKET).remove([value.path]).catch(() => {});
    onChange({ url: null, path: null, name: null, duracao: null });
  }

  if (value.url) {
    return (
      <div className="space-y-2">
        <div className="rounded-2xl border-2 overflow-hidden bg-black/90" style={{ borderColor: `${accent}55` }}>
          <video src={value.url} controls className="w-full aspect-video bg-black" />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-body text-xs text-perestroika-preto/70">
            {value.name || "take enviado"} {value.duracao ? `· ${Math.floor(value.duracao / 60)}:${String(value.duracao % 60).padStart(2, "0")}` : null}
          </p>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-full border-2 border-perestroika-preto/20 px-3 py-1 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/70 hover:border-perestroika-preto/50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> regravar
          </button>
        </div>
      </div>
    );
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

      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm text-perestroika-preto hover:-translate-y-0.5 transition-transform disabled:opacity-50"
            style={{ borderColor: accent, backgroundColor: `${accent}12` }}
          >
            <Video className="h-4 w-4" aria-hidden /> gravar direto no navegador
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm text-white bg-[#fd4644] hover:brightness-110"
          >
            <Mic className="h-4 w-4" aria-hidden /> parar e enviar
          </button>
        )}

        <label
          className={`inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto/20 px-4 py-2 font-body text-sm text-perestroika-preto cursor-pointer hover:border-perestroika-preto/50 ${uploading ? "opacity-60 cursor-wait" : ""}`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {uploading ? "subindo..." : "ou upload de vídeo (até 100mb)"}
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadBlob(f, f.name, null);
              e.target.value = "";
            }}
            disabled={uploading || recording}
          />
        </label>
      </div>

      {(progress || erro) && (
        <p role={erro ? "alert" : "status"} className="font-body text-[11px]" style={{ color: erro ? "#fd4644" : "#75BF9C" }}>
          {erro ?? progress}
        </p>
      )}

      <p className="font-body text-[11px] text-perestroika-preto/55 leading-snug">
        não precisa estar bom. é rascunho. o take fica salvo com você — só admins e você conseguem ver. semana que vem: versão final.
      </p>
    </div>
  );
}

function SectionHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">parte {n}</span>
      <h3 className="font-display uppercase text-xl sm:text-2xl leading-none tracking-wide text-perestroika-preto">
        {title}
      </h3>
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
