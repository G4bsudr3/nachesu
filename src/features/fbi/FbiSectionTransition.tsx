import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BalaoSerrado } from "@/components/brand/BalaoSerrado";

interface Props {
  label: string;
  sub?: string;
  onContinue: () => void;
}

/**
 * tela cinematográfica de transição entre seções do fbi.
 * - balão serrado grande no centro com label da seção (ex: "02 / logística")
 * - subtítulo curto abaixo
 * - auto-avança em 1.6s (clique pra pular)
 * - respeita prefers-reduced-motion (vira 0.6s, sem animações grandes)
 */
export const FbiSectionTransition = ({ label, sub, onContinue }: Props) => {
  const reduce = useReducedMotion();
  const delay = reduce ? 600 : 1600;

  useEffect(() => {
    const t = setTimeout(onContinue, delay);
    return () => clearTimeout(t);
  }, [onContinue, delay]);

  return (
    <button
      type="button"
      onClick={onContinue}
      aria-label="continuar"
      className="w-full flex flex-col items-center justify-center text-center min-h-[60vh] cursor-pointer focus:outline-none"
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.3 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl"
      >
        <BalaoSerrado>{label}</BalaoSerrado>
      </motion.div>
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reduce ? 0.1 : 0.35 }}
          className="mt-8 font-body text-base sm:text-lg text-perestroika-preto/70"
        >
          {sub}
        </motion.p>
      )}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: reduce ? 0.2 : 0.8 }}
        className="mt-12 font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/40"
      >
        toque para pular
      </motion.span>
    </button>
  );
};
