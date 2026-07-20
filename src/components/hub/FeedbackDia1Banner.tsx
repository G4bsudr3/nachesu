import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { useFeedbackDia1 } from "@/features/hub/useFeedbackDia1";
import { FeedbackDia1Modal } from "./FeedbackDia1Modal";

export const FeedbackDia1Banner = () => {
  const { shouldShow, dismissPermanent, dismissSession } = useFeedbackDia1();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!shouldShow || hidden) return <FeedbackDia1Modal open={open} onOpenChange={setOpen} />;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8 overflow-hidden rounded-3xl border border-perestroika-laranja/40 bg-perestroika-bege/60 p-5 sm:p-6 shadow-sm"
        >
          {/* faixa gradient lateral */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1.5"
            style={{
              background:
                "linear-gradient(180deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
            }}
          />
          {/* X fechar (sessão) */}
          <button
            type="button"
            onClick={() => {
              dismissSession();
              setHidden(true);
            }}
            aria-label="fechar"
            className="absolute right-3 top-3 rounded-full p-1.5 text-perestroika-preto/50 hover:bg-perestroika-preto/5 hover:text-perestroika-preto transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex flex-col gap-4 pl-3 sm:flex-row sm:items-center sm:justify-between sm:pl-4">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="shrink-0">
                <LagrimaGradient size={48} />
              </div>
              <div className="min-w-0 pr-6 sm:pr-0">
                <p className="mb-1 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-laranja">
                  retorno rápido
                </p>
                <h3 className="font-display text-3xl uppercase leading-none text-perestroika-preto sm:text-4xl">
                  como foi teu dia 1?
                </h3>
                <p className="mt-2 font-body text-sm text-perestroika-preto/70">
                  3 perguntas, leva 1 minuto. ajuda a gente a deixar o dia 2 ainda mais foda.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4 self-start sm:self-center">
              <button
                type="button"
                onClick={() => {
                  dismissPermanent();
                  setHidden(true);
                }}
                className="font-body text-xs uppercase tracking-wide text-perestroika-preto/55 underline-offset-4 hover:underline hover:text-perestroika-preto"
              >
                agora não
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:scale-105 active:scale-95 transition-transform"
              >
                responder
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <FeedbackDia1Modal open={open} onOpenChange={setOpen} />
    </>
  );
};
