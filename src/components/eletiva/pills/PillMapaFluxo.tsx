import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, Check, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";

export type MapaFluxoValue = {
  entrada?: string;
  transformacao?: string;
  saida?: string;
  vazamentos?: string[];
  imagem?: EvidenceValue;
};

type Schema = {
  type?: "mapa_fluxo";
  briefing_source_module_id?: string;
  min_chars?: number;
  min_vazamentos?: number;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  moduleId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: MapaFluxoValue;
  mapaFluxoMap: Record<string, MapaFluxoValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

type BriefingResumo = { hmw?: string; fluxo_principal?: string; titulo?: string };

function useBriefingResumo(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula5-briefing-resumo", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async (): Promise<BriefingResumo> => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        briefing_aula5?: Record<string, { hmw?: string; fluxo_principal?: string; titulo?: string }>;
      };
      const first = Object.values(content.briefing_aula5 ?? {})[0];
      return {
        hmw: first?.hmw,
        fluxo_principal: first?.fluxo_principal,
        titulo: first?.titulo,
      };
    },
  });
}

const emptyEvidence: EvidenceValue = { evidence_kind: "none" };

const EXEMPLOS = [
  {
    label: "exemplo A — desperdício de comida na cantina",
    entrada: "50kg de alimentos comprados por dia",
    transformacao: "cozinha prepara ~40 refeições",
    saida: "refeições servidas aos alunos",
    vazamentos: [
      "sobra na produção que vai pro lixo",
      "comida no prato que aluno não come",
      "casca/talo descartados sem compostagem",
      "alimento vencido no estoque",
    ],
  },
  {
    label: "exemplo B — impressões desnecessárias",
    entrada: "10 resmas de papel/mês",
    transformacao: "impressora produz cópias sob demanda",
    saida: "documentos usados por professores/alunos",
    vazamentos: [
      "impressões esquecidas na bandeja",
      "versão desatualizada substituída por reimpressão",
      "frente sem verso",
      "descarte misto sem separação",
    ],
  },
];

export function PillMapaFluxo({
  pillId,
  title,
  schema,
  accent,
  initial,
  mapaFluxoMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const minChars = schema.min_chars ?? 15;
  const minVaz = schema.min_vazamentos ?? 2;
  const ctaLabel = schema.completion?.label ?? "entregar mapa de fluxo";

  const buildInitial = (): MapaFluxoValue => ({
    entrada: initial?.entrada ?? "",
    transformacao: initial?.transformacao ?? "",
    saida: initial?.saida ?? "",
    vazamentos: (initial?.vazamentos && initial.vazamentos.length > 0)
      ? initial.vazamentos
      : ["", ""],
    imagem: initial?.imagem ?? emptyEvidence,
  });

  const [value, setValue] = useState<MapaFluxoValue>(buildInitial);
  const [exemploOpen, setExemploOpen] = useState<number | null>(null);

  useEffect(() => {
    // hidrata quando initial chega depois
    if (initial && (initial.entrada || initial.transformacao || (initial.vazamentos?.length ?? 0) > 0)) {
      setValue({
        entrada: initial.entrada ?? "",
        transformacao: initial.transformacao ?? "",
        saida: initial.saida ?? "",
        vazamentos: initial.vazamentos && initial.vazamentos.length > 0 ? initial.vazamentos : ["", ""],
        imagem: initial.imagem ?? emptyEvidence,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.entrada, initial?.transformacao, initial?.saida, initial?.vazamentos?.length]);

  const status = useAutoSaveField({
    value: { ...mapaFluxoMap, [pillId]: value },
    initial: mapaFluxoMap,
    save,
    field: "mapa_fluxo_aula6",
  });

  const briefingQuery = useBriefingResumo(schema.briefing_source_module_id);
  const briefing = briefingQuery.data;

  const vazamentosNaoVazios = useMemo(
    () => (value.vazamentos ?? []).filter((v) => (v ?? "").trim().length >= minChars),
    [value.vazamentos, minChars],
  );

  const hasImage = value.imagem?.evidence_kind === "file" || value.imagem?.evidence_kind === "link";
  const textoOk =
    (value.entrada ?? "").trim().length >= minChars &&
    (value.transformacao ?? "").trim().length >= minChars &&
    (value.saida ?? "").trim().length >= minChars &&
    vazamentosNaoVazios.length >= minVaz;
  const ready = textoOk || hasImage;

  function updateVaz(i: number, next: string) {
    setValue((prev) => {
      const arr = [...(prev.vazamentos ?? [])];
      arr[i] = next;
      return { ...prev, vazamentos: arr };
    });
  }
  function addVaz() {
    setValue((prev) => ({ ...prev, vazamentos: [...(prev.vazamentos ?? []), ""] }));
  }
  function removeVaz(i: number) {
    setValue((prev) => {
      const arr = [...(prev.vazamentos ?? [])];
      arr.splice(i, 1);
      return { ...prev, vazamentos: arr.length >= 2 ? arr : [...arr, ""] };
    });
  }

  function aplicarExemplo(idx: number) {
    const ex = EXEMPLOS[idx];
    setValue({
      entrada: ex.entrada,
      transformacao: ex.transformacao,
      saida: ex.saida,
      vazamentos: [...ex.vazamentos],
      imagem: value.imagem ?? emptyEvidence,
    });
    setExemploOpen(null);
  }

  return (
    <div className="space-y-6">
      {/* pull do briefing */}
      {briefing && (briefing.hmw || briefing.fluxo_principal) && (
        <aside
          className="rounded-2xl p-4 sm:p-5"
          style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            do seu briefing (aula 5)
          </p>
          {briefing.hmw && (
            <p className="font-body text-sm text-perestroika-preto/90 leading-snug">
              <span className="font-semibold">HMW:</span> {briefing.hmw}
            </p>
          )}
          {briefing.fluxo_principal && (
            <p className="font-body text-xs text-perestroika-preto/70 mt-1 uppercase tracking-wider">
              fluxo: {briefing.fluxo_principal}
            </p>
          )}
        </aside>
      )}

      {/* instruções */}
      <div className="rounded-2xl bg-[#F5EEE1] p-4 sm:p-5 border-2 border-perestroika-preto/15">
        <p className="font-body text-sm text-perestroika-preto/85 leading-relaxed">
          preencha os 4 blocos que formam o fluxo atual do seu problema. o desenho é feio? tudo bem —
          precisa ser <span className="font-semibold">honesto</span>, não bonito. mínimo{" "}
          <span className="font-semibold">{minVaz} vazamentos</span>. se preferir desenhar no papel,
          Miro ou Canva, envia a foto no final.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXEMPLOS.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setExemploOpen(exemploOpen === i ? null : i)}
              className="px-3 py-1.5 rounded-full border-2 border-perestroika-preto/25 font-body text-xs uppercase tracking-wider text-perestroika-preto/80 hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              {exemploOpen === i ? "fechar" : "ver"} exemplo {i === 0 ? "A" : "B"}
            </button>
          ))}
        </div>
        {exemploOpen !== null && (
          <div className="mt-3 rounded-xl bg-perestroika-bege border-2 border-perestroika-preto/15 p-3 space-y-2 font-body text-sm text-perestroika-preto/85">
            <p className="text-[11px] uppercase tracking-wider text-perestroika-preto/60">
              {EXEMPLOS[exemploOpen].label}
            </p>
            <p><span className="font-semibold">entrada:</span> {EXEMPLOS[exemploOpen].entrada}</p>
            <p><span className="font-semibold">transformação:</span> {EXEMPLOS[exemploOpen].transformacao}</p>
            <p><span className="font-semibold">saída:</span> {EXEMPLOS[exemploOpen].saida}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {EXEMPLOS[exemploOpen].vazamentos.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => aplicarExemplo(exemploOpen)}
              className="mt-1 px-3 py-1.5 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-xs uppercase tracking-wider"
            >
              usar como ponto de partida
            </button>
          </div>
        )}
      </div>

      {/* canvas dos 4 blocos */}
      <div className="space-y-3">
        {/* linha superior */}
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          <BlocoCampo
            id="entrada"
            label="ENTRADA"
            hint="o que entra no sistema (recursos, materiais, tempo, energia)"
            value={value.entrada ?? ""}
            onChange={(v) => setValue((prev) => ({ ...prev, entrada: v }))}
            accent={accent}
          />
          <SetaHorizontal />
          <BlocoCampo
            id="transformacao"
            label="TRANSFORMAÇÃO"
            hint="o que acontece com esse recurso — quem faz o quê?"
            value={value.transformacao ?? ""}
            onChange={(v) => setValue((prev) => ({ ...prev, transformacao: v }))}
            accent={accent}
          />
          <SetaHorizontal />
          <BlocoCampo
            id="saida"
            label="SAÍDA"
            hint="o que sai formalmente do sistema (produto, serviço, resultado esperado)"
            value={value.saida ?? ""}
            onChange={(v) => setValue((prev) => ({ ...prev, saida: v }))}
            accent={accent}
          />
        </div>

        {/* setas verticais + vazamentos */}
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start">
          <div className="hidden md:flex justify-center">
            <ArrowDown className="h-6 w-6 text-perestroika-preto/40" aria-hidden />
          </div>
          <div className="hidden md:block" />
          <div className="hidden md:flex justify-center">
            <ArrowDown className="h-6 w-6 text-perestroika-preto/40" aria-hidden />
          </div>
          <div className="hidden md:block" />
          <div className="hidden md:flex justify-center">
            <ArrowDown className="h-6 w-6 text-perestroika-preto/40" aria-hidden />
          </div>
        </div>

        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-2">
            vazamentos · mín. {minVaz}
          </p>
          <div className="space-y-2">
            {(value.vazamentos ?? []).map((vaz, i) => {
              const done = (vaz ?? "").trim().length >= minChars;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-2xl border-2 p-3"
                  style={{
                    borderColor: done ? `${accent}` : "rgba(9,9,9,0.15)",
                    backgroundColor: done ? `${accent}0F` : "transparent",
                  }}
                >
                  <span
                    className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-body text-[11px] font-bold"
                    style={{ backgroundColor: accent, color: "#fff" }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <TextareaWithVoice
                      value={vaz ?? ""}
                      onChange={(e) => updateVaz(i, e.target.value)}
                      placeholder={`vazamento ${i + 1} · onde recurso escapa, é desperdiçado ou vira problema`}
                      rows={2}
                      className="w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm"
                    />
                  </div>
                  {(value.vazamentos ?? []).length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeVaz(i)}
                      aria-label={`remover vazamento ${i + 1}`}
                      className="mt-1 p-1.5 rounded-full text-perestroika-preto/60 hover:text-perestroika-preto hover:bg-perestroika-preto/5"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addVaz}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-perestroika-preto/25 px-3 py-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/80 hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> adicionar vazamento
          </button>
        </div>
      </div>

      {/* upload alternativo */}
      <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/25 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="h-4 w-4 text-perestroika-preto/60" aria-hidden />
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/70">
            alternativa · foto do seu mapa (papel, Miro, Canva)
          </p>
        </div>
        <p className="font-body text-xs text-perestroika-preto/60 mb-3">
          se preferir desenhar à mão ou usar outra ferramenta, envie uma foto ou link aqui. vale como
          entrega mesmo sem preencher os campos acima.
        </p>
        <EvidenceUploader
          value={value.imagem ?? emptyEvidence}
          onChange={(next) => setValue((prev) => ({ ...prev, imagem: next }))}
          uploadPathPrefix={`aula6-mapa-fluxo/${pillId}`}
          accept="image/*,application/pdf"
        />
      </div>

      {/* footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <SaveIndicator status={status} />
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

      {!ready && !isCompleted && (
        <p className="font-body text-xs text-perestroika-preto/55">
          preencha os 4 blocos ({minChars}+ caracteres cada) com pelo menos {minVaz} vazamentos, ou envie uma
          foto do seu mapa.
        </p>
      )}
    </div>
  );
}

function BlocoCampo({
  id,
  label,
  hint,
  value,
  onChange,
  accent,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  const done = value.trim().length >= 15;
  return (
    <div
      className="rounded-2xl border-2 p-3 sm:p-4 flex flex-col min-h-[140px]"
      style={{
        borderColor: done ? accent : "rgba(9,9,9,0.2)",
        backgroundColor: done ? `${accent}0F` : "transparent",
      }}
    >
      <p
        className="font-display text-xs uppercase tracking-[0.2em] mb-1"
        style={{ color: done ? accent : "rgba(9,9,9,0.7)" }}
      >
        {label}
      </p>
      <p className="font-body text-[11px] text-perestroika-preto/55 mb-2 leading-tight">{hint}</p>
      <TextareaWithVoice
        value={value}
        onChange={onChange}
        placeholder="descreva aqui"
        rows={3}
        className="flex-1 w-full rounded-xl border border-perestroika-preto/15 bg-perestroika-bege p-2 font-body text-sm resize-none"
        id={id}
      />
    </div>
  );
}

function SetaHorizontal() {
  return (
    <div className="hidden md:flex items-center justify-center px-1">
      <ArrowRight className="h-6 w-6 text-perestroika-preto/40" aria-hidden />
    </div>
  );
}
