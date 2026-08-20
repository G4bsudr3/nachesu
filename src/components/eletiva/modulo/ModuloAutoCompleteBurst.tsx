import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

interface Props {
  open: boolean;
  onDone: () => void;
  message?: string;
  /** se o próximo módulo destravou junto, mostra hint extra */
  nextUnlocked?: boolean;
}

/**
 * burst de celebração que aparece quando o módulo fecha sozinho ao concluir
 * a última pílula obrigatória. signature moment: joão-de-barro em pose
 * celebrating + frase grande + confetes em arco. dura ~2.2s e some.
 */
export function ModuloAutoCompleteBurst({ open, onDone, message, nextUnlocked }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onDone, reduce ? 1200 : 2200);
    return () => clearTimeout(t);
  }, [open, onDone, reduce]);

  // 14 partículas em arco, cores da paleta
  const dots = Array.from({ length: 14 });
  const colors = ["#fe7b02", "#fd4644", "#f756a6", "#6f77fc", "#090909"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="módulo concluído"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-perestroika-preto/55 backdrop-blur-sm pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.86, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege text-perestroika-preto px-8 py-7 max-w-md text-center"
          >
            {/* confetes */}
            {!reduce &&
              dots.map((_, i) => {
                const angle = (i / dots.length) * Math.PI * 2;
                const dist = 120 + (i % 3) * 30;
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist;
                const color = colors[i % colors.length];
                return (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{ x, y, opacity: [0, 1, 0], scale: 1 }}
                    transition={{ duration: 1.4, delay: 0.05 + i * 0.015, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
                    style={{ background: color }}
                  />
                );
              })}

            <div className="flex flex-col items-center gap-4 relative">
              <EletivaSymbol pose="celebrating" size={88} />
              <p className="font-display uppercase leading-[0.95] text-3xl sm:text-4xl">
                {message ?? "rodou tudo. módulo fechado."}
              </p>
              {nextUnlocked && (
                <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
                  próximo módulo liberado
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
