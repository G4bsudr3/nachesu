import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { EvidenceUploader, type EvidenceValue } from "./EvidenceUploader";
import { EntregaChecklist, type ChecklistItem } from "./EntregaChecklist";

import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";
import { PillMarkdown } from "@/components/eletiva/PillMarkdown";

type PromptItem = {
  id: string;
  prompt_ruim: string;
  placeholder_corf?: string;
  /** quando true, o bloco entra no "quer treinar mais" e não trava a entrega */
  optional?: boolean;
};

type Schema = {
  type?: "pbl_corf_triplo";
  contexto_md?: string;
  passos?: { titulo: string; descricao: string }[];
  prompts: PromptItem[];
  /** quando true, os prints viram evidência opcional e não travam a entrega */
  prints_opcionais?: boolean;
  treinar_mais_label?: string;
  comparacao?: { label?: string; placeholder?: string };

  conclusao?: { label: string; placeholder?: string };
  dica_md?: string;
  completion?: { label?: string };
};


type EntregaItem = {
  versao_corf?: string;
  print_ruim?: EvidenceValue;
  print_corf?: EvidenceValue;
  o_que_mudou?: string;
};

export type PblCorfValue = {
  itens?: Record<string, EntregaItem>;
  conclusao?: string;
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PblCorfValue;
  corfMap: Record<string, PblCorfValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
  /** abre o TutorChat com essa pílula como contexto. só existe quando há trilha. */
  onOpenTutor?: () => void;
  hasTrail?: boolean;
}

const emptyEvidence: EvidenceValue = { evidence_kind: "none" };

/**
 * exercício PBL do módulo 2: aluno reescreve 3 prompts ruins em CORF,
 * sobe 2 prints por prompt e descreve o que mudou. salva em
 * `content.pbl_corf[pillId]`.
 */
export function PillPBLCorfTriplo({
  pillId,
  title,
  schema,
  accent,
  initial,
  corfMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
  onOpenTutor,
  hasTrail,
}: Props) {
  const [value, setValue] = useState<PblCorfValue>(initial ?? {});

  useEffect(() => {
    setValue((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...corfMap, [pillId]: value },
    initial: corfMap,
    save,
    field: "pbl_corf",
  });

  const updateItem = (id: string, patch: Partial<EntregaItem>) =>
    setValue((prev) => ({
      ...prev,
      itens: {
        ...(prev.itens ?? {}),
        [id]: { ...((prev.itens ?? {})[id] ?? {}), ...patch },
      },
    }));

  const minText = (s?: string) => (s ?? "").trim().length >= 2;
  const hasEv = (ev?: EvidenceValue) => !!ev && ev.evidence_kind !== "none";

  const obrigatorios = schema.prompts.filter((p) => !p.optional);
  const opcionais = schema.prompts.filter((p) => p.optional);
  const printsOpcionais = schema.prints_opcionais ?? false;

  const checklist: ChecklistItem[] = [];
  obrigatorios.forEach((p, i) => {
    const it = value.itens?.[p.id] ?? {};
    const n = String(i + 1).padStart(2, "0");
    checklist.push({ id: `${p.id}-corf`, label: `entrega ${n}: versão corf`, done: minText(it.versao_corf) });
    checklist.push({ id: `${p.id}-mudou`, label: `entrega ${n}: o que mudou`, done: minText(it.o_que_mudou) });
    if (!printsOpcionais) {
      checklist.push({ id: `${p.id}-pr`, label: `entrega ${n}: print do prompt ruim`, done: hasEv(it.print_ruim) });
      checklist.push({ id: `${p.id}-pc`, label: `entrega ${n}: print do prompt corf`, done: hasEv(it.print_corf) });
    }
  });
  if (schema.conclusao) {
    checklist.push({ id: "conclusao", label: "conclusão do exercício", done: minText(value.conclusao) });
  }


  const ctaLabel = schema.completion?.label ?? "entregar e seguir";

  const renderBloco = (p: PromptItem, i: number, extra = false) => {
    const it = value.itens?.[p.id] ?? {};
    return (
      <div
        key={p.id}
        className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 sm:p-6 space-y-4"
      >
        <header className="flex items-center justify-between gap-3">
          <p
            className="font-body text-[11px] uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            {extra ? "treino extra" : "entrega"} {String(i + 1).padStart(2, "0")}
          </p>
          <p className="font-body text-xs text-perestroika-preto/55 italic truncate">
            "{p.prompt_ruim}"
          </p>
        </header>

        <div>
          <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            sua versão em corf
          </label>
          <TextareaWithVoice
            value={it.versao_corf ?? ""}
            onChange={(e) => updateItem(p.id, { versao_corf: e.target.value })}
            placeholder={
              p.placeholder_corf ??
              "contexto: ...\nobjetivo: ...\nregras: ...\nformato: ..."
            }
            rows={6}
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel={`gravar versão corf do prompt ${i + 1}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
              print: resposta com o prompt ruim
              {printsOpcionais && <span className="ml-2 text-perestroika-preto/45">opcional</span>}
            </label>
            <EvidenceUploader
              itemId={`${pillId}-${p.id}-ruim`}
              value={it.print_ruim ?? emptyEvidence}
              onChange={(ev) => updateItem(p.id, { print_ruim: ev })}
              accent={accent}
            />
          </div>
          <div>
            <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
              print: resposta com sua versão corf
              {printsOpcionais && <span className="ml-2 text-perestroika-preto/45">opcional</span>}
            </label>
            <EvidenceUploader
              itemId={`${pillId}-${p.id}-corf`}
              value={it.print_corf ?? emptyEvidence}
              onChange={(ev) => updateItem(p.id, { print_corf: ev })}
              accent={accent}
            />
          </div>
        </div>

        <div>
          <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            {schema.comparacao?.label ?? "o que mudou"}
          </label>
          <TextareaWithVoice
            value={it.o_que_mudou ?? ""}
            onChange={(e) => updateItem(p.id, { o_que_mudou: e.target.value })}
            placeholder={
              schema.comparacao?.placeholder ??
              "o que ficou diferente entre as duas respostas?"
            }
            rows={3}
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel={`gravar comparação do prompt ${i + 1}`}
          />
        </div>
      </div>
    );
  };




  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">{title}</h2>
        <SaveIndicator status={status} />
      </header>

      {schema.contexto_md && (
        <PillMarkdown accent={accent} className="text-perestroika-preto/80">{schema.contexto_md}</PillMarkdown>
      )}

      {/* prompts obrigatórios em destaque */}
      <section aria-label="o que você vai reescrever" className="space-y-3">
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
          {obrigatorios.length === 1
            ? "o prompt pra reescrever"
            : `os ${obrigatorios.length} prompts pra reescrever`}
        </p>
        <ol
          className={`grid grid-cols-1 gap-3 ${
            obrigatorios.length > 1 ? "sm:grid-cols-3" : ""
          }`}
        >
          {obrigatorios.map((p, i) => (
            <li
              key={p.id}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 flex flex-col gap-2"
            >
              <span
                className="font-display uppercase text-perestroika-preto/55"
                style={{ fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-body text-sm italic text-perestroika-preto/85">
                "{p.prompt_ruim}"
              </p>
            </li>
          ))}
        </ol>
      </section>


      {/* passos */}
      {schema.passos && schema.passos.length > 0 && (
        <section aria-label="passo a passo" className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            passo a passo
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {schema.passos.map((step, i) => (
              <li
                key={i}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 flex gap-3"
              >
                <span
                  className="font-display leading-none flex-shrink-0"
                  style={{ color: accent, fontSize: "clamp(28px, 5vw, 40px)" }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-display uppercase text-base leading-tight mb-1">
                    {step.titulo}
                  </p>
                  <p className="font-body text-xs sm:text-sm text-perestroika-preto/75 leading-relaxed">
                    {step.descricao}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* porta pro tutor: só aparece quando existe trilha pra dar contexto */}
      {hasTrail && onOpenTutor && (
        <div>
          <button
            type="button"
            onClick={onOpenTutor}
            className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto/15 px-4 py-2 font-body text-sm lowercase text-perestroika-preto/80 hover:border-perestroika-preto hover:text-perestroika-preto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            tô travado, me ajuda
          </button>
        </div>
      )}

      {/* blocos de entrega obrigatórios */}
      <section aria-label="entrega" className="space-y-6">
        {obrigatorios.map((p, i) => renderBloco(p, i))}
      </section>

      {/* blocos opcionais, recolhidos */}
      {opcionais.length > 0 && (
        <details className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.02] p-4 sm:p-5">
          <summary className="cursor-pointer font-display uppercase text-lg sm:text-xl leading-tight list-none">
            {schema.treinar_mais_label ?? "quer treinar mais?"}
            <span className="ml-2 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/50">
              opcional, não trava a entrega
            </span>
          </summary>
          <div className="space-y-6 pt-5">
            {opcionais.map((p, i) => renderBloco(p, i, true))}
          </div>
        </details>
      )}


      {/* conclusão geral */}
      {schema.conclusao && (
        <section aria-label="conclusão geral">
          <label className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
            {schema.conclusao.label}
          </label>
          <TextareaWithVoice
            value={value.conclusao ?? ""}
            onChange={(e) => setValue((prev) => ({ ...prev, conclusao: e.target.value }))}
            placeholder={schema.conclusao.placeholder}
            rows={4}
            className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
            voiceAriaLabel="gravar conclusão geral"
          />
        </section>
      )}

      {schema.dica_md && (
        <div
          className="rounded-2xl border-2 p-4 sm:p-5"
          style={{ borderColor: accent, backgroundColor: `${accent}10` }}
        >
          <p className="font-body text-[11px] uppercase tracking-wider mb-2" style={{ color: accent }}>
            dica
          </p>
          <PillMarkdown accent={accent} className="text-sm text-perestroika-preto/85">{schema.dica_md}</PillMarkdown>
        </div>
      )}

      <EntregaChecklist
        items={checklist}
        accent={accent}
        ctaLabel={ctaLabel}
        completedLabel="exercício entregue"
        isCompleted={isCompleted}
        isCompleting={isCompleting}
        onComplete={onComplete}
      />
    </div>
  );
}

