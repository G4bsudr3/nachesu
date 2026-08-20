import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Download, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";
import { generateBriefingPdf } from "./briefingPdf";

type FiltroResp = "forte" | "parcial" | "fraco";

type Filtros = {
  evidencia?: FiltroResp;
  incomodo?: FiltroResp;
  tradeoff?: FiltroResp;
  fluxo?: FiltroResp;
};

export type BriefingValue = {
  titulo?: string;
  hmw?: string;
  fluxo_principal?: string;
  fluxo_secundario?: string;
  evidencias_resumo?: string[];
  atores_ganha?: string;
  atores_perde?: string;
  justificativa?: string;
  filtros?: Filtros;
  trocou_problema?: boolean;
  gerado_em?: string;
};

type Schema = {
  type?: "quatro_filtros_briefing";
  aula1_module_id?: string;
  aula1_incomodo_field_id?: string;
  aula3_module_id?: string;
  aula3_mapa_pill_id?: string;
  aula4_module_id?: string;
  aula4_caca_pill_id?: string;
  fluxo_field_id?: string; // guided_answers key desta própria aula
  fluxos?: { value: string; label: string }[];
  min_hmw_chars?: number;
  min_justificativa_chars?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  moduleId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: BriefingValue;
  briefingMap: Record<string, BriefingValue>;
  guidedAnswers: Record<string, string>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const FILTRO_LABELS: Record<FiltroResp, string> = {
  forte: "sim, forte",
  parcial: "parcial · precisa refinar",
  fraco: "não · preciso trocar",
};

const FILTRO_OPTIONS: FiltroResp[] = ["forte", "parcial", "fraco"];

function useIncomodo(aula1ModuleId?: string, fieldId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula5-incomodo", aula1ModuleId, fieldId, user?.id],
    enabled: !!user && !!aula1ModuleId && !!fieldId,
    queryFn: async (): Promise<string> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", aula1ModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const content = (data?.content ?? {}) as { guided_answers?: Record<string, string> };
      return content.guided_answers?.[fieldId!] ?? "";
    },
  });
}

function useMapaGanhaPerde(aula3ModuleId?: string, mapaPillId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula5-mapa", aula3ModuleId, mapaPillId, user?.id],
    enabled: !!user && !!aula3ModuleId && !!mapaPillId,
    queryFn: async (): Promise<{ ganha: string[]; perde: string[] }> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", aula3ModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const content = (data?.content ?? {}) as {
        mapa_atores_aula3?: Record<string, Record<string, { nome?: string; descricao?: string }[]>>;
      };
      const mapa = content.mapa_atores_aula3?.[mapaPillId!] ?? {};
      const nomes = (list?: { nome?: string }[]) =>
        (list ?? []).map((a) => (a?.nome ?? "").trim()).filter(Boolean);
      return {
        ganha: nomes(mapa.ganha),
        perde: nomes(mapa.perde),
      };
    },
  });
}

function useEvidencias(aula4ModuleId?: string, cacaPillId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula5-evidencias", aula4ModuleId, cacaPillId, user?.id],
    enabled: !!user && !!aula4ModuleId && !!cacaPillId,
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", aula4ModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      const content = (data?.content ?? {}) as {
        caca_evidencias?: Record<string, { evidencias?: Array<Record<string, unknown>> }>;
      };
      const evs = content.caca_evidencias?.[cacaPillId!]?.evidencias ?? [];
      return evs.slice(0, 3).map((e, i) => {
        const tipo = String(e.tipo ?? "");
        if (tipo === "observacao") {
          return [e.local, e.descricao].filter(Boolean).join(" · ") || `observação ${i + 1}`;
        }
        if (tipo === "entrevista") {
          return [e.entrevistado, e.frase1].filter(Boolean).join(" · ") || `entrevista ${i + 1}`;
        }
        if (tipo === "coleta") {
          return [e.fonte, e.prova].filter(Boolean).join(" · ") || `dado ${i + 1}`;
        }
        return `evidência ${i + 1}`;
      });
    },
  });
}

function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula5-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, nickname")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
}

function scoreOf(filtros?: Filtros): number {
  if (!filtros) return 0;
  return (["evidencia", "incomodo", "tradeoff", "fluxo"] as const).reduce(
    (acc, k) => acc + (filtros[k] === "forte" ? 1 : 0),
    0,
  );
}

function semaforoOf(filtros?: Filtros): "verde" | "amarelo" | "vermelho" | "pendente" {
  const arr = (["evidencia", "incomodo", "tradeoff", "fluxo"] as const).map((k) => filtros?.[k]);
  if (arr.some((v) => !v)) return "pendente";
  const s = arr.filter((v) => v === "forte").length;
  if (s === 4) return "verde";
  if (s >= 2) return "amarelo";
  return "vermelho";
}

const SEMAFORO_META: Record<
  "verde" | "amarelo" | "vermelho" | "pendente",
  { label: string; color: string; msg: string }
> = {
  verde: {
    label: "problema validado",
    color: "#75BF9C",
    msg: "tá pronto. problema validado nos 4 filtros. vamos pra trilha 2.",
  },
  amarelo: {
    label: "tá quase",
    color: "#F2C94C",
    msg: "refina os pontos fracos antes de seguir. você pode ajustar o HMW e as evidências mais tarde, mas quanto antes travar, melhor.",
  },
  vermelho: {
    label: "sinal claro pra trocar",
    color: "#fd4644",
    msg: "os filtros mostram que esse problema não sustenta 15 semanas. não é fracasso — é a ferramenta funcionando. escolha um problema novo do seu radar (módulo 1) e preencha o briefing com ele. marque a caixa abaixo pra registrarmos a troca.",
  },
  pendente: {
    label: "responda os 4 filtros",
    color: "#8A8375",
    msg: "escolha uma resposta em cada filtro pra ver o resultado.",
  },
};

/**
 * pílula 03 (aula 5, economia circular) — 4 filtros de validação + briefing do projeto.
 * puxa evidências (aula 4), incômodo (aula 1), mapa de atores (aula 3).
 * gera PDF do briefing ao concluir.
 */
export function PillQuatroFiltrosBriefing({
  pillId,
  moduleId,
  title,
  schema,
  accent,
  initial,
  briefingMap,
  guidedAnswers,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const minHmw = schema.min_hmw_chars ?? 50;
  const minJust = schema.min_justificativa_chars ?? 100;
  const fluxoDaAula = guidedAnswers[schema.fluxo_field_id ?? ""] ?? "";

  const [value, setValue] = useState<BriefingValue>(() => ({
    titulo: "",
    hmw: "Como podemos ",
    fluxo_principal: fluxoDaAula || undefined,
    evidencias_resumo: ["", "", ""],
    filtros: {},
    ...initial,
  }));

  useEffect(() => {
    // se o aluno respondeu o fluxo depois, alinha
    if (fluxoDaAula && !value.fluxo_principal) {
      setValue((prev) => ({ ...prev, fluxo_principal: fluxoDaAula }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fluxoDaAula]);

  const status = useAutoSaveField({
    value: { ...briefingMap, [pillId]: value },
    initial: briefingMap,
    save,
    field: "briefing_aula5",
  });

  const incomodo = useIncomodo(schema.aula1_module_id, schema.aula1_incomodo_field_id);
  const mapa = useMapaGanhaPerde(schema.aula3_module_id, schema.aula3_mapa_pill_id);
  const evidencias = useEvidencias(schema.aula4_module_id, schema.aula4_caca_pill_id);
  const profile = useProfile();

  // pré-preenche resumos das evidências (uma única vez, se ainda estão vazios)
  useEffect(() => {
    if (evidencias.data && (value.evidencias_resumo ?? []).every((e) => !e || e.trim() === "")) {
      const filled = ["", "", ""].map((_, i) => evidencias.data![i] ?? "");
      setValue((prev) => ({ ...prev, evidencias_resumo: filled }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidencias.data]);

  const semaforo = useMemo(() => semaforoOf(value.filtros), [value.filtros]);
  const score = useMemo(() => scoreOf(value.filtros), [value.filtros]);

  const fluxos = schema.fluxos ?? [];

  const hmwOk = (value.hmw ?? "").trim().length >= minHmw && /^como podemos/i.test((value.hmw ?? "").trim());
  const justOk = (value.justificativa ?? "").trim().length >= minJust;
  const evsOk =
    (value.evidencias_resumo ?? []).filter((e) => (e ?? "").trim().length > 3).length >= 3;
  const filtrosOk = semaforo !== "pendente";
  const fluxoOk = !!(value.fluxo_principal ?? "").trim();
  const tituloOk = ((value.titulo ?? "").trim().length) >= 3;

  const ready = hmwOk && justOk && evsOk && filtrosOk && fluxoOk && tituloOk;

  const setFiltro = (key: keyof Filtros, resp: FiltroResp) =>
    setValue((prev) => ({ ...prev, filtros: { ...prev.filtros, [key]: resp } }));

  const setEv = (i: number, v: string) =>
    setValue((prev) => {
      const arr = [...(prev.evidencias_resumo ?? ["", "", ""])];
      arr[i] = v;
      return { ...prev, evidencias_resumo: arr };
    });

  const alunoNome = profile.data?.nickname || profile.data?.display_name || undefined;

  const buildPdfData = () => ({
    titulo: value.titulo,
    hmw: value.hmw,
    fluxo_principal: value.fluxo_principal,
    fluxo_secundario: value.fluxo_secundario,
    evidencias_resumo: value.evidencias_resumo,
    atores_ganha: value.atores_ganha || mapa.data?.ganha.slice(0, 3).join(", ") || "",
    atores_perde: value.atores_perde || mapa.data?.perde.slice(0, 3).join(", ") || "",
    justificativa: value.justificativa,
    aluno_nome: alunoNome,
    data_iso: value.gerado_em ?? new Date().toISOString(),
  });

  const downloadPdf = async () => {
    const blob = await generateBriefingPdf(buildPdfData());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `briefing-${(value.titulo || "projeto").toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    if (!ready || isCompleted) return;
    setValue((prev) => ({ ...prev, gerado_em: new Date().toISOString() }));
    onComplete();
  };

  const filtroCard = (
    key: keyof Filtros,
    num: string,
    titulo: string,
    pergunta: string,
    contexto: React.ReactNode,
    labelsCustom?: [string, string, string],
  ) => {
    const chosen = value.filtros?.[key];
    const labels = labelsCustom ?? [FILTRO_LABELS.forte, FILTRO_LABELS.parcial, FILTRO_LABELS.fraco];
    return (
      <fieldset className="rounded-2xl border-2 border-perestroika-preto/15 p-4 bg-perestroika-bege">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-display leading-none" style={{ color: accent, fontSize: "clamp(24px,3vw,32px)" }}>
            {num}
          </span>
          <div>
            <legend className="font-display uppercase text-lg leading-tight">{titulo}</legend>
            <p className="font-body text-sm text-perestroika-preto/75">{pergunta}</p>
          </div>
        </div>
        <div className="mb-3 rounded-xl bg-perestroika-preto/[0.04] p-3 font-body text-sm">
          {contexto}
        </div>
        <div className="space-y-1.5">
          {FILTRO_OPTIONS.map((opt, i) => {
            const checked = chosen === opt;
            return (
              <label
                key={opt}
                className={`flex items-start gap-3 rounded-xl border-2 p-2.5 cursor-pointer transition-colors ${
                  checked
                    ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                    : "border-perestroika-preto/15 hover:border-perestroika-preto/40"
                }`}
              >
                <input
                  type="radio"
                  name={`filtro-${key}`}
                  checked={checked}
                  onChange={() => setFiltro(key, opt)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                    checked ? "border-perestroika-bege bg-perestroika-bege" : "border-perestroika-preto/40"
                  }`}
                  aria-hidden
                />
                <span className="font-body text-sm">{labels[i]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  };

  const sem = SEMAFORO_META[semaforo];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">{title}</h2>
          <p className="font-body text-perestroika-preto/75 text-sm sm:text-base">
            passe seu problema pelos 4 filtros. cada filtro puxa o que você já produziu. depois feche o briefing.
          </p>
        </div>
        <SaveIndicator status={status} />
      </header>

      {/* ==== 4 FILTROS ==== */}
      <section aria-label="4 filtros" className="grid gap-3">
        {filtroCard(
          "evidencia",
          "01",
          "tem evidência?",
          "as 3 evidências do módulo 4 sustentam que esse problema existe e é relevante?",
          evidencias.isLoading ? (
            <span className="text-perestroika-preto/50">carregando suas evidências…</span>
          ) : (evidencias.data ?? []).length === 0 ? (
            <span className="text-perestroika-preto/60">
              nenhuma evidência do módulo 4 foi encontrada. você pode responder "não sustentam" e trocar de problema.
            </span>
          ) : (
            <ul className="space-y-1">
              {(evidencias.data ?? []).map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-perestroika-preto/50">{i + 1}.</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          ),
        )}

        {filtroCard(
          "incomodo",
          "02",
          "te incomoda pessoalmente?",
          "esse incômodo ainda é forte agora, ou foi só impulso do começo?",
          incomodo.isLoading ? (
            <span className="text-perestroika-preto/50">carregando sua resposta do módulo 1…</span>
          ) : (incomodo.data ?? "").trim().length === 0 ? (
            <span className="text-perestroika-preto/60">nenhum incômodo do módulo 1 encontrado.</span>
          ) : (
            <span className="italic">"{incomodo.data}"</span>
          ),
          [
            "continua forte · quero gastar 15 semanas nisso",
            "diminuiu · mas ainda topo",
            "diminuiu muito · devo trocar",
          ],
        )}

        {filtroCard(
          "tradeoff",
          "03",
          "tem trade-off real?",
          "quem se identificou como GANHANDO com o problema no seu mapa de atores continua fazendo sentido?",
          mapa.isLoading ? (
            <span className="text-perestroika-preto/50">carregando quadrante ganha…</span>
          ) : (mapa.data?.ganha ?? []).length === 0 ? (
            <span className="text-perestroika-preto/60">
              nenhum ator "ganha" registrado no módulo 3.
            </span>
          ) : (
            <ul className="space-y-1">
              {(mapa.data?.ganha ?? []).map((n, i) => (
                <li key={i} className="flex gap-2">
                  <Check className="h-4 w-4 mt-0.5" style={{ color: accent }} />
                  {n}
                </li>
              ))}
            </ul>
          ),
          [
            "sim · vou lidar com a resistência deles",
            "sim · mas o trade-off é pequeno",
            "não · ninguém realmente ganha (talvez não seja sistêmico)",
          ],
        )}

        {filtroCard(
          "fluxo",
          "04",
          "cabe num fluxo claro?",
          "o fluxo que você escolheu logo acima captura a essência do problema?",
          <span>
            fluxo escolhido:{" "}
            <strong>
              {fluxos.find((f) => f.value === value.fluxo_principal)?.label ??
                (value.fluxo_principal ?? "(escolha o fluxo no bloco anterior)")}
            </strong>
          </span>,
          [
            "sim · perfeitamente",
            "principal · mas tem fluxos secundários",
            "em dúvida · preciso pensar mais",
          ],
        )}
      </section>

      {/* ==== SEMÁFORO ==== */}
      <section aria-label="resultado dos filtros">
        <div
          className="rounded-2xl border-2 p-4 flex items-start gap-3"
          style={{ borderColor: sem.color, backgroundColor: `${sem.color}1A` }}
        >
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 font-display leading-none"
            style={{ backgroundColor: sem.color, color: "#0e0e0e", fontSize: 20 }}
            aria-hidden
          >
            {semaforo === "verde" ? "✓" : semaforo === "amarelo" ? "!" : semaforo === "vermelho" ? "×" : "…"}
          </div>
          <div className="flex-1">
            <p className="font-display uppercase text-lg leading-tight">
              {sem.label}
              {semaforo !== "pendente" && (
                <span className="ml-2 font-body text-xs text-perestroika-preto/60 uppercase tracking-wider">
                  {score}/4 filtros fortes
                </span>
              )}
            </p>
            <p className="font-body text-sm text-perestroika-preto/85 mt-1">{sem.msg}</p>
            {semaforo === "vermelho" && (
              <label className="mt-3 inline-flex items-center gap-2 font-body text-sm">
                <input
                  type="checkbox"
                  checked={!!value.trocou_problema}
                  onChange={(e) => setValue((prev) => ({ ...prev, trocou_problema: e.target.checked }))}
                  className="h-4 w-4 rounded border-2 border-perestroika-preto/40 accent-perestroika-preto"
                />
                escolhi um problema novo do meu radar
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* ==== BRIEFING ==== */}
      <section aria-label="briefing" className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display uppercase text-2xl">briefing do projeto</h3>
          <span
            className="inline-block h-px flex-1"
            style={{ backgroundColor: `${accent}55` }}
            aria-hidden
          />
        </div>

        <div>
          <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-titulo">
            título do projeto
          </label>
          <input
            id="brief-titulo"
            value={value.titulo ?? ""}
            onChange={(e) => setValue((prev) => ({ ...prev, titulo: e.target.value }))}
            placeholder="ex: bandejão sem desperdício"
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-display text-xl focus:border-perestroika-preto focus:outline-none"
          />
        </div>

        <div>
          <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-hmw">
            1 · problema em formato HMW ({minHmw}+ caracteres)
          </label>
          <TextareaWithVoice
            id="brief-hmw"
            value={value.hmw ?? "Como podemos "}
            onChange={(e) => setValue((prev) => ({ ...prev, hmw: e.target.value }))}
            rows={3}
            placeholder="Como podemos [ação] em/para [grupo específico] [contexto/prazo], sem [restrição]?"
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel="gravar HMW"
          />
          {!hmwOk && (
            <p className="mt-1 font-body text-[11px] text-perestroika-preto/55">
              precisa começar com "Como podemos" e ter no mínimo {minHmw} caracteres.
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-fluxo-p">
              2 · fluxo principal
            </label>
            <select
              id="brief-fluxo-p"
              value={value.fluxo_principal ?? ""}
              onChange={(e) => setValue((prev) => ({ ...prev, fluxo_principal: e.target.value }))}
              className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none"
            >
              <option value="">— escolha —</option>
              {fluxos.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-fluxo-s">
              fluxo secundário (opcional)
            </label>
            <select
              id="brief-fluxo-s"
              value={value.fluxo_secundario ?? ""}
              onChange={(e) => setValue((prev) => ({ ...prev, fluxo_secundario: e.target.value }))}
              className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none"
            >
              <option value="">— nenhum —</option>
              {fluxos.filter((f) => f.value !== value.fluxo_principal).map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="font-body text-sm font-medium mb-1.5">
            3 · evidências que sustentam (1 frase cada, puxadas do módulo 4)
          </p>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                value={value.evidencias_resumo?.[i] ?? ""}
                onChange={(e) => setEv(i, e.target.value)}
                placeholder={`evidência ${i + 1} em 1 frase`}
                className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
              />
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-ganha">
              4 · quem ganha com o problema
            </label>
            <input
              id="brief-ganha"
              value={value.atores_ganha ?? (mapa.data?.ganha.slice(0, 3).join(", ") ?? "")}
              onChange={(e) => setValue((prev) => ({ ...prev, atores_ganha: e.target.value }))}
              placeholder="do seu mapa de atores"
              className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
            />
          </div>
          <div>
            <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-perde">
              quem perde com o problema
            </label>
            <input
              id="brief-perde"
              value={value.atores_perde ?? (mapa.data?.perde.slice(0, 3).join(", ") ?? "")}
              onChange={(e) => setValue((prev) => ({ ...prev, atores_perde: e.target.value }))}
              placeholder="do seu mapa de atores"
              className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="font-body text-sm font-medium block mb-1.5" htmlFor="brief-just">
            5 · por que eu ({minJust}+ caracteres)
          </label>
          <TextareaWithVoice
            id="brief-just"
            value={value.justificativa ?? ""}
            onChange={(e) => setValue((prev) => ({ ...prev, justificativa: e.target.value }))}
            rows={3}
            placeholder="2-3 frases: por que esse problema faz sentido pra você agora"
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel="gravar justificativa"
          />
        </div>
      </section>

      {/* ==== PREVIEW / PDF ==== */}
      <section className="rounded-2xl border-2 border-dashed border-perestroika-preto/25 p-4 bg-perestroika-preto/[0.03]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
          <div className="flex-1">
            <p className="font-body text-sm text-perestroika-preto/85">
              gera um PDF pra você guardar. quando concluir a pílula, ele fica salvo no seu perfil e disponível na tela final.
            </p>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!ready}
              className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-xs uppercase tracking-wide ${
                ready
                  ? "bg-perestroika-preto text-perestroika-bege hover:scale-105"
                  : "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              }`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              baixar prévia do briefing
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55">
          {ready ? "briefing pronto." : "complete os 4 filtros + os 5 blocos pra liberar o fechamento."}
        </p>
        <button
          type="button"
          onClick={handleComplete}
          disabled={!ready || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !ready || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!ready || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? "briefing entregue" : (schema.completion?.label ?? "fechar briefing")}
          {!isCompleted && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
