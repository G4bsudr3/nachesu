import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

type Autoteste = {
  opera_sem_principal?: "sim" | "nao" | "";
  custo_menor_receita?: "sim" | "nao" | "naosei" | "";
  parceiro_critico?: "sim" | "nao" | "";
  parceiro_nome?: string;
};

export type BMCValue = {
  segmento?: string;
  canais?: string;
  receitas?: string[];
  custos?: string[];
  autoteste?: Autoteste;
};

type Bloco = { id: "segmento" | "canais"; titulo: string; hint: string; min_chars?: number };

type Schema = {
  type?: "bmc_simplificado";
  proposta_source_module_id?: string;
  stakeholders_source_module_id?: string;
  blocos?: Bloco[];
  receitas?: { min?: number; sugestoes?: string[] };
  custos?: { min?: number; sugestoes?: string[] };
  autoteste?: Array<{
    id: string;
    pergunta: string;
    tipo: string;
    alerta_se?: string;
    alerta_texto?: string;
  }>;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: BMCValue;
  bmcMap: Record<string, BMCValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

function usePropostaAula13(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula14-proposta", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const c = (data?.content ?? {}) as {
        proposta_valor_aula13?: Record<
          string,
          { frase_ancora?: string; solucao?: string; publico?: string }
        >;
      };
      for (const v of Object.values(c.proposta_valor_aula13 ?? {})) {
        if (v?.frase_ancora || v?.solucao) {
          return {
            frase_ancora: v.frase_ancora ?? "",
            solucao: v.solucao ?? "",
            publico: v.publico ?? "",
          };
        }
      }
      return null;
    },
  });
}

function useStakeholdersAula10(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula14-stakeholders", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const c = (data?.content ?? {}) as {
        stakeholders_aula10?: Record<
          string,
          { stakeholders?: Array<{ nome?: string; categoria?: string }> }
        >;
      };
      const nomes: string[] = [];
      for (const v of Object.values(c.stakeholders_aula10 ?? {})) {
        for (const s of v?.stakeholders ?? []) {
          if (s?.nome) nomes.push(s.nome);
        }
      }
      return nomes.slice(0, 12);
    },
  });
}

export function PillBMCSimplificado({
  pillId,
  schema,
  accent,
  initial,
  bmcMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const blocos = schema.blocos ?? [];
  const receitasMin = schema.receitas?.min ?? 2;
  const receitasSug = schema.receitas?.sugestoes ?? [];
  const custosMin = schema.custos?.min ?? 5;
  const custosSug = schema.custos?.sugestoes ?? [];
  const autotesteSchema = schema.autoteste ?? [];
  const ctaLabel = schema.completion?.label ?? "entregar modelo";

  const propostaQ = usePropostaAula13(schema.proposta_source_module_id);
  const stakeQ = useStakeholdersAula10(schema.stakeholders_source_module_id);

  const [value, setValue] = useState<BMCValue>(() => ({
    segmento: initial?.segmento ?? "",
    canais: initial?.canais ?? "",
    receitas: initial?.receitas ?? [],
    custos: initial?.custos ?? [],
    autoteste: initial?.autoteste ?? {},
  }));

  const status = useAutoSaveField({
    value: { ...bmcMap, [pillId]: value },
    initial: bmcMap,
    save,
    field: "bmc_aula14",
  });

  const setBloco = (id: "segmento" | "canais", v: string) =>
    setValue((prev) => ({ ...prev, [id]: v }));

  const addItem = (kind: "receitas" | "custos", text: string) => {
    const t = text.trim();
    if (!t) return;
    setValue((prev) => ({ ...prev, [kind]: [...(prev[kind] ?? []), t] }));
  };
  const rmItem = (kind: "receitas" | "custos", i: number) =>
    setValue((prev) => ({ ...prev, [kind]: (prev[kind] ?? []).filter((_, k) => k !== i) }));

  const setAuto = (patch: Partial<Autoteste>) =>
    setValue((prev) => ({ ...prev, autoteste: { ...(prev.autoteste ?? {}), ...patch } }));

  const blocosStatus = useMemo(() => {
    return blocos.map((b) => {
      const texto = (value[b.id] ?? "").toString();
      const min = b.min_chars ?? 40;
      const ok = texto.trim().length >= min;
      return { bloco: b, texto, ok };
    });
  }, [blocos, value]);

  const receitasOk = (value.receitas?.length ?? 0) >= receitasMin;
  const custosOk = (value.custos?.length ?? 0) >= custosMin;
  const blocosOk = blocosStatus.every((b) => b.ok);
  const at = value.autoteste ?? {};
  const autotesteOk =
    !!at.opera_sem_principal &&
    !!at.custo_menor_receita &&
    !!at.parceiro_critico &&
    (at.parceiro_critico !== "sim" || (at.parceiro_nome ?? "").trim().length > 0);

  const alertas = autotesteSchema
    .map((q) => {
      const resp = at[q.id as keyof Autoteste] as string | undefined;
      if (resp && q.alerta_se && resp === q.alerta_se) {
        return { id: q.id, texto: q.alerta_texto ?? "atenção" };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; texto: string }>;

  const receitaUnica = (value.receitas?.length ?? 0) === 1;

  const ready = blocosOk && receitasOk && custosOk && autotesteOk;

  return (
    <div className="space-y-5">
      {/* pull automático */}
      <aside
        className="rounded-2xl p-4 sm:p-5 space-y-3"
        style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
      >
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          o que puxamos das módulos anteriores
        </p>
        {propostaQ.isLoading ? (
          <p className="font-body text-xs text-perestroika-preto/60">carregando sua proposta do módulo 13…</p>
        ) : propostaQ.data?.frase_ancora ? (
          <div>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50 mb-0.5">
              proposta de valor · módulo 13
            </p>
            <p className="font-body text-sm text-perestroika-preto/85 leading-snug">
              {propostaQ.data.frase_ancora}
            </p>
            {propostaQ.data.publico && (
              <p className="font-body text-[11px] text-perestroika-preto/60 mt-1">
                público: {propostaQ.data.publico}
              </p>
            )}
          </div>
        ) : (
          <p className="font-body text-xs text-perestroika-vermelho/85">
            você ainda não fechou a proposta do módulo 13. volta lá antes de desenhar o modelo.
          </p>
        )}
        {stakeQ.data && stakeQ.data.length > 0 && (
          <div>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50 mb-0.5">
              stakeholders mapeados · módulo 10
            </p>
            <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
              {stakeQ.data.join(" · ")}
            </p>
          </div>
        )}
      </aside>

      {/* canvas 5 blocos */}
      <section aria-label="canvas" className="space-y-3">
        <header>
          <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
            business model canvas simplificado
          </h3>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            5 blocos. quem paga, como chega, quanto entra, quanto sai.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          {/* segmento + proposta (readonly) */}
          <BlocoTexto
            label={blocosStatus[0]?.bloco.titulo ?? "SEGMENTO DE CLIENTES"}
            hint={blocosStatus[0]?.bloco.hint ?? ""}
            value={value.segmento ?? ""}
            onChange={(v) => setBloco("segmento", v)}
            min={blocosStatus[0]?.bloco.min_chars ?? 50}
            ok={blocosStatus[0]?.ok ?? false}
            accent={accent}
            placeholder="ex: escola sebrae bh (paga a licença) + alunos (usam gratuitamente)…"
          />
          <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.04] p-4 space-y-2">
            <p className="font-display uppercase text-lg leading-none" style={{ color: accent }}>
              PROPOSTA DE VALOR
            </p>
            <p className="font-body text-[11px] italic text-perestroika-preto/55">
              puxada do módulo 13. só visualização.
            </p>
            <p className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
              {propostaQ.data?.frase_ancora || propostaQ.data?.solucao || "—"}
            </p>
          </div>

          {/* canais */}
          <div className="sm:col-span-2">
            <BlocoTexto
              label={blocosStatus[1]?.bloco.titulo ?? "CANAIS"}
              hint={blocosStatus[1]?.bloco.hint ?? ""}
              value={value.canais ?? ""}
              onChange={(v) => setBloco("canais", v)}
              min={blocosStatus[1]?.bloco.min_chars ?? 40}
              ok={blocosStatus[1]?.ok ?? false}
              accent={accent}
              placeholder="ex: 1) o próprio app (loja + notificações); 2) parceria com coordenação pedagógica; 3) instagram do sebrae bh…"
              fullWidth
            />
          </div>

          {/* receitas */}
          <div className="sm:col-span-2">
            <ListEditor
              label="FONTES DE RECEITA"
              hint={`mín. ${receitasMin} fontes distintas. quem paga o quê?`}
              items={value.receitas ?? []}
              onAdd={(t) => addItem("receitas", t)}
              onRemove={(i) => rmItem("receitas", i)}
              sugestoes={receitasSug}
              min={receitasMin}
              ok={receitasOk}
              accent={accent}
              placeholder="ex: contrato B2B com escola sebrae bh"
            />
            {receitaUnica && (
              <div
                className="mt-2 rounded-xl p-3 flex items-start gap-2"
                style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
                <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
                  fonte única. modelo forte tem 2-3 pernas — se essa cair, tudo cai.
                </p>
              </div>
            )}
          </div>

          {/* custos */}
          <div className="sm:col-span-2">
            <ListEditor
              label="ESTRUTURA DE CUSTOS"
              hint={`liste ${custosMin} custos principais. tempo próprio, marketing e manutenção contam.`}
              items={value.custos ?? []}
              onAdd={(t) => addItem("custos", t)}
              onRemove={(i) => rmItem("custos", i)}
              sugestoes={custosSug}
              min={custosMin}
              ok={custosOk}
              accent={accent}
              placeholder="ex: hospedagem e infra"
            />
          </div>
        </div>
      </section>

      {/* autoteste */}
      <section aria-label="autoteste" className="space-y-3">
        <header>
          <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
            autoteste de sustentabilidade
          </h3>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            3 perguntas que separam modelo forte de modelo torto.
          </p>
        </header>

        <div className="grid gap-3">
          <YesNoRow
            label="se sua fonte principal de receita falhar, você ainda opera?"
            value={at.opera_sem_principal ?? ""}
            options={[
              { v: "sim", l: "sim" },
              { v: "nao", l: "não" },
            ]}
            onChange={(v) => setAuto({ opera_sem_principal: v as "sim" | "nao" })}
            accent={accent}
          />
          <YesNoRow
            label="em 12 meses de operação, seu custo total é menor que sua receita total (estimativa)?"
            value={at.custo_menor_receita ?? ""}
            options={[
              { v: "sim", l: "sim" },
              { v: "nao", l: "não" },
              { v: "naosei", l: "não sei" },
            ]}
            onChange={(v) => setAuto({ custo_menor_receita: v as "sim" | "nao" | "naosei" })}
            accent={accent}
          />
          <div className="space-y-2">
            <YesNoRow
              label="existe UM parceiro sem o qual o modelo cai?"
              value={at.parceiro_critico ?? ""}
              options={[
                { v: "sim", l: "sim" },
                { v: "nao", l: "não" },
              ]}
              onChange={(v) => setAuto({ parceiro_critico: v as "sim" | "nao" })}
              accent={accent}
            />
            {at.parceiro_critico === "sim" && (
              <input
                value={at.parceiro_nome ?? ""}
                onChange={(e) => setAuto({ parceiro_nome: e.target.value })}
                placeholder="quem é esse parceiro crítico?"
                className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto focus:border-perestroika-preto focus:outline-none"
              />
            )}
          </div>
        </div>

        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map((a) => (
              <div
                key={a.id}
                className="rounded-xl p-3 flex items-start gap-2"
                style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
                <p className="font-body text-xs text-perestroika-preto/80 leading-snug">{a.texto}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden />
              falta: {[
                !blocosOk && "preencher segmento e canais",
                !receitasOk && `${receitasMin}+ fontes de receita`,
                !custosOk && `${custosMin} custos listados`,
                !autotesteOk && "responder o autoteste",
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

function BlocoTexto({
  label,
  hint,
  value,
  onChange,
  min,
  ok,
  accent,
  placeholder,
  fullWidth,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  ok: boolean;
  accent: string;
  placeholder?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display uppercase text-lg leading-none" style={{ color: accent }}>
            {label}
          </p>
          <p className="font-body text-[11px] italic text-perestroika-preto/55 mt-1">{hint}</p>
        </div>
        {ok && (
          <span
            className="rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            <Check className="inline h-3 w-3 -mt-0.5" aria-hidden /> ok
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={fullWidth ? 3 : 4}
        className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto focus:border-perestroika-preto focus:outline-none resize-y"
        maxLength={600}
        placeholder={placeholder}
      />
      <div className="flex items-center justify-between text-[11px] font-body">
        <span className={ok ? "text-perestroika-preto/50" : "text-perestroika-vermelho/85"}>
          {value.trim().length}/{min}
        </span>
      </div>
    </div>
  );
}

function ListEditor({
  label,
  hint,
  items,
  onAdd,
  onRemove,
  sugestoes,
  min,
  ok,
  accent,
  placeholder,
}: {
  label: string;
  hint: string;
  items: string[];
  onAdd: (t: string) => void;
  onRemove: (i: number) => void;
  sugestoes: string[];
  min: number;
  ok: boolean;
  accent: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    onAdd(draft);
    setDraft("");
  };
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display uppercase text-lg leading-none" style={{ color: accent }}>
            {label}
          </p>
          <p className="font-body text-[11px] italic text-perestroika-preto/55 mt-1">{hint}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider ${
            ok ? "" : "text-perestroika-vermelho/85"
          }`}
          style={ok ? { backgroundColor: `${accent}22`, color: accent } : undefined}
        >
          {items.length}/{min}
        </span>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-xl bg-white border border-perestroika-preto/10 px-3 py-2"
            >
              <span className="font-body text-sm text-perestroika-preto/85">{it}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-perestroika-preto/50 hover:text-perestroika-vermelho"
                aria-label="remover"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex min-w-0 gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto focus:border-perestroika-preto focus:outline-none"
          maxLength={140}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-xl px-3 py-2 font-body text-xs uppercase tracking-wider disabled:opacity-40"
          style={{ backgroundColor: accent, color: "#fff" }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> add
        </button>
      </div>

      {sugestoes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAdd(s)}
              className="rounded-full border border-perestroika-preto/15 bg-white px-2.5 py-1 font-body text-[11px] text-perestroika-preto/70 hover:border-perestroika-preto"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YesNoRow({
  label,
  value,
  options,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  options: Array<{ v: string; l: string }>;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2">
      <p className="font-body text-sm text-perestroika-preto/85">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              className="rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wider border-2 transition-colors"
              style={{
                borderColor: active ? accent : "rgba(9,9,9,0.15)",
                backgroundColor: active ? accent : "white",
                color: active ? "#fff" : "rgba(9,9,9,0.7)",
              }}
            >
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
