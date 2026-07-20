import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Award, Check } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "./feedback-final/ProgressBar";
import { StepText } from "./feedback-final/StepText";
import { StepSlider } from "./feedback-final/StepSlider";
import { StepScale } from "./feedback-final/StepScale";
import { StepDone } from "./feedback-final/StepDone";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import {
  EMPTY_DRAFT,
  STEPS,
  isStepValid,
  type FeedbackFinalDraft,
} from "@/features/hub/feedbackFinalSchema";
import { useFeedbackFinal } from "@/features/hub/useFeedbackFinal";
import type { CertificateVariant } from "@/features/hub/feedbackFinalFlag";

interface Props {
  fullName: string;
  archetype?: string | null;
  userId: string | null;
  /** quando true, não persiste nada (bucket nem db). usado no /admin/preview. */
  previewMode?: boolean;
  /** override de variant pro preview admin testar */
  variantOverride?: CertificateVariant;
  /** override de url da artwork pro preview admin (evita refetch) */
  tarotImageUrlOverride?: string | null;
}

export const FeedbackFinalFlow = ({
  fullName,
  archetype,
  userId,
  previewMode = false,
  variantOverride,
  tarotImageUrlOverride,
}: Props) => {
  const { submit, submitting, loadDraft, saveDraft } = useFeedbackFinal();
  const [draft, setDraft] = useState<FeedbackFinalDraft>(() =>
    previewMode ? EMPTY_DRAFT : loadDraft(),
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  const step = STEPS[stepIdx];
  const isLastQuestion = stepIdx === STEPS.length - 1;
  const valid = isStepValid(step, draft);

  // auto-save por mudança no draft
  useEffect(() => {
    if (previewMode) return;
    saveDraft(draft);
  }, [draft, saveDraft, previewMode]);

  const updateField = <K extends keyof FeedbackFinalDraft>(key: K, value: FeedbackFinalDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleNext = async () => {
    if (!valid) {
      toast.error("essa pergunta é obrigatória");
      return;
    }
    if (isLastQuestion) {
      // submit
      if (previewMode) {
        setDone(true);
        return;
      }
      const { error, data } = await submit(draft);
      if (error) {
        toast.error(error.message ?? "erro ao enviar");
        return;
      }
      if (data) {
        const submittedAt = new Date(data.created_at).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        });
        toast.success("respostas enviadas 🤙", {
          description: `id ${data.id.slice(0, 8)} · ${submittedAt}`,
        });
      }
      setDone(true);
      return;
    }
    setStepIdx((i) => i + 1);
  };

  const handlePrev = () => {
    if (stepIdx === 0) return;
    setStepIdx((i) => i - 1);
  };

  // bloco label muda → marca transição mais forte
  const blockChanged = useMemo(() => {
    if (stepIdx === 0) return false;
    return STEPS[stepIdx].block !== STEPS[stepIdx - 1].block;
  }, [stepIdx]);

  if (done) {
    // admin preview ainda renderiza o StepDone (certificado) pra validar visualmente
    if (previewMode) {
      return (
        <StepDone
          fullName={fullName}
          archetype={archetype}
          userId={userId}
          variantOverride={variantOverride}
          persist={false}
          tarotImageUrlOverride={tarotImageUrlOverride}
        />
      );
    }
    // aluno: tela de obrigado, com certificado como CTA opcional separado
    return (
      <div className="flex flex-col items-center text-center py-16 sm:py-24">
        <LagrimaGradient size={72} />
        <p className="mt-8 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-laranja">
          pesquisa enviada
        </p>
        <h1 className="mt-3 font-display uppercase text-5xl sm:text-7xl leading-[0.9] max-w-2xl text-balance">
          valeu por construir junto
        </h1>
        <p className="mt-5 font-body text-perestroika-preto/70 max-w-md text-balance">
          suas respostas chegaram. agora é a parte boa: pegue o seu certificado oficial pra postar onde for.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/app/certificado"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            <Award className="w-4 h-4" />
            baixar certificado
          </Link>
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege border border-perestroika-preto/15 text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            voltar pro hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* top bar com progresso + back */}
      <div className="flex items-center gap-4 mb-8 sm:mb-12">
        <button
          onClick={handlePrev}
          disabled={stepIdx === 0}
          className="shrink-0 rounded-full p-2 text-perestroika-preto/60 hover:bg-perestroika-preto/10 hover:text-perestroika-preto transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <ProgressBar current={stepIdx + 1} total={STEPS.length} />
        </div>
      </div>

      {/* conteúdo do step */}
      <div className="flex-1 flex items-start sm:items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: blockChanged ? 60 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full"
          >
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-perestroika-laranja mb-3">
              {step.blockLabel}
            </div>
            <h2 className="font-display uppercase text-4xl sm:text-6xl leading-[0.95] text-balance text-perestroika-preto">
              {step.question}
            </h2>
            {step.helper && (
              <p className="mt-3 font-body text-perestroika-preto/60 text-sm sm:text-base max-w-xl">
                {step.helper}
              </p>
            )}

            <div className="mt-8 sm:mt-12">
              {step.kind === "text" && (
                <StepText
                  step={step}
                  value={(draft[step.id] as string) ?? ""}
                  onChange={(v) => updateField(step.id, v as never)}
                />
              )}
              {step.kind === "slider" && (
                <StepSlider
                  step={step}
                  value={draft[step.id] as number | null}
                  onChange={(v) => updateField(step.id, v as never)}
                />
              )}
              {step.kind === "scale" && (
                <StepScale
                  step={step}
                  value={draft[step.id] as number | null}
                  onChange={(v) => updateField(step.id, v as never)}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* footer fixo com CTA */}
      <div className="mt-10 flex items-center justify-between gap-4">
        <span className="text-xs text-perestroika-preto/45">
          {step.required ? "obrigatório" : "opcional"}
        </span>
        <button
          onClick={handleNext}
          disabled={submitting || (step.required && !valid)}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          {isLastQuestion ? (
            <>
              <Check className="w-4 h-4" />
              {submitting ? "enviando…" : previewMode ? "ver certificado (preview)" : "finalizar"}
            </>
          ) : (
            <>
              avançar
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
