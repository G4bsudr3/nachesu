import { useState } from "react";
import { ArrowRight, Check, Circle } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

/**
 * pílula MÓDULO 20 — Parte A (auto-avaliação em 5 dimensões) + Parte B (feedback pro professor).
 */

export type FechamentoAvaliacaoValue = {
  dim_conhecimento?: number;
  dim_confianca?: number;
  dim_pesquisa?: number;
  dim_teste?: number;
  dim_coragem?: number;
  funcionou?: string;
  mudaria?: string;
  nota_geral?: number;
  palavra_resumo?: string;
};

type Schema = { type?: "fechamento_avaliacao"; completion?: { label?: string } };

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: FechamentoAvaliacaoValue;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

const DIMENSOES: Array<{ key: keyof FechamentoAvaliacaoValue; label: string; sub: string }> = [
  { key: "dim_conhecimento", label: "conhecimento sobre economia circular e regenerativa", sub: "quanto você entende dos conceitos" },
  { key: "dim_confianca", label: "confiança pra propor projetos de impacto", sub: "coragem de sair da ideia" },
  { key: "dim_pesquisa", label: "capacidade de pesquisar antes de propor", sub: "buscar evidência, não achismo" },
  { key: "dim_teste", label: "habilidade de testar antes de construir", sub: "experimentar barato" },
  { key: "dim_coragem", label: "coragem de mostrar trabalho em público", sub: "pitch, feedback, exposição" },
];

export function PillFechamentoAvaliacao({ pillId, accent, initial, save, onComplete, isCompleted, isCompleting }: Props) {
  const [value, setValue] = useState<FechamentoAvaliacaoValue>(initial ?? {});

  const status = useAutoSaveField({
    value: { [pillId]: value },
    initial: { [pillId]: initial },
    save,
    field: "fechamento_avaliacao",
  });

  const set = (k: keyof FechamentoAvaliacaoValue, v: number | string) =>
    setValue((prev) => ({ ...prev, [k]: v }));

  const dimensoesOk = DIMENSOES.every((d) => typeof value[d.key] === "number");
  const funcionouOk = (value.funcionou ?? "").trim().length >= 20;
  const mudariaOk = (value.mudaria ?? "").trim().length >= 20;
  const notaOk = typeof value.nota_geral === "number";
  const palavraOk = (value.palavra_resumo ?? "").trim().length >= 2;
  const ready = dimensoesOk && funcionouOk && mudariaOk && notaOk && palavraOk;

  return (
    <div className="space-y-8">
      {/* PARTE A — auto-avaliação */}
      <section className="space-y-4">
        <SectionHeader label="parte A" title="auto-avaliação em 5 dimensões" hint="de 1 (nada) a 10 (bastante)" />
        <div className="space-y-3">
          {DIMENSOES.map((d) => {
            const v = (value[d.key] as number | undefined) ?? 0;
            return (
              <div key={String(d.key)} className="rounded-xl border border-perestroika-preto/15 bg-white p-3 space-y-2">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-body text-sm text-perestroika-preto font-medium">{d.label}</p>
                    <p className="font-body text-[11px] text-perestroika-preto/55">{d.sub}</p>
                  </div>
                  <span
                    className="font-display text-2xl leading-none tracking-wide"
                    style={{ color: v > 0 ? accent : "rgba(9,9,9,0.3)" }}
                  >
                    {v || "—"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={v || 1}
                  onChange={(e) => set(d.key, Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: accent }}
                />
                <div className="flex justify-between font-body text-[10px] text-perestroika-preto/45">
                  <span>1 · nada</span>
                  <span>10 · bastante</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PARTE B — feedback */}
      <section className="space-y-4">
        <SectionHeader label="parte B" title="feedback pra dudu" hint="feedback é presente. não segura." />

        <div className="space-y-2">
          <label className="font-body text-sm text-perestroika-preto font-medium">o que mais funcionou?</label>
          <textarea
            value={value.funcionou ?? ""}
            onChange={(e) => set("funcionou", e.target.value)}
            rows={3}
            placeholder="ex: os PBLs. senti que aprendi fazendo, não ouvindo."
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
          />
        </div>

        <div className="space-y-2">
          <label className="font-body text-sm text-perestroika-preto font-medium">o que você mudaria?</label>
          <textarea
            value={value.mudaria ?? ""}
            onChange={(e) => set("mudaria", e.target.value)}
            rows={3}
            placeholder="ex: o módulo X ficou longo demais. cortaria pra 30 min."
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-2">
            <label className="font-body text-sm text-perestroika-preto font-medium">nota geral (0-10)</label>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={typeof value.nota_geral === "number" ? value.nota_geral : 5}
              onChange={(e) => set("nota_geral", Number(e.target.value))}
              className="w-full"
              style={{ accentColor: accent }}
            />
            <p className="font-display text-3xl leading-none tracking-wide text-center" style={{ color: accent }}>
              {typeof value.nota_geral === "number" ? value.nota_geral : "—"}
            </p>
          </div>
          <div className="space-y-2">
            <label className="font-body text-sm text-perestroika-preto font-medium">1 palavra que resume a eletiva</label>
            <input
              type="text"
              maxLength={30}
              value={value.palavra_resumo ?? ""}
              onChange={(e) => set("palavra_resumo", e.target.value)}
              placeholder="ex: mão-na-massa"
              className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-display uppercase text-xl tracking-wide text-perestroika-preto placeholder:text-perestroika-preto/25 focus:border-perestroika-preto focus:outline-none"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-perestroika-preto/15">
        <SaveIndicator status={status} />
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip ok={dimensoesOk} label="5 dimensões" accent={accent} />
          <StatusChip ok={funcionouOk && mudariaOk} label="feedback" accent={accent} />
          <StatusChip ok={notaOk && palavraOk} label="nota + palavra" accent={accent} />
        </div>
        <button
          type="button"
          onClick={() => !isCompleted && ready && onComplete()}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display uppercase text-sm text-perestroika-bege transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{ backgroundColor: isCompleted ? "#090909" : accent }}
        >
          {isCompleted ? <><Check className="h-4 w-4" aria-hidden /> entregue</> : <>enviar auto-av + feedback <ArrowRight className="h-4 w-4" aria-hidden /></>}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, title, hint }: { label: string; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">{label}</span>
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
