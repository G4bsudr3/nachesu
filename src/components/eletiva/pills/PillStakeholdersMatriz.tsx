import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2, Users, Megaphone, HandshakeIcon, ShieldAlert, Check, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

type CategoriaId = "usuarios" | "influenciadores" | "parceiros" | "oponentes";
type QuadranteId = "aa" | "ab" | "ba" | "bb";

export type Stakeholder = {
  id: string;
  categoria: CategoriaId;
  nome: string;
  interesse: string;
  influencia: string;
  quadrante?: QuadranteId;
};

export type StakeholdersMatrizValue = {
  stakeholders?: Stakeholder[];
};

type CategoriaCfg = { id: CategoriaId; label: string; hint?: string };
type QuadranteCfg = { id: QuadranteId; label: string; hint?: string };

type Schema = {
  type?: "stakeholders_matriz";
  mapa_atores_source_module_id?: string;
  categorias?: CategoriaCfg[];
  quadrantes?: QuadranteCfg[];
  min_per_categoria?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: StakeholdersMatrizValue;
  stakeholdersMap: Record<string, StakeholdersMatrizValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const CAT_ICON: Record<CategoriaId, typeof Users> = {
  usuarios: Users,
  influenciadores: Megaphone,
  parceiros: HandshakeIcon,
  oponentes: ShieldAlert,
};

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `s-${Math.random().toString(36).slice(2, 10)}`);

const emptyStakeholder = (categoria: CategoriaId): Stakeholder => ({
  id: uid(),
  categoria,
  nome: "",
  interesse: "",
  influencia: "",
});

function useMapaAtoresSuggestions(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula10-mapa-atores", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        mapa_atores_aula3?: Record<string, Record<string, Array<{ nome?: string }>>>;
      };
      const nomes = new Set<string>();
      for (const pill of Object.values(content.mapa_atores_aula3 ?? {})) {
        for (const list of Object.values(pill)) {
          for (const a of list ?? []) {
            const n = (a?.nome ?? "").trim();
            if (n.length >= 2) nomes.add(n);
          }
        }
      }
      return Array.from(nomes);
    },
  });
}

const isValid = (s: Stakeholder) =>
  s.nome.trim().length >= 2 && s.interesse.trim().length >= 5 && s.influencia.trim().length >= 5;

export function PillStakeholdersMatriz({
  pillId,
  schema,
  accent,
  initial,
  stakeholdersMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const categorias = schema.categorias ?? [];
  const quadrantes = schema.quadrantes ?? [];
  const minPerCat = schema.min_per_categoria ?? 2;
  const ctaLabel = schema.completion?.label ?? "entregar meu mapa";

  const buildInitial = (): StakeholdersMatrizValue => {
    const list = initial?.stakeholders && initial.stakeholders.length > 0 ? initial.stakeholders : [];
    if (list.length > 0) return { stakeholders: list };
    // seed 2 empty por categoria
    const seed: Stakeholder[] = [];
    categorias.forEach((c) => {
      seed.push(emptyStakeholder(c.id));
      seed.push(emptyStakeholder(c.id));
    });
    return { stakeholders: seed };
  };

  const [value, setValue] = useState<StakeholdersMatrizValue>(buildInitial);

  useEffect(() => {
    if (initial?.stakeholders && initial.stakeholders.length > 0) {
      setValue({ stakeholders: initial.stakeholders });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.stakeholders?.length]);

  const status = useAutoSaveField({
    value: { ...stakeholdersMap, [pillId]: value },
    initial: stakeholdersMap,
    save,
    field: "stakeholders_aula10",
  });

  const suggestQ = useMapaAtoresSuggestions(schema.mapa_atores_source_module_id);
  const suggestions = suggestQ.data ?? [];
  const suggestionsUsed = new Set(
    (value.stakeholders ?? []).map((s) => s.nome.trim().toLowerCase()).filter(Boolean),
  );
  const availableSuggestions = suggestions.filter((n) => !suggestionsUsed.has(n.toLowerCase()));

  const updateStakeholder = (id: string, patch: Partial<Stakeholder>) => {
    setValue((prev) => ({
      stakeholders: (prev.stakeholders ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const addStakeholder = (cat: CategoriaId, nome = "") => {
    setValue((prev) => ({
      stakeholders: [...(prev.stakeholders ?? []), { ...emptyStakeholder(cat), nome }],
    }));
  };

  const removeStakeholder = (id: string) => {
    setValue((prev) => ({
      stakeholders: (prev.stakeholders ?? []).filter((s) => s.id !== id),
    }));
  };

  const stakeholders = value.stakeholders ?? [];

  const perCatValid = useMemo(() => {
    const out: Record<CategoriaId, { filled: number; ok: boolean }> = {
      usuarios: { filled: 0, ok: false },
      influenciadores: { filled: 0, ok: false },
      parceiros: { filled: 0, ok: false },
      oponentes: { filled: 0, ok: false },
    };
    categorias.forEach((c) => {
      const filled = stakeholders.filter((s) => s.categoria === c.id && isValid(s)).length;
      out[c.id] = { filled, ok: filled >= minPerCat };
    });
    return out;
  }, [stakeholders, categorias, minPerCat]);

  const validStakeholders = stakeholders.filter(isValid);
  const allQuadOk = validStakeholders.every((s) => !!s.quadrante);
  const allCatOk = categorias.every((c) => perCatValid[c.id].ok);
  const ready = allCatOk && allQuadOk && validStakeholders.length >= categorias.length * minPerCat;

  return (
    <div className="space-y-6">
      {/* âncora: sugestões do módulo 3 */}
      {availableSuggestions.length > 0 && (
        <aside
          className="rounded-2xl p-4 sm:p-5 space-y-2"
          style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
            atores que você já mapeou (módulo 3) — clique pra puxar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableSuggestions.slice(0, 12).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => addStakeholder("parceiros", n)}
                className="inline-flex items-center gap-1 rounded-full border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-1 font-body text-xs text-perestroika-preto/80 hover:border-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
              >
                <Plus className="h-3 w-3" aria-hidden />
                {n}
              </button>
            ))}
          </div>
          <p className="font-body text-[11px] text-perestroika-preto/55">
            você pode mudar a categoria depois. o botão adiciona em "parceiros" só pra começar rápido.
          </p>
        </aside>
      )}

      <div className="rounded-2xl bg-[#F5EEE1] p-4 sm:p-5 border-2 border-perestroika-preto/15">
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed">
          <strong>parte 1:</strong> pelo menos <strong>{minPerCat} nomes por categoria</strong> ({categorias.length * minPerCat} no total).
          nome específico — "Kamila do Sebrae BH", não "o Sebrae".
        </p>
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed mt-2">
          <strong>parte 2:</strong> pra cada nome, escolha um quadrante da matriz poder × interesse.
        </p>
      </div>

      {/* parte 1: 4 categorias */}
      <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {categorias.map((c) => {
          const Icon = CAT_ICON[c.id] ?? Users;
          const state = perCatValid[c.id];
          const list = stakeholders.filter((s) => s.categoria === c.id);
          return (
            <section
              key={c.id}
              aria-label={c.label}
              className="rounded-2xl border-2 bg-perestroika-bege p-4 space-y-3"
              style={{ borderColor: state.ok ? accent : "rgba(9,9,9,0.15)" }}
            >
              <header className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display uppercase text-sm tracking-[0.14em] text-perestroika-preto leading-tight">
                      {c.label}
                    </p>
                    {c.hint && (
                      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                        {c.hint}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 font-body text-[11px] uppercase tracking-wider tabular-nums shrink-0"
                  style={{
                    backgroundColor: state.ok ? accent : "rgba(9,9,9,0.08)",
                    color: state.ok ? "#fff" : "rgba(9,9,9,0.55)",
                  }}
                >
                  {state.filled}/{minPerCat}
                </span>
              </header>

              <ul className="space-y-2">
                {list.map((s) => (
                  <StakeholderRow
                    key={s.id}
                    stakeholder={s}
                    accent={accent}
                    quadrantes={quadrantes}
                    onChange={(patch) => updateStakeholder(s.id, patch)}
                    onRemove={() => removeStakeholder(s.id)}
                    valid={isValid(s)}
                  />
                ))}
              </ul>

              <button
                type="button"
                onClick={() => addStakeholder(c.id)}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-perestroika-preto/25 px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/65 hover:border-perestroika-preto hover:text-perestroika-preto transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> adicionar nome
              </button>
            </section>
          );
        })}
      </div>

      {/* preview da matriz */}
      <MatrizPreview
        quadrantes={quadrantes}
        stakeholders={validStakeholders}
        accent={accent}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60">
              {!allCatOk
                ? `preencha pelo menos ${minPerCat} nomes válidos em cada categoria.`
                : "escolha um quadrante para cada nome válido."}
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

function StakeholderRow({
  stakeholder,
  accent,
  quadrantes,
  onChange,
  onRemove,
  valid,
}: {
  stakeholder: Stakeholder;
  accent: string;
  quadrantes: QuadranteCfg[];
  onChange: (patch: Partial<Stakeholder>) => void;
  onRemove: () => void;
  valid: boolean;
}) {
  const quadranteFaltando = valid && !stakeholder.quadrante;
  return (
    <li
      className="rounded-xl border-2 p-3 space-y-2"
      style={{
        borderColor: valid && stakeholder.quadrante ? `${accent}66` : "rgba(9,9,9,0.10)",
        backgroundColor: valid && stakeholder.quadrante ? `${accent}0A` : "transparent",
      }}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={stakeholder.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          placeholder="ex.: Kamila do Sebrae BH"
          className="flex-1 rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
          aria-label="nome específico do stakeholder"
        />
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-perestroika-preto/55 hover:text-perestroika-vermelho hover:bg-perestroika-vermelho/10 transition-colors"
          aria-label="remover stakeholder"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        <input
          type="text"
          value={stakeholder.interesse}
          onChange={(e) => onChange({ interesse: e.target.value })}
          placeholder="o que ele quer?"
          className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
        />
        <input
          type="text"
          value={stakeholder.influencia}
          onChange={(e) => onChange({ influencia: e.target.value })}
          placeholder="como pode ajudar ou atrapalhar?"
          className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          quadrante poder × interesse
        </label>
        <select
          value={stakeholder.quadrante ?? ""}
          onChange={(e) => onChange({ quadrante: (e.target.value || undefined) as Stakeholder["quadrante"] })}
          className="rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-2 py-1.5 font-body text-xs focus:border-perestroika-preto focus:outline-none"
          disabled={!valid}
        >
          <option value="">escolher…</option>
          {quadrantes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.label}
            </option>
          ))}
        </select>
        {quadranteFaltando && (
          <span className="flex items-center gap-1 font-body text-[11px] text-[#fd4644]">
            <AlertCircle className="h-3 w-3" aria-hidden /> falta o quadrante
          </span>
        )}
      </div>
    </li>
  );
}

function MatrizPreview({
  quadrantes,
  stakeholders,
  accent,
}: {
  quadrantes: QuadranteCfg[];
  stakeholders: Stakeholder[];
  accent: string;
}) {
  if (stakeholders.length === 0) return null;
  const byQ: Record<string, Stakeholder[]> = {};
  quadrantes.forEach((q) => (byQ[q.id] = []));
  stakeholders.forEach((s) => {
    if (s.quadrante && byQ[s.quadrante]) byQ[s.quadrante].push(s);
  });

  return (
    <section aria-label="matriz poder × interesse" className="space-y-2">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
        preview · matriz poder × interesse
      </p>
      <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        {quadrantes.map((q) => {
          const list = byQ[q.id] ?? [];
          return (
            <article
              key={q.id}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 space-y-1.5 min-h-[96px]"
            >
              <p
                className="font-display uppercase text-xs tracking-[0.14em]"
                style={{ color: accent }}
              >
                {q.label}
              </p>
              {q.hint && (
                <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50">
                  {q.hint}
                </p>
              )}
              {list.length === 0 ? (
                <p className="font-body text-xs text-perestroika-preto/45 italic">nenhum ainda</p>
              ) : (
                <ul className="flex flex-wrap gap-1">
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-full bg-perestroika-preto/8 px-2 py-0.5 font-body text-[11px] text-perestroika-preto"
                      style={{ backgroundColor: `${accent}22` }}
                    >
                      {s.nome}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
