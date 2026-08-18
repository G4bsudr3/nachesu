import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, ChevronUp, Sparkle } from "lucide-react";
import { PillVideoPlayer } from "@/components/eletiva/modulo/PillVideoPlayer";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";
import { TextareaWithVoice } from "@/components/eletiva/TextareaWithVoice";
import { CorfSignature } from "./CorfSignature";
import { ComparacaoNiveis, type NivelItem } from "./ComparacaoNiveis";

type Schema = {
  type?: "pilula_editorial";
  gancho?: {
    md?: string;
    destaque_numero?: string;
    destaque_legenda?: string;
    destaque_source?: {
      label?: string;
      url?: string;
    };
  };
  signature_corf?: {
    caption?: string;
  };
  video?: {
    title: string;
    channel: string;
    url: string;
    instruction: string;
    duration_min?: number;
    /** vídeo que complementa mas não é o coração da pílula: vira bônus opcional */
    optional?: boolean;
  };

  aprofundamento?: {
    md?: string;
    destaque?: string;
  };
  comparacao_niveis?: {
    titulo?: string;
    cenario?: string;
    niveis: NivelItem[];
  };
  reflexao?: {
    prompt?: string;
    placeholder?: string;
  };
  sintese?: { frase?: string };
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: string;
  save: (patch: DeliverableContent) => Promise<unknown>;
  reflectionsMap: Record<string, string>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

/**
 * pílula editorial: renderiza os 5 momentos verticalmente, cada um
 * podendo ser aberto/colapsado. usado nas pílulas a, b, c do módulo 1
 * da eletiva "ia na prática".
 */
export function PillEditorial({
  pillId,
  title,
  schema,
  accent,
  initial,
  save,
  reflectionsMap,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [reflection, setReflection] = useState(initial ?? "");
  const reduce = useReducedMotion();

  useEffect(() => {
    if (initial && !reflection) setReflection(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value: { ...reflectionsMap, [pillId]: reflection },
    initial: reflectionsMap,
    save,
    field: "reflections",
  });

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
      };

  const ctaLabel = schema.completion?.label ?? "concluir pílula e seguir";
  const requiresReflection = !!schema.reflexao?.prompt;
  const ready = !requiresReflection || reflection.trim().length >= 2;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    gancho: true,
    corf: true,
    video: true,
    aprofundamento: true,
    comparacao: true,
    reflexao: true,
    sintese: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.header {...reveal}>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">
          {title}
        </h2>
      </motion.header>

      {/* momento 1 — gancho */}
      {schema.gancho?.md && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="gancho"
          label="momento 01 · gancho"
          open={openSections.gancho}
          onToggle={() => toggleSection("gancho")}
          reveal={reveal}
        >
          {schema.gancho.destaque_numero && (
            <div
              className="rounded-2xl border-2 p-5 sm:p-6 mb-4 flex flex-col items-center text-center"
              style={{ borderColor: accent, backgroundColor: `${accent}12` }}
            >
              <p
                className="font-display leading-none"
                style={{ color: accent, fontSize: "clamp(64px, 18vw, 144px)" }}
              >
                {schema.gancho.destaque_numero}
              </p>
              {schema.gancho.destaque_legenda && (
                <p className="font-body text-xs sm:text-sm text-perestroika-preto/65 mt-2">
                  {schema.gancho.destaque_legenda}
                </p>
              )}
              {schema.gancho.destaque_source?.url && (
                <a
                  href={schema.gancho.destaque_source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-body text-[11px] sm:text-xs text-perestroika-preto/60 mt-2 underline decoration-perestroika-preto/30 underline-offset-2 hover:text-perestroika-preto hover:decoration-perestroika-preto transition-colors"
                >
                  fonte: {schema.gancho.destaque_source.label ?? "abrir"}
                </a>
              )}
            </div>
          )}
          <RichText md={schema.gancho.md} />
        </CollapsibleSection>
      )}

      {/* slot opcional: signature corf (módulo 2, pílula b) */}
      {schema.signature_corf && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="corf"
          label="framework corf"
          open={openSections.corf}
          onToggle={() => toggleSection("corf")}
          reveal={reveal}
        >
          <CorfSignature accent={accent} caption={schema.signature_corf.caption} />
        </CollapsibleSection>
      )}

      {/* momento 2 — vídeo */}
      {schema.video?.url && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="video"
          label={
            schema.video.optional
              ? `bônus opcional · vídeo · ${schema.video.duration_min ?? 5} min · fora do tempo`
              : `momento 02 · vídeo · ${schema.video.duration_min ?? 5} min`
          }
          open={openSections.video}
          onToggle={() => toggleSection("video")}
          reveal={reveal}
        >
          <div className="mb-3">
            <p className="font-display uppercase text-lg sm:text-xl leading-tight mb-1">
              {schema.video.title}
            </p>
            <p className="font-body text-xs text-perestroika-preto/55">
              canal: {schema.video.channel}
            </p>
            {schema.video.optional && (
              <p className="font-body text-xs text-perestroika-preto/55 mt-2">
                esse vídeo é referência extra. dá pra seguir a pílula sem ver, e o tempo dele não
                entra nos 50 min do módulo.
              </p>
            )}
          </div>
          <PillVideoPlayer url={schema.video.url} trailColor={accent} />
          {schema.video.instruction && (
            <p className="font-body text-sm text-perestroika-preto/80 mt-4 whitespace-pre-wrap">
              {schema.video.instruction}
            </p>
          )}
        </CollapsibleSection>
      )}


      {/* momento 3 — texto de aprofundamento */}
      {schema.aprofundamento?.md && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="aprofundamento"
          label="momento 03 · aprofundamento"
          open={openSections.aprofundamento}
          onToggle={() => toggleSection("aprofundamento")}
          reveal={reveal}
        >
          <RichText md={schema.aprofundamento.md} />
          {schema.aprofundamento.destaque && (
            <div
              className="mt-6 rounded-2xl border-2 p-5 sm:p-6"
              style={{ borderColor: accent, backgroundColor: `${accent}10` }}
            >
              <Sparkle className="h-4 w-4 mb-2" style={{ color: accent }} aria-hidden="true" />
              <p
                className="font-display uppercase leading-tight"
                style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
              >
                {schema.aprofundamento.destaque}
              </p>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* slot opcional: comparação de níveis de prompt (módulo 2, pílula c) */}
      {schema.comparacao_niveis && schema.comparacao_niveis.niveis.length > 0 && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="comparacao"
          label="comparação de níveis"
          open={openSections.comparacao}
          onToggle={() => toggleSection("comparacao")}
          reveal={reveal}
        >
          <ComparacaoNiveis
            accent={accent}
            titulo={schema.comparacao_niveis.titulo}
            cenario={schema.comparacao_niveis.cenario}
            niveis={schema.comparacao_niveis.niveis}
          />
        </CollapsibleSection>
      )}

      {/* momento 4 — pausa reflexiva */}
      {schema.reflexao?.prompt && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="reflexao"
          label="momento 04 · anota aí"
          open={openSections.reflexao}
          onToggle={() => toggleSection("reflexao")}
          reveal={reveal}
          extraHeader={<SaveIndicator status={status} />}
        >
          <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 sm:p-6">
            <p className="font-body text-sm sm:text-base text-perestroika-preto/85 mb-3 whitespace-pre-wrap">
              {schema.reflexao.prompt}
            </p>
            <TextareaWithVoice
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={schema.reflexao.placeholder ?? "escreve aqui ou grave por voz..."}
              rows={4}
              className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none resize-y"
              aria-label="reflexão dessa pílula"
              voiceAriaLabel="gravar reflexão por voz"
            />
          </div>
        </CollapsibleSection>
      )}

      {/* momento 5 — síntese visual */}
      {schema.sintese?.frase && (
        <CollapsibleSection
          pillId={pillId}
          sectionKey="sintese"
          label="momento 05 · síntese"
          open={openSections.sintese}
          onToggle={() => toggleSection("sintese")}
          reveal={reveal}
        >
          <div className="py-4 sm:py-6 flex flex-col items-center text-center gap-4">
            <EletivaSymbol pose="thinking" className="h-16 w-16 sm:h-20 sm:w-20 opacity-90" />
            <p
              className="font-display uppercase leading-[0.95] max-w-2xl"
              style={{ fontSize: "clamp(28px, 6vw, 56px)" }}
            >
              {schema.sintese.frase}
            </p>
          </div>
        </CollapsibleSection>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {!ready && !isCompleted && (
          <p className="font-body text-xs text-perestroika-preto/55">
            escreve uma frase na pausa reflexiva pra liberar.
          </p>
        )}
        <button
          type="button"
          onClick={onComplete}
          disabled={!ready || isCompleted || isCompleting}
          aria-busy={isCompleting}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            !ready || isCompleted || isCompleting
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          }`}
          style={!ready || isCompleted || isCompleting ? undefined : { backgroundColor: accent }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" /> pílula concluída
            </>
          ) : (
            <>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  pillId: string;
  sectionKey: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  reveal: Record<string, unknown>;
  extraHeader?: React.ReactNode;
}

function CollapsibleSection({
  pillId,
  sectionKey,
  label,
  open,
  onToggle,
  children,
  reveal,
  extraHeader,
}: CollapsibleSectionProps) {
  return (
    <motion.section
      {...reveal}
      aria-label={label}
      className="rounded-2xl border-2 border-perestroika-preto/10 bg-perestroika-bege/40 overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-perestroika-preto/[0.02] active:bg-perestroika-preto/[0.04] transition-colors"
      >
        <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {extraHeader}
          <span className="inline-flex items-center justify-center rounded-full border border-perestroika-preto/15 p-1 text-perestroika-preto/60">
            {open ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {children}
        </div>
      )}
    </motion.section>
  );
}

/**
 * renderiza markdown bem simples: parágrafos, **negrito**, listas com `- `.
 * suficiente pro conteúdo curado das pílulas editoriais. não usamos
 * remark/marked aqui pra evitar dependência nova só pra isso.
 */
function RichText({ md }: { md: string }) {
  const blocks = md.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 font-body text-sm sm:text-base text-perestroika-preto/85 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.startsWith("- ")) {
          const items = block.split("\n").map((l) => l.replace(/^-\s+/, ""));
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-perestroika-preto">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
