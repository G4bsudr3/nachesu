import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, AlertTriangle, Camera, Mic, Link2, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

type EvidenciaTipo = "observacao" | "entrevista" | "coleta";

type Evidencia = {
  tipo: EvidenciaTipo;
  // observacao
  data?: string;
  hora?: string;
  local?: string;
  descricao?: string;
  quantidade?: string;
  foto?: EvidenceValue;
  // entrevista
  entrevistado?: string;
  audio?: EvidenceValue;
  frase1?: string;
  frase2?: string;
  frase3?: string;
  // coleta
  link?: string;
  fonte?: string;
  data_fonte?: string;
  prova?: string;
};

export type CacaEvidenciasValue = {
  evidencias: Evidencia[];
  sintese?: string;
};

type Schema = {
  type?: "caca_evidencias";
  radar_source_module_id?: string;
  mapa_source_module_id?: string;
  mapa_source_pill_id?: string;
  metodo_field_id?: string;
  min_sintese_chars?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: CacaEvidenciasValue;
  cacaMap: Record<string, CacaEvidenciasValue>;
  metodoEscolhido?: string;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const emptyEvidence: EvidenceValue = { evidence_kind: "none" };

const emptyEvidencia = (tipo: EvidenciaTipo): Evidencia => ({ tipo });

function tipoFromMetodo(metodo?: string): EvidenciaTipo {
  if (metodo === "entrevista") return "entrevista";
  if (metodo === "coleta") return "coleta";
  return "observacao";
}

function useProblemaEscolhido(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula4-problema", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as { items?: { what?: string; where?: string }[] };
      return (content.items ?? [])
        .slice(0, 3)
        .map((it, i) => {
          const what = (it.what ?? "").trim();
          const where = (it.where ?? "").trim();
          return [what, where].filter(Boolean).join(" · ") || `item ${i + 1}`;
        });
    },
  });
}

function useMapaAtoresResumo(moduleId?: string, pillId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula4-mapa-atores-resumo", moduleId, pillId, user?.id],
    enabled: !!user && !!moduleId && !!pillId,
    queryFn: async (): Promise<Record<string, string[]>> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        mapa_atores_aula3?: Record<string, Record<string, { nome?: string }[]>>;
      };
      const mapa = content.mapa_atores_aula3?.[pillId!] ?? {};
      const out: Record<string, string[]> = {};
      Object.entries(mapa).forEach(([q, atores]) => {
        const nomes = (atores ?? [])
          .map((a) => (a?.nome ?? "").trim())
          .filter(Boolean);
        if (nomes.length > 0) out[q] = nomes;
      });
      return out;
    },
  });
}

const METODO_LABEL: Record<string, string> = {
  observacao: "observação estruturada",
  entrevista: "mini-entrevista",
  coleta: "coleta documental",
  mistura: "mistura",
};

/**
 * pílula 03 — caça às 3 evidências (módulo 4, economia circular).
 * puxa problema (módulo 1) + mapa de atores (módulo 3), método vem do quiz da pílula 02.
 * 3 fichas + síntese, validação de ao menos 1 evidência com upload/link real.
 */
export function PillCacaEvidencias({
  pillId,
  title,
  schema,
  accent,
  initial,
  cacaMap,
  metodoEscolhido,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const ctaLabel = schema.completion?.label ?? "entregar 3 evidências";
  const minSintese = schema.min_sintese_chars ?? 200;
  const metodo = metodoEscolhido ?? "";
  const isMistura = metodo === "mistura";

  const buildInitial = (): CacaEvidenciasValue => {
    const cur = initial?.evidencias ?? [];
    if (cur.length >= 3) return { evidencias: cur.slice(0, 3), sintese: initial?.sintese };
    const defaults: Evidencia[] = [];
    for (let i = 0; i < 3; i++) {
      defaults.push(cur[i] ?? emptyEvidencia(tipoFromMetodo(metodo)));
    }
    return { evidencias: defaults, sintese: initial?.sintese };
  };

  const [value, setValue] = useState<CacaEvidenciasValue>(buildInitial);

  useEffect(() => {
    // hidrata quando initial chega depois
    if (initial?.evidencias && initial.evidencias.length > 0 && value.evidencias.every(e => !isFilled(e))) {
      setValue({ evidencias: initial.evidencias.slice(0, 3).concat(
        Array(Math.max(0, 3 - initial.evidencias.length)).fill(0).map(() => emptyEvidencia(tipoFromMetodo(metodo)))
      ), sintese: initial.sintese });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.evidencias?.length]);

  // se método mudou (aluno voltou pílula 02), atualiza o tipo padrão dos slots vazios
  useEffect(() => {
    if (!metodo || isMistura) return;
    const nextTipo = tipoFromMetodo(metodo);
    setValue((prev) => ({
      ...prev,
      evidencias: prev.evidencias.map((e) => (isFilled(e) ? e : { ...e, tipo: nextTipo })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodo]);

  const status = useAutoSaveField({
    value: { ...cacaMap, [pillId]: value },
    initial: cacaMap,
    save,
    field: "caca_evidencias",
  });

  const problemaQuery = useProblemaEscolhido(schema.radar_source_module_id);
  const mapaResumo = useMapaAtoresResumo(schema.mapa_source_module_id, schema.mapa_source_pill_id);
  const problemaItems = problemaQuery.data ?? [];
  const ganhaAtores = mapaResumo.data?.["ganha"] ?? [];
  const perdeAtores = mapaResumo.data?.["perde"] ?? [];

  const updateEvidencia = (idx: number, patch: Partial<Evidencia>) => {
    setValue((prev) => {
      const next = [...prev.evidencias];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, evidencias: next };
    });
  };

  const setTipo = (idx: number, tipo: EvidenciaTipo) => {
    setValue((prev) => {
      const next = [...prev.evidencias];
      next[idx] = { tipo };
      return { ...prev, evidencias: next };
    });
  };

  const validacao = useMemo(() => {
    const evs = value.evidencias ?? [];
    const filled = evs.map(isFilled);
    const anyReal = evs.some(hasRealOrigin);
    const sinteseLen = (value.sintese ?? "").trim().length;
    const sinteseOk = sinteseLen >= minSintese;
    const missing: string[] = [];
    filled.forEach((ok, i) => {
      if (!ok) missing.push(`evidência ${i + 1} tá incompleta.`);
    });
    if (!anyReal) missing.push("pelo menos 1 evidência precisa ter foto, áudio ou link (mundo real, não só texto).");
    if (!sinteseOk) missing.push(`síntese precisa de ${minSintese - sinteseLen} caracteres a mais.`);
    return { ready: missing.length === 0, missing };
  }, [value, minSintese]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">{title}</h2>
        <SaveIndicator status={status} />
      </header>

      {/* âncora: problema + mapa */}
      <div
        className="rounded-2xl border-2 p-4 space-y-3"
        style={{ borderColor: `${accent}55`, backgroundColor: `${accent}10` }}
      >
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60 mb-1.5">
            seu problema (do radar do módulo 1)
          </p>
          {problemaQuery.isLoading ? (
            <p className="font-body text-sm text-perestroika-preto/55">carregando…</p>
          ) : problemaItems.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/70">
              você ainda não preencheu o radar do módulo 1. volta lá pra ancorar sua investigação.
            </p>
          ) : (
            <ul className="space-y-1">
              {problemaItems.map((t, i) => (
                <li key={i} className="font-body text-sm text-perestroika-preto leading-snug">
                  <span className="text-perestroika-preto/55 mr-1.5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        {(ganhaAtores.length > 0 || perdeAtores.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0 pt-1 border-t border-perestroika-preto/15">
            {ganhaAtores.length > 0 && (
              <div>
                <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                  quem ganha (módulo 3)
                </p>
                <p className="font-body text-xs text-perestroika-preto/80">{ganhaAtores.slice(0, 4).join(" · ")}</p>
              </div>
            )}
            {perdeAtores.length > 0 && (
              <div>
                <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                  quem perde (módulo 3)
                </p>
                <p className="font-body text-xs text-perestroika-preto/80">{perdeAtores.slice(0, 4).join(" · ")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* método escolhido */}
      {metodo ? (
        <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
              método escolhido
            </p>
            <p className="font-display uppercase text-xl leading-tight" style={{ color: accent }}>
              {METODO_LABEL[metodo] ?? metodo}
            </p>
          </div>
          <p className="font-body text-xs text-perestroika-preto/60 max-w-xs">
            pode mudar o método voltando pra pílula anterior. as evidências que você já preencheu ficam salvas.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border-2 px-4 py-3 font-body text-sm flex items-start gap-2"
          style={{ backgroundColor: "#F2BC5722", borderColor: "#F2BC57", color: "#5a4310" }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            escolhe o método na pílula anterior (pergunta 3 do conteúdo curado) pra desbloquear o template certo aqui.
          </span>
        </div>
      )}

      {/* instruções */}
      <div className="rounded-2xl bg-perestroika-preto/[0.04] p-4 sm:p-5">
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed">
          seu exercício: produzir <strong>3 evidências distintas</strong> do seu problema. evidência tem nome, data,
          local. opinião não tem. pelo menos 1 delas precisa ter algo do mundo real (foto, áudio ou link
          público). se descobrir que o problema não é bem o que pensava, isso é vitória, não fracasso.
        </p>
        {metodo === "entrevista" && (
          <p className="font-body text-xs text-perestroika-preto/70 mt-3 leading-relaxed">
            <strong>timidez pra entrevistar?</strong> tudo bem. tenta 1 pessoa próxima primeiro (colega, alguém da
            família). se travar mesmo, volta na pílula anterior e troca pra coleta documental. sem culpa.
          </p>
        )}
      </div>

      {/* fichas de evidência */}
      <div className="space-y-4">
        {value.evidencias.map((ev, idx) => (
          <FichaEvidencia
            key={idx}
            idx={idx}
            evidencia={ev}
            accent={accent}
            pillId={pillId}
            allowTypeSwitch={isMistura || !metodo}
            onChange={(patch) => updateEvidencia(idx, patch)}
            onSetTipo={(t) => setTipo(idx, t)}
          />
        ))}
      </div>

      {/* síntese */}
      <div className="space-y-2 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5">
        <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          síntese · suas 3 evidências confirmam ou refutam sua hipótese? (mín {minSintese} caracteres)
        </label>
        <TextareaWithVoice
          value={value.sintese ?? ""}
          onChange={(e) => setValue((prev) => ({ ...prev, sintese: e.target.value }))}
          placeholder="ex: minhas 3 evidências mostram que o problema não é a falta de lixeiras — é a rotina do intervalo que não deixa tempo pra separar…"
          rows={4}
          className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
          voiceAriaLabel="gravar síntese por voz"
        />
        <p className="font-body text-[11px] text-perestroika-preto/55">
          {Math.min((value.sintese ?? "").trim().length, minSintese)}/{minSintese} caracteres
        </p>
      </div>

      {/* validação + cta */}
      {!validacao.ready && !isCompleted && (
        <div
          className="rounded-2xl border-2 p-4"
          style={{ borderColor: "#fd4644", backgroundColor: "#fd46440D" }}
        >
          <p className="font-body text-sm font-medium inline-flex items-center gap-2 mb-2" style={{ color: "#fd4644" }}>
            <AlertTriangle className="h-4 w-4" /> falta pouco pra entregar
          </p>
          <ul className="font-body text-sm text-perestroika-preto/80 space-y-1 list-disc pl-5">
            {validacao.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={!validacao.ready || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !validacao.ready || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!validacao.ready || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" /> evidências entregues
            </>
          ) : (
            <>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function isFilled(ev?: Evidencia): boolean {
  if (!ev) return false;
  if (ev.tipo === "observacao") {
    return !!(ev.data && ev.local && (ev.descricao ?? "").trim().length >= 10);
  }
  if (ev.tipo === "entrevista") {
    return !!(ev.entrevistado && (ev.frase1 ?? "").trim().length >= 10);
  }
  if (ev.tipo === "coleta") {
    return !!(ev.link && ev.fonte && (ev.prova ?? "").trim().length >= 10);
  }
  return false;
}

function hasEvidenceAttachment(v?: EvidenceValue): boolean {
  if (!v) return false;
  if (v.evidence_kind === "file" && v.evidence_path) return true;
  if (v.evidence_kind === "link" && /^https?:\/\/\S+/i.test(v.evidence_link ?? "")) return true;
  return false;
}

function hasRealOrigin(ev?: Evidencia): boolean {
  if (!ev) return false;
  if (hasEvidenceAttachment(ev.foto)) return true;
  if (hasEvidenceAttachment(ev.audio)) return true;
  if (ev.link && /^https?:\/\/\S+/i.test(ev.link)) return true;
  return false;
}

function FichaEvidencia({
  idx,
  evidencia,
  accent,
  pillId,
  allowTypeSwitch,
  onChange,
  onSetTipo,
}: {
  idx: number;
  evidencia: Evidencia;
  accent: string;
  pillId: string;
  allowTypeSwitch: boolean;
  onChange: (patch: Partial<Evidencia>) => void;
  onSetTipo: (t: EvidenciaTipo) => void;
}) {
  const filled = isFilled(evidencia);

  return (
    <section
      aria-label={`evidência ${idx + 1}`}
      className="rounded-2xl border-2 bg-perestroika-bege p-4 sm:p-5 space-y-4"
      style={{ borderColor: filled ? `${accent}88` : "rgba(9,9,9,0.15)" }}
    >
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-full font-display text-base text-perestroika-bege shrink-0"
            style={{ backgroundColor: accent }}
          >
            {String(idx + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-display uppercase text-lg leading-tight">evidência {idx + 1}</p>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
              tipo: {evidencia.tipo === "observacao" ? "observação" : evidencia.tipo}
            </p>
          </div>
        </div>
        {allowTypeSwitch && (
          <div className="flex items-center gap-1 flex-wrap">
            {(["observacao", "entrevista", "coleta"] as const).map((t) => {
              const active = evidencia.tipo === t;
              const Icon = t === "observacao" ? Camera : t === "entrevista" ? Mic : Link2;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSetTipo(t)}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-body text-[11px] uppercase tracking-wider transition-colors ${
                    active
                      ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                      : "border-perestroika-preto/15 hover:border-perestroika-preto/45"
                  }`}
                >
                  <Icon className="h-3 w-3" aria-hidden /> {t === "observacao" ? "observação" : t}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {evidencia.tipo === "observacao" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="data" value={evidencia.data ?? ""} type="date" onChange={(v) => onChange({ data: v })} />
            <Field label="hora" value={evidencia.hora ?? ""} type="time" onChange={(v) => onChange({ hora: v })} />
            <Field label="local" value={evidencia.local ?? ""} placeholder="ex: pátio, 2º andar" onChange={(v) => onChange({ local: v })} />
          </div>
          <TextField
            label="descrição factual (sem interpretar)"
            value={evidencia.descricao ?? ""}
            placeholder="ex: 6 alunos usaram o bebedouro em 15 min; 3 desperdiçaram água aberta"
            rows={2}
            onChange={(v) => onChange({ descricao: v })}
          />
          <Field
            label="quantidade / número"
            value={evidencia.quantidade ?? ""}
            placeholder="ex: 6 pessoas, 15 min, 3 copos"
            onChange={(v) => onChange({ quantidade: v })}
          />
          <EvidenceField
            label="foto (opcional, mas conta como origem real)"
            itemId={`${pillId}-obs-${idx}`}
            value={evidencia.foto ?? emptyEvidence}
            onChange={(next) => onChange({ foto: next })}
            accent={accent}
          />
        </div>
      )}

      {evidencia.tipo === "entrevista" && (
        <div className="space-y-3">
          <Field
            label="quem foi entrevistado"
            value={evidencia.entrevistado ?? ""}
            placeholder="ex: colega do 2º ano de administração, 15 anos"
            onChange={(v) => onChange({ entrevistado: v })}
          />
          <EvidenceField
            label="áudio da conversa (com permissão · mp3/m4a, até 10mb)"
            itemId={`${pillId}-ent-${idx}`}
            value={evidencia.audio ?? emptyEvidence}
            onChange={(next) => onChange({ audio: next })}
            accent={accent}
          />
          <TextField
            label="frase marcante 1"
            value={evidencia.frase1 ?? ""}
            placeholder="cita literalmente uma frase que te chamou atenção"
            rows={2}
            onChange={(v) => onChange({ frase1: v })}
          />
          <TextField
            label="frase marcante 2"
            value={evidencia.frase2 ?? ""}
            placeholder="outra fala relevante (se tiver)"
            rows={2}
            onChange={(v) => onChange({ frase2: v })}
          />
          <TextField
            label="frase marcante 3"
            value={evidencia.frase3 ?? ""}
            placeholder="mais uma (opcional)"
            rows={2}
            onChange={(v) => onChange({ frase3: v })}
          />
        </div>
      )}

      {evidencia.tipo === "coleta" && (
        <div className="space-y-3">
          <Field
            label="link (matéria, dado oficial, post, estudo)"
            value={evidencia.link ?? ""}
            type="url"
            placeholder="https://…"
            onChange={(v) => onChange({ link: v })}
          />
          <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
            <Field
              label="fonte"
              value={evidencia.fonte ?? ""}
              placeholder="ex: ibge, jornal estado de minas, prefeitura bh"
              onChange={(v) => onChange({ fonte: v })}
            />
            <Field
              label="data da fonte"
              value={evidencia.data_fonte ?? ""}
              type="date"
              onChange={(v) => onChange({ data_fonte: v })}
            />
          </div>
          <TextField
            label="o que isso prova sobre seu problema"
            value={evidencia.prova ?? ""}
            placeholder="1 ou 2 frases conectando o dado com sua hipótese"
            rows={2}
            onChange={(v) => onChange({ prova: v })}
          />
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
        {label}
      </label>
      <TextareaWithVoice
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
        voiceAriaLabel={`gravar ${label} por voz`}
      />
    </div>
  );
}

function EvidenceField({
  label,
  itemId,
  value,
  onChange,
  accent,
}: {
  label: string;
  itemId: string;
  value: EvidenceValue;
  onChange: (v: EvidenceValue) => void;
  accent: string;
}) {
  return (
    <div>
      <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1.5">
        <Layers className="inline h-3 w-3 mr-1 -mt-0.5" aria-hidden /> {label}
      </label>
      <EvidenceUploader itemId={itemId} value={value} onChange={onChange} accent={accent} maxMb={10} />
    </div>
  );
}
