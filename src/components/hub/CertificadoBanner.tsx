import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { FINAL_FEEDBACK_ENABLED } from "@/features/hub/feedbackFinalFlag";

const DISMISS_KEY = "chora:certificado-banner-dismissed";

export const CertificadoBanner = () => {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  // mesma flag do fluxo final: só liberamos certificado quando a entrega final tá no ar
  if (!FINAL_FEEDBACK_ENABLED) return null;
  if (hidden) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setHidden(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-perestroika-laranja/40 bg-perestroika-bege/60 p-5 sm:p-6 shadow-sm"
      >
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1.5"
          style={{
            background:
              "linear-gradient(180deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
          }}
        />
        <button
          type="button"
          onClick={dismiss}
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
                seu certificado tá pronto
              </p>
              <h3 className="font-display text-3xl uppercase leading-none text-perestroika-preto sm:text-4xl">
                baixe quando quiser
              </h3>
              <p className="mt-2 font-body text-sm text-perestroika-preto/70">
                certificado oficial da eletiva, com a sua carta de builder. baixe em alta resolução pra postar onde for.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <Link
              to="/app/certificado"
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:scale-105 active:scale-95 transition-transform"
            >
              <Award className="h-4 w-4" />
              baixar certificado
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
