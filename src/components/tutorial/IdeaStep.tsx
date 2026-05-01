import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Loader2, Pencil, Sparkles, WifiOff } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import type { SaveResult, TutorialIdea } from "@/features/tutorial/useTutorialIdea";

const MIN = 20;
const MAX = 500;

interface Props {
  fbiIdea: string | null;
  savedIdea: TutorialIdea | null;
  isCompleted: boolean;
  saving: boolean;
  onSave: (next: TutorialIdea) => Promise<SaveResult>;
  onAfterSave: () => void;
}

const announceSaveResult = (result: SaveResult, label: string) => {
  if (result.synced === true) {
    toast.success(label);
    return;
  }
  if (result.synced === false) {
    const { reason, message } = result;
    if (reason === "offline") {
      toast.warning("salvo offline", {
        description: message,
        icon: <WifiOff className="h-4 w-4" />,
        duration: 7000,
      });
    } else if (reason === "no-user") {
      toast.warning(label, {
        description: message,
        duration: 7000,
      });
    } else {
      toast.error("não consegui sincronizar", {
        description: message,
        duration: 9000,
      });
    }
  }
};

export const IdeaStep = ({
  fbiIdea,
  savedIdea,
  isCompleted,
  saving,
  onSave,
  onAfterSave,
}: Props) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(savedIdea?.idea ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cleanFbi = (fbiIdea ?? "").trim();
  const hasFbi = cleanFbi.length >= 3;

  useEffect(() => {
    if (savedIdea?.idea && !draft) setDraft(savedIdea.idea);
  }, [savedIdea, draft]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
  }, [editing]);

  const showCardChoice = !savedIdea && hasFbi && !editing;
  const showTextarea = editing || (!savedIdea && !hasFbi) || (savedIdea && editing);

  const handleUseFbi = async () => {
    const result = await onSave({ idea: cleanFbi, source: "fbi" });
    announceSaveResult(result, "ideia salva");
    onAfterSave();
  };

  const handleSaveCustom = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < MIN) {
      toast.error(`escreve pelo menos ${MIN} caracteres`, {
        description: `você escreveu ${trimmed.length}. faltam ${MIN - trimmed.length}.`,
      });
      return;
    }
    if (trimmed.length > MAX) {
      toast.error(`máx ${MAX} caracteres`, {
        description: `corta ${trimmed.length - MAX} pra caber.`,
      });
      return;
    }
    const isEdit = Boolean(savedIdea);
    const result = await onSave({ idea: trimmed, source: "custom" });
    announceSaveResult(result, isEdit ? "ideia atualizada" : "ideia salva");
    if (isEdit) {
      toast.message("os prompts já copiados não regeneram automaticamente. recopia se quiser usar a nova ideia.", {
        duration: 6000,
      });
    }
    setEditing(false);
    onAfterSave();
  };

  const count = draft.trim().length;
  const countOk = count >= MIN && count <= MAX;

  return (
    <AccordionItem
      value="ideia-base"
      className="border border-perestroika-preto/10 rounded-3xl bg-perestroika-bege/80 backdrop-blur px-5 sm:px-7 data-[state=open]:border-perestroika-preto/30 transition-colors"
    >
      <AccordionTrigger className="hover:no-underline py-5 sm:py-6 [&[data-state=open]>svg]:text-perestroika-preto">
        <div className="flex items-center gap-4 sm:gap-5 flex-1 text-left">
          <span
            className={`font-display text-3xl sm:text-4xl leading-none shrink-0 ${
              isCompleted ? "text-perestroika-preto/40 line-through" : "text-perestroika-preto"
            }`}
          >
            00
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display uppercase text-xl sm:text-2xl leading-tight text-balance">
              qual ideia vamos construir?
            </h2>
            <div className="flex items-center gap-3 mt-1 font-body text-xs sm:text-sm text-perestroika-preto/60">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                1 min
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-perestroika-azul">
                  <Check className="h-3 w-3" />
                  feito
                </span>
              )}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-6 pt-2">
        <div className="flex flex-col gap-5">
          <p className="font-body text-sm sm:text-base text-perestroika-preto/85 italic text-pretty">
            porque o tutorial inteiro vai usar essa ideia. melhor escolher agora do que travar na 01.
          </p>

          {/* estado: já salva, mostra resumo + opção de trocar */}
          {savedIdea && !editing && (
            <div className="rounded-2xl border border-perestroika-azul/30 bg-perestroika-azul/[0.06] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-perestroika-azul shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[10px] uppercase tracking-wide text-perestroika-preto/55">
                    sua ideia {savedIdea.source === "fbi" ? "(do fbi)" : "(personalizada)"}
                  </p>
                  <p className="mt-1 font-body text-sm text-perestroika-preto/90 text-pretty">
                    {savedIdea.idea}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(savedIdea.idea);
                    setEditing(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege border border-perestroika-preto/20 px-3 py-1.5 text-xs uppercase tracking-wide font-body text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors min-h-9"
                  aria-label="editar ideia"
                >
                  <Pencil className="h-3 w-3" />
                  editar
                </button>
              </div>
            </div>
          )}

          {/* estado A: tem fbi, sem ideia salva */}
          {showCardChoice && (
            <>
              <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-preto/[0.04] p-4">
                <p className="font-body text-[10px] uppercase tracking-wide text-perestroika-preto/55">
                  do seu fbi:
                </p>
                <p className="mt-1.5 font-body text-base text-perestroika-preto/90 text-pretty">
                  {cleanFbi}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleUseFbi}
                  disabled={saving}
                  aria-busy={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-3 text-sm uppercase tracking-wide font-body hover:bg-perestroika-azul transition-colors min-h-12 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  vamos com essa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    setEditing(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-bege border border-perestroika-preto/30 text-perestroika-preto px-5 py-3 text-sm uppercase tracking-wide font-body hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors min-h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                >
                  <Pencil className="h-4 w-4" />
                  quero trocar
                </button>
              </div>
            </>
          )}

          {/* textarea: novo (sem fbi) ou editando */}
          {showTextarea && (
            <div className="flex flex-col gap-3">
              <label
                htmlFor="tutorial-idea-input"
                className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/65"
              >
                {savedIdea ? "edita sua ideia" : "descreve sua ideia"}
              </label>
              <Textarea
                id="tutorial-idea-input"
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="ex: app pra organizar receitas da minha avó, dashboard pro meu time de vôlei, jogo de cartas pra ensinar finanças…"
                maxLength={MAX + 50}
                className="min-h-32 bg-perestroika-bege border-perestroika-preto/20 text-perestroika-preto placeholder:text-perestroika-preto/40 focus-visible:ring-perestroika-laranja"
              />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-body text-xs text-perestroika-preto/60">
                  uma frase ou duas. quanto mais específico, melhor o brief.
                </p>
                <span
                  className={`font-body text-xs tabular-nums ${
                    countOk ? "text-perestroika-preto/55" : "text-perestroika-vermelho"
                  }`}
                  aria-live="polite"
                >
                  {count}/{MAX} (mín {MIN})
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  disabled={saving || count < MIN || count > MAX}
                  aria-busy={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-3 text-sm uppercase tracking-wide font-body hover:bg-perestroika-azul transition-colors min-h-12 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  salvar e seguir
                </button>
                {savedIdea && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(savedIdea.idea);
                      setEditing(false);
                    }}
                    disabled={saving}
                    className="sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-bege border border-perestroika-preto/20 text-perestroika-preto px-5 py-3 text-sm uppercase tracking-wide font-body hover:bg-perestroika-preto/[0.05] transition-colors min-h-12 disabled:opacity-50"
                  >
                    cancelar
                  </button>
                )}
              </div>
              {savedIdea && (
                <p className="font-body text-xs text-perestroika-preto/55 text-pretty">
                  (você pode mudar de ideia depois, mas vai precisar refazer os prompts já copiados)
                </p>
              )}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
