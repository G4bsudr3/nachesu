import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Check, Target, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

export type SelecaoIdeiaValue = {
  quadrantes?: Record<string, string>; // ideiaId -> quadranteId
  ideia_final?: string;                // texto (não id) da ideia escolhida
  raridade?: "rara" | "meio_obvia" | "obvia";
  raridade_confirmada?: boolean;       // aceitou o alerta pra "óbvia"
  versao_a?: string;
  versao_b?: string;
  versao_c?: string;
};

type Quadrante = {
  id: string;
  titulo: string;
  subtitulo: string;
  hint?: string;
};

type Schema = {
  type?: "selecao_ideia";
  ideias_source_module_id?: string;
  quadrantes?: Quadrante[];
  raridade_opcoes?: { value: string; label: string }[];
  similarity_warn_ratio?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: SelecaoIdeiaValue;
  selecaoMap: Record<string, SelecaoIdeiaValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

type Ideia = { id: string; rodada?: number; texto: string };

function useIdeiasAula11(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula12-ideias", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<Ideia[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        ideias_aula11?: Record<string, { ideias?: Ideia[] }>;
      };
      const flat: Ideia[] = [];
      for (const entry of Object.values(content.ideias_aula11 ?? {})) {
        for (const i of entry?.ideias ?? []) {
          const t = (i?.texto ?? "").trim();
          if (t.length >= 3 && i?.id) flat.push({ id: i.id, rodada: i.rodada, texto: t });
        }
      }
      return flat;
    },
  });
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

const similarity = (a: string, b: string) => {
  const A = new Set(normalize(a));
  const B = new Set(normalize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((w) => {
    if (B.has(w)) inter++;
  });
  return inter / Math.min(A.size, B.size);
};

export function PillSelecaoIdeia({
  pillId,
  schema,
  accent,
  initial,
  selecaoMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const quadrantes = schema.quadrantes ?? [];
  const raridadeOpcoes = schema.raridade_opcoes ?? [];
  const warnRatio = schema.similarity_warn_ratio ?? 0.7;
  const ctaLabel = schema.completion?.label ?? "entregar seleção";

  const ideiasQ = useIdeiasAula11(schema.ideias_source_module_id);
  const ideias = ideiasQ.data ?? [];

  const [value, setValue] = useState<SelecaoIdeiaValue>(() => ({
    quadrantes: initial?.quadrantes ?? {},
    ideia_final: initial?.ideia_final ?? "",
    raridade: initial?.raridade,
    raridade_confirmada: initial?.raridade_confirmada ?? false,
    versao_a: initial?.versao_a ?? "",
    versao_b: initial?.versao_b ?? "",
    versao_c: initial?.versao_c ?? "",
  }));

  const status = useAutoSaveField({
    value: { ...selecaoMap, [pillId]: value },
    initial: selecaoMap,
    save,
    field: "selecao_aula12",
  });

  const [fase, setFase] = useState<"matriz" | "escolha" | "refino">("matriz");

  // agrupa ideias por quadrante atual
  const porQuadrante = useMemo(() => {
    const m: Record<string, Ideia[]> = { _nao: [] };
    quadrantes.forEach((q) => (m[q.id] = []));
    ideias.forEach((i) => {
      const q = value.quadrantes?.[i.id];
      if (q && m[q]) m[q].push(i);
      else m._nao.push(i);
    });
    return m;
  }, [ideias, value.quadrantes, quadrantes]);

  const ideaisIds = useMemo(() => {
    return ideias.filter((i) => value.quadrantes?.[i.id] === "ideal").map((i) => i.id);
  }, [ideias, value.quadrantes]);

  const setQuadrante = (ideiaId: string, quadId: string) => {
    setValue((prev) => ({
      ...prev,
      quadrantes: { ...(prev.quadrantes ?? {}), [ideiaId]: quadId },
    }));
  };

  // toda vez que a escolha final some do quadrante ideal, limpa
  useEffect(() => {
    if (!value.ideia_final) return;
    const stillIdeal = ideais_contains(ideias, value.ideia_final, value.quadrantes ?? {});
    if (!stillIdeal) {
      setValue((prev) => ({ ...prev, ideia_final: "", raridade: undefined, raridade_confirmada: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaisIds.length]);

  const escolhaTexto = value.ideia_final ?? "";
  const versao_a = value.versao_a ?? escolhaTexto;
  const versao_b = value.versao_b ?? "";
  const versao_c = value.versao_c ?? "";

  // similaridade
  const simBA = similarity(versao_b, versao_a);
  const simCA = similarity(versao_c, versao_a);
  const simCB = similarity(versao_c, versao_b);

  const versoesOk =
    versao_a.trim().length >= 15 &&
    versao_b.trim().length >= 15 &&
    versao_c.trim().length >= 15 &&
    simBA < warnRatio &&
    simCA < warnRatio &&
    simCB < warnRatio;

  const naoAlocadas = ideias.length - Object.values(value.quadrantes ?? {}).filter(Boolean).length;
  const matrizOk = ideias.length >= 3 && naoAlocadas === 0;
  const ideiaOk = !!value.ideia_final;
  const raridadeOk = !!value.raridade && (value.raridade !== "obvia" || value.raridade_confirmada);

  const ready = matrizOk && ideiaOk && raridadeOk && versoesOk;

  const abas: { id: typeof fase; label: string; ok: boolean }[] = [
    { id: "matriz", label: "1. matriz", ok: matrizOk },
    { id: "escolha", label: "2. escolha", ok: ideiaOk && raridadeOk },
    { id: "refino", label: "3. refinamento", ok: versoesOk },
  ];

  if (ideiasQ.isLoading) {
    return (
      <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5">
        <p className="font-body text-sm text-perestroika-preto/60">carregando suas 20 ideias da módulo 11…</p>
      </div>
    );
  }

  if (!ideiasQ.isLoading && ideias.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-perestroika-vermelho/30 bg-perestroika-vermelho/8 p-5 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 text-perestroika-vermelho" aria-hidden />
        <div>
          <p className="font-body text-sm text-perestroika-preto/85">
            você ainda não tem ideias registradas na módulo 11.
          </p>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            volta pro módulo 11 e conclui o sprint pra desbloquear a seleção.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <aside
        className="rounded-2xl p-4 sm:p-5 space-y-2"
        style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
      >
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          suas ideias da módulo 11
        </p>
        <p className="font-display uppercase text-xl leading-none text-perestroika-preto">
          {ideias.length} ideias na mesa
        </p>
        <p className="font-body text-xs text-perestroika-preto/70">
          hoje: cada uma vai pra um dos 4 quadrantes. depois você escolhe UMA e refina em 3 versões.
        </p>
      </aside>

      {/* abas */}
      <nav aria-label="etapas" className="flex flex-wrap gap-2">
        {abas.map((a) => {
          const ativa = a.id === fase;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setFase(a.id)}
              className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-body text-xs uppercase tracking-wider transition-colors"
              style={{
                borderColor: ativa ? accent : "rgba(9,9,9,0.15)",
                backgroundColor: ativa ? accent : "transparent",
                color: ativa ? "#fff" : "rgba(9,9,9,0.7)",
              }}
            >
              {a.ok && <Check className="h-3 w-3" aria-hidden />}
              {a.label}
            </button>
          );
        })}
      </nav>

      {fase === "matriz" && (
        <section aria-label="matriz" className="space-y-4">
          <header>
            <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
              matriz impacto × viabilidade
            </h3>
            <p className="font-body text-xs text-perestroika-preto/60 mt-1">
              classifica cada ideia no quadrante que ela merece. faltam {naoAlocadas}.
            </p>
          </header>

          {/* quadrantes */}
          <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
            {quadrantes.map((q) => (
              <article
                key={q.id}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2"
              >
                <header>
                  <p className="font-display uppercase text-lg leading-none" style={{ color: accent }}>
                    {q.titulo}
                  </p>
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mt-0.5">
                    {q.subtitulo}
                  </p>
                  {q.hint && (
                    <p className="font-body text-[11px] italic text-perestroika-preto/50 mt-1">
                      {q.hint}
                    </p>
                  )}
                </header>
                <ul className="space-y-1">
                  {porQuadrante[q.id]?.length === 0 && (
                    <li className="font-body text-[11px] italic text-perestroika-preto/60">
                      nenhuma ideia aqui ainda.
                    </li>
                  )}
                  {porQuadrante[q.id]?.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-lg bg-white border border-perestroika-preto/10 px-2 py-1 flex items-start gap-2"
                    >
                      <p className="font-body text-xs text-perestroika-preto/85 flex-1 leading-snug">
                        {i.texto}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setValue((prev) => {
                            const q2 = { ...(prev.quadrantes ?? {}) };
                            delete q2[i.id];
                            return { ...prev, quadrantes: q2 };
                          });
                        }}
                        className="text-perestroika-preto/60 hover:text-perestroika-vermelho text-[10px] uppercase tracking-wider"
                        aria-label="devolver ao pool"
                      >
                        devolver
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* pool de não-alocadas */}
          {porQuadrante._nao.length > 0 && (
            <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/25 bg-white p-4 space-y-2">
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                a classificar · {porQuadrante._nao.length}
              </p>
              <ul className="space-y-1.5">
                {porQuadrante._nao.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-xl border border-perestroika-preto/10 bg-perestroika-bege px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2"
                  >
                    <p className="font-body text-sm text-perestroika-preto/90 flex-1 leading-snug">
                      {i.texto}
                    </p>
                    <select
                      value=""
                      onChange={(e) => e.target.value && setQuadrante(i.id, e.target.value)}
                      className="rounded-full border-2 border-perestroika-preto/15 bg-white px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto focus:border-perestroika-preto focus:outline-none"
                      aria-label={`classificar ideia: ${i.texto}`}
                    >
                      <option value="">classificar…</option>
                      {quadrantes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.titulo}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matrizOk && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFase("escolha")}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/25 px-4 py-2 font-body text-xs uppercase tracking-wider text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
              >
                ir pra escolha <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}
        </section>
      )}

      {fase === "escolha" && (
        <section aria-label="escolha" className="space-y-4">
          <header>
            <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
              escolhe UMA no quadrante ideal
            </h3>
            <p className="font-body text-xs text-perestroika-preto/60 mt-1">
              {ideaisIds.length === 0
                ? "nenhuma ideia no quadrante IDEAL ainda. volta na matriz."
                : `${ideaisIds.length} candidata${ideaisIds.length === 1 ? "" : "s"}. escolhe uma.`}
            </p>
          </header>

          <ul className="space-y-1.5">
            {ideias
              .filter((i) => value.quadrantes?.[i.id] === "ideal")
              .map((i) => {
                const selected = value.ideia_final === i.texto;
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setValue((prev) => ({
                          ...prev,
                          ideia_final: i.texto,
                          versao_a: prev.versao_a && prev.versao_a.length > 0 ? prev.versao_a : i.texto,
                          raridade: prev.ideia_final === i.texto ? prev.raridade : undefined,
                          raridade_confirmada: prev.ideia_final === i.texto ? prev.raridade_confirmada : false,
                        }))
                      }
                      className="w-full text-left rounded-xl border-2 px-3 py-2.5 flex items-start gap-2 transition-colors"
                      style={{
                        borderColor: selected ? accent : "rgba(9,9,9,0.15)",
                        backgroundColor: selected ? `${accent}18` : "#fff",
                      }}
                    >
                      <Target
                        className="h-4 w-4 mt-0.5 flex-shrink-0"
                        style={{ color: selected ? accent : "rgba(9,9,9,0.35)" }}
                        aria-hidden
                      />
                      <p className="font-body text-sm text-perestroika-preto/90 leading-snug flex-1">
                        {i.texto}
                      </p>
                      {selected && (
                        <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: accent }}>
                          escolhida
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>

          {value.ideia_final && (
            <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3">
              <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                filtro de raridade
              </p>
              <p className="font-body text-sm text-perestroika-preto/85">
                essa ideia é rara ou é a solução óbvia que 5 outros alunos já pensariam?
              </p>
              <div className="space-y-2">
                {raridadeOpcoes.map((o) => {
                  const active = value.raridade === o.value;
                  return (
                    <label
                      key={o.value}
                      className="flex items-start gap-2 rounded-xl border-2 px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        borderColor: active ? accent : "rgba(9,9,9,0.15)",
                        backgroundColor: active ? `${accent}12` : "#fff",
                      }}
                    >
                      <input
                        type="radio"
                        name="raridade"
                        value={o.value}
                        checked={active}
                        onChange={() =>
                          setValue((prev) => ({
                            ...prev,
                            raridade: o.value as SelecaoIdeiaValue["raridade"],
                            raridade_confirmada: o.value === "obvia" ? false : true,
                          }))
                        }
                        className="mt-1 accent-current"
                        style={{ accentColor: accent }}
                      />
                      <span className="font-body text-sm text-perestroika-preto/85">{o.label}</span>
                    </label>
                  );
                })}
              </div>
              {value.raridade === "obvia" && !value.raridade_confirmada && (
                <div className="rounded-xl bg-perestroika-vermelho/8 border-2 border-perestroika-vermelho/25 px-3 py-3 space-y-2">
                  <p className="font-body text-sm text-perestroika-preto/85">
                    tá certo dessa escolha? ideias óbvias exigem execução impecável pra brilhar. topa?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setValue((prev) => ({ ...prev, raridade_confirmada: true }))}
                      className="rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wider text-white"
                      style={{ backgroundColor: accent }}
                    >
                      topo, sigo com ela
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue((prev) => ({ ...prev, raridade: undefined }))}
                      className="rounded-full border-2 border-perestroika-preto/25 px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto"
                    >
                      volto e escolho outra
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {ideiaOk && raridadeOk && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFase("refino")}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/25 px-4 py-2 font-body text-xs uppercase tracking-wider text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
              >
                ir pro refinamento <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}
        </section>
      )}

      {fase === "refino" && (
        <section aria-label="refinamento" className="space-y-4">
          <header>
            <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
              3 versões da mesma ideia
            </h3>
            <p className="font-body text-xs text-perestroika-preto/60 mt-1">
              A é a original. B varia a ESCALA. C varia o ÂNGULO (quem paga, modelo, público).
            </p>
          </header>

          <VersaoField
            label="versão A · original"
            hint="descreve a ideia escolhida em 2 frases."
            value={versao_a}
            onChange={(v) => setValue((prev) => ({ ...prev, versao_a: v }))}
            accent={accent}
          />
          <VersaoField
            label="versão B · variação de escala"
            hint="menor, mais focada. ex: numa sala em vez de todas."
            value={versao_b}
            onChange={(v) => setValue((prev) => ({ ...prev, versao_b: v }))}
            accent={accent}
            sim={simBA}
            simThreshold={warnRatio}
            simLabel="versão A"
          />
          <VersaoField
            label="versão C · variação de ângulo"
            hint="quem paga muda, ou modelo muda, ou público muda."
            value={versao_c}
            onChange={(v) => setValue((prev) => ({ ...prev, versao_c: v }))}
            accent={accent}
            sim={Math.max(simCA, simCB)}
            simThreshold={warnRatio}
            simLabel={simCA >= simCB ? "versão A" : "versão B"}
          />
        </section>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden />
              falta: {[
                !matrizOk && "classificar todas",
                !ideiaOk && "escolher a ideia",
                !raridadeOk && "confirmar raridade",
                !versoesOk && "3 versões distintas",
              ]
                .filter(Boolean)
                .join(" · ")}
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

function ideais_contains(ideias: Ideia[], texto: string, quadrantes: Record<string, string>) {
  return ideias.some((i) => i.texto === texto && quadrantes[i.id] === "ideal");
}

function VersaoField({
  label,
  hint,
  value,
  onChange,
  accent,
  sim,
  simThreshold,
  simLabel,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
  sim?: number;
  simThreshold?: number;
  simLabel?: string;
}) {
  const warn = sim !== undefined && simThreshold !== undefined && sim >= simThreshold && value.trim().length >= 15;
  return (
    <div className="space-y-1.5">
      <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
        {label}
      </label>
      <p className="font-body text-[11px] italic text-perestroika-preto/50">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto focus:border-perestroika-preto focus:outline-none resize-y"
        style={warn ? { borderColor: `${accent}80` } : undefined}
        maxLength={400}
      />
      {warn && (
        <p className="font-body text-[11px] flex items-center gap-1" style={{ color: accent }}>
          <AlertCircle className="h-3 w-3" aria-hidden />
          essa versão está muito parecida com a {simLabel}. muda o quê muda?
        </p>
      )}
    </div>
  );
}
