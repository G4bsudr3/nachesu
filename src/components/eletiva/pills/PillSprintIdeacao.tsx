import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Lightbulb, Pause, Play, Plus, RotateCcw, Timer, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

export type SprintIdeia = {
  id: string;
  rodada: 1 | 2 | 3 | 4;
  texto: string;
  ordem: number;
  createdAt: number;
};

export type SprintIdeacaoValue = {
  ideias?: SprintIdeia[];
};

type Rodada = {
  id: string;
  numero: 1 | 2 | 3 | 4;
  titulo: string;
  meta: number;
  provocacoes: string[];
};

type Schema = {
  type?: "sprint_ideacao";
  briefing_source_module_id?: string;
  matriz_source_module_id?: string;
  seconds_per_round?: number;
  min_total_ideias?: number;
  target_total_ideias?: number;
  rodadas?: Rodada[];
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: SprintIdeacaoValue;
  ideiasMap: Record<string, SprintIdeacaoValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `i-${Math.random().toString(36).slice(2, 10)}`;

function useHmwFromBriefing(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula11-hmw", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        briefing_aula5?: Record<string, { hmw?: string }>;
      };
      for (const b of Object.values(content.briefing_aula5 ?? {})) {
        const h = (b?.hmw ?? "").trim();
        if (h && h.toLowerCase() !== "como podemos") return h;
      }
      return null;
    },
  });
}

function useTopOportunidade(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula11-oport", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        matriz_valor_aula7?: Record<string, { linhas?: { oportunidade?: string }[] }>;
      };
      for (const entry of Object.values(content.matriz_valor_aula7 ?? {})) {
        for (const l of entry?.linhas ?? []) {
          const s = (l?.oportunidade ?? "").trim();
          if (s.length >= 5) return s;
        }
      }
      return null;
    },
  });
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export function PillSprintIdeacao({
  pillId,
  schema,
  accent,
  initial,
  ideiasMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const rodadas = (schema.rodadas ?? []) as Rodada[];
  const perRound = schema.seconds_per_round ?? 300;
  const minTotal = schema.min_total_ideias ?? 15;
  const target = schema.target_total_ideias ?? 20;
  const ctaLabel = schema.completion?.label ?? "entregar sprint";

  const [value, setValue] = useState<SprintIdeacaoValue>(() => ({
    ideias: initial?.ideias ?? [],
  }));

  useEffect(() => {
    if ((initial?.ideias?.length ?? 0) > (value.ideias?.length ?? 0)) {
      setValue({ ideias: initial?.ideias ?? [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.ideias?.length]);

  const status = useAutoSaveField({
    value: { ...ideiasMap, [pillId]: value },
    initial: ideiasMap,
    save,
    field: "ideias_aula11",
  });

  const hmwQuery = useHmwFromBriefing(schema.briefing_source_module_id);
  const oportQuery = useTopOportunidade(schema.matriz_source_module_id);
  const hmw = hmwQuery.data;
  const oport = oportQuery.data;

  // fase: uma por rodada + 'compilacao'
  const [fase, setFase] = useState<"r1" | "r2" | "r3" | "r4" | "compilacao">("r1");
  const rodadaAtiva = useMemo(
    () => rodadas.find((r) => r.id === fase) ?? rodadas[0],
    [fase, rodadas],
  );

  // timer
  const [secondsLeft, setSecondsLeft] = useState(perRound);
  const [running, setRunning] = useState(false);
  const [rodadasFeitas, setRodadasFeitas] = useState<Set<string>>(new Set());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          setRodadasFeitas((prev) => new Set(prev).add(fase));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, fase]);

  const ideias = value.ideias ?? [];
  const ideiasDaRodada = rodadaAtiva
    ? ideias.filter((i) => i.rodada === rodadaAtiva.numero)
    : [];
  const totalIdeias = ideias.length;

  const addIdeia = (texto: string) => {
    const t = texto.trim();
    if (t.length < 3 || !rodadaAtiva) return;
    setValue((prev) => ({
      ideias: [
        ...(prev.ideias ?? []),
        {
          id: uid(),
          rodada: rodadaAtiva.numero,
          texto: t,
          ordem: (prev.ideias?.length ?? 0) + 1,
          createdAt: Date.now(),
        },
      ],
    }));
  };

  const editIdeia = (id: string, texto: string) => {
    setValue((prev) => ({
      ideias: (prev.ideias ?? []).map((i) => (i.id === id ? { ...i, texto } : i)),
    }));
  };

  const removeIdeia = (id: string) => {
    // só permitido na fase de compilação
    if (fase !== "compilacao") return;
    const ok = window.confirm(
      "regra da casa: hoje é dia de VOLUME, não de julgamento. tem certeza que quer apagar essa ideia?",
    );
    if (!ok) return;
    setValue((prev) => ({
      ideias: (prev.ideias ?? []).filter((i) => i.id !== id),
    }));
  };

  const iniciarRodada = () => {
    setSecondsLeft(perRound);
    setRunning(true);
  };

  const irProximaFase = () => {
    setRunning(false);
    const idx = rodadas.findIndex((r) => r.id === fase);
    if (idx === -1 || idx >= rodadas.length - 1) {
      setFase("compilacao");
    } else {
      const proxima = rodadas[idx + 1];
      setFase(proxima.id as typeof fase);
      setSecondsLeft(perRound);
    }
  };

  const irParaFase = (id: typeof fase) => {
    setRunning(false);
    setFase(id);
    setSecondsLeft(perRound);
  };

  const [rascunho, setRascunho] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ready = totalIdeias >= minTotal;

  // provocação rotativa dentro da rodada — troca a cada 30s
  const [provIndex, setProvIndex] = useState(0);
  useEffect(() => {
    setProvIndex(0);
    if (!running || !rodadaAtiva) return;
    const t = window.setInterval(() => {
      setProvIndex((i) => (i + 1) % (rodadaAtiva.provocacoes.length || 1));
    }, 30_000);
    return () => window.clearInterval(t);
  }, [fase, running, rodadaAtiva]);

  const isCompilacao = fase === "compilacao";
  const progressoRodada = rodadaAtiva
    ? Math.min(100, (ideiasDaRodada.length / rodadaAtiva.meta) * 100)
    : 0;
  const progressoTempo = ((perRound - secondsLeft) / perRound) * 100;

  return (
    <div className="space-y-5">
      {/* pull HMW + oportunidade */}
      {(hmw || oport) && (
        <aside
          className="rounded-2xl p-4 sm:p-5 space-y-2"
          style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
            você está resolvendo isso
          </p>
          {hmw && (
            <p className="font-display uppercase text-base sm:text-lg leading-snug text-perestroika-preto">
              como podemos {hmw.replace(/^como podemos/i, "").trim()}?
            </p>
          )}
          {oport && (
            <p className="font-body text-sm text-perestroika-preto/80">
              oportunidade puxada da aula 7 · <strong>{oport}</strong>
            </p>
          )}
        </aside>
      )}

      {/* seletor de rodadas */}
      <nav aria-label="rodadas do sprint" className="flex flex-wrap gap-2">
        {rodadas.map((r) => {
          const ativa = r.id === fase;
          const feita = rodadasFeitas.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => irParaFase(r.id as typeof fase)}
              className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-body text-xs uppercase tracking-wider transition-colors"
              style={{
                borderColor: ativa ? accent : "rgba(9,9,9,0.15)",
                backgroundColor: ativa ? accent : "transparent",
                color: ativa ? "#fff" : "rgba(9,9,9,0.7)",
              }}
            >
              {feita && <Check className="h-3 w-3" aria-hidden />}
              r{r.numero} · {r.titulo}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => irParaFase("compilacao")}
          className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-body text-xs uppercase tracking-wider transition-colors"
          style={{
            borderColor: isCompilacao ? accent : "rgba(9,9,9,0.15)",
            backgroundColor: isCompilacao ? accent : "transparent",
            color: isCompilacao ? "#fff" : "rgba(9,9,9,0.7)",
          }}
        >
          compilação · {totalIdeias}
        </button>
      </nav>

      {!isCompilacao && rodadaAtiva && (
        <section
          aria-label={`rodada ${rodadaAtiva.numero}`}
          className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 space-y-4"
        >
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                rodada {rodadaAtiva.numero} de {rodadas.length}
              </p>
              <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
                {rodadaAtiva.titulo}
              </h3>
              <p className="font-body text-xs text-perestroika-preto/60 mt-1">
                meta: {rodadaAtiva.meta} ideias · <strong>{ideiasDaRodada.length}</strong> agora
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-perestroika-preto/8 px-3 py-1.5">
                <Timer className="h-4 w-4 text-perestroika-preto/70" aria-hidden />
                <span className="font-display text-xl tabular-nums text-perestroika-preto leading-none">
                  {formatTime(secondsLeft)}
                </span>
              </div>
              {!running ? (
                <button
                  type="button"
                  onClick={iniciarRodada}
                  disabled={secondsLeft === 0}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-body text-xs uppercase tracking-wider text-white transition-colors disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  {secondsLeft === perRound ? "iniciar" : "retomar"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRunning(false)}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/25 px-3 py-2 font-body text-xs uppercase tracking-wider text-perestroika-preto"
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden /> pausar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setSecondsLeft(perRound);
                }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-perestroika-preto/55 hover:text-perestroika-preto"
                aria-label="reiniciar rodada"
                title="reiniciar cronômetro"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* barras de progresso */}
          <div className="space-y-2">
            <div className="h-1 w-full rounded-full bg-perestroika-preto/10 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${progressoTempo}%`, backgroundColor: accent, opacity: 0.55 }}
              />
            </div>
            <div className="h-2 w-full rounded-full bg-perestroika-preto/10 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${progressoRodada}%`, backgroundColor: accent }}
              />
            </div>
          </div>

          {/* provocação rotativa */}
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-2"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
            <p className="font-body text-sm text-perestroika-preto/85 leading-snug">
              {rodadaAtiva.provocacoes[provIndex] ?? rodadaAtiva.provocacoes[0]}
            </p>
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rascunho.trim()) return;
              addIdeia(rascunho);
              setRascunho("");
              inputRef.current?.focus();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              placeholder="joga a próxima ideia. curta. sem julgar."
              className="flex-1 rounded-full border-2 border-perestroika-preto/15 bg-white px-4 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none"
              maxLength={140}
              aria-label="nova ideia"
            />
            <button
              type="submit"
              disabled={rascunho.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 font-body text-xs uppercase tracking-wider text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> ideia
            </button>
          </form>

          <ul className="space-y-1.5">
            {ideiasDaRodada.map((i, idx) => (
              <li
                key={i.id}
                className="rounded-xl bg-white border-2 border-perestroika-preto/10 px-3 py-2 flex items-start gap-2"
              >
                <span
                  className="font-display text-sm tabular-nums flex-shrink-0"
                  style={{ color: accent }}
                >
                  {idx + 1}.
                </span>
                <p className="font-body text-sm text-perestroika-preto/90 leading-snug flex-1">
                  {i.texto}
                </p>
              </li>
            ))}
            {ideiasDaRodada.length === 0 && (
              <li className="font-body text-xs text-perestroika-preto/50 italic px-1">
                nenhuma ideia ainda nessa rodada. dispara a primeira, mesmo que pareça óbvia.
              </li>
            )}
          </ul>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <p className="font-body text-[11px] text-perestroika-preto/55">
              hoje ninguém apaga. só na fase de compilação, e mesmo assim com aviso.
            </p>
            <button
              type="button"
              onClick={irProximaFase}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/25 px-4 py-2 font-body text-xs uppercase tracking-wider text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              {rodadaAtiva.numero === rodadas.length ? "ir pra compilação" : "próxima rodada"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {isCompilacao && (
        <section
          aria-label="compilação"
          className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5 space-y-4"
        >
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                compilação · últimos 2 min
              </p>
              <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
                {totalIdeias} ideia{totalIdeias === 1 ? "" : "s"} no total
              </h3>
              <p className="font-body text-xs text-perestroika-preto/60 mt-1">
                mínimo {minTotal} · meta {target}. edita se quiser. deletar é desencorajado.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {rodadas.map((r) => {
                const n = ideias.filter((i) => i.rodada === r.numero).length;
                return (
                  <div key={r.id} className="text-center">
                    <p className="font-display text-lg leading-none tabular-nums" style={{ color: accent }}>
                      {n}
                    </p>
                    <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55">
                      r{r.numero}
                    </p>
                  </div>
                );
              })}
            </div>
          </header>

          {totalIdeias < minTotal && (
            <div className="rounded-xl bg-perestroika-vermelho/8 border-2 border-perestroika-vermelho/25 px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-perestroika-vermelho" aria-hidden />
              <p className="font-body text-xs text-perestroika-preto/80">
                faltam {minTotal - totalIdeias} pra bater o mínimo. volta numa rodada e joga mais algumas.
              </p>
            </div>
          )}

          <ul className="space-y-1.5">
            {ideias.map((i, idx) => (
              <li
                key={i.id}
                className="rounded-xl bg-white border-2 border-perestroika-preto/10 px-3 py-2 flex items-start gap-2"
              >
                <span
                  className="font-display text-sm tabular-nums flex-shrink-0 pt-0.5"
                  style={{ color: accent }}
                >
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={i.texto}
                  onChange={(e) => editIdeia(i.id, e.target.value)}
                  className="flex-1 bg-transparent font-body text-sm text-perestroika-preto/90 focus:outline-none"
                />
                <span className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/40 pt-1 flex-shrink-0">
                  r{i.rodada}
                </span>
                <button
                  type="button"
                  onClick={() => removeIdeia(i.id)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-perestroika-preto/35 hover:text-perestroika-vermelho hover:bg-perestroika-vermelho/10 transition-colors"
                  aria-label="apagar ideia"
                  title="não recomendo apagar hoje"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
            {ideias.length === 0 && (
              <li className="font-body text-sm text-perestroika-preto/55 italic">
                nenhuma ideia registrada ainda. volta pra rodada 1 e começa o cronômetro.
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60">
              mínimo {minTotal} ideias pra entregar · você tem {totalIdeias}
            </p>
          )}
          {ready && totalIdeias < target && (
            <p className="font-body text-xs text-perestroika-preto/60">
              chegou no mínimo. bora tentar as {target}?
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-body text-sm uppercase tracking-wider transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isCompleted ? "rgba(9,9,9,0.15)" : accent,
            color: isCompleted ? "rgba(9,9,9,0.6)" : "#fff",
          }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> entregue
            </>
          ) : (
            <>
              {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
