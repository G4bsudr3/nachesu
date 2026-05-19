import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { trailMessages } from "@/lib/trailMessages";

interface Props {
  fromTrailTitle: string;
  toTrailTitle: string;
  toTrailIndex: number; // 2 | 3 | 4
  storageKey: string;
  trailColor: string;
}


/**
 * marco visual no início dos módulos 6, 11 e 16. aparece uma única vez por trilha
 * (persistido em localStorage). não bloqueia leitura: é um cartão dispensável
 * que ancora o aluno no arco narrativo de 4 trilhas × 5 módulos.
 */
export const TrailTransitionBanner = ({
  fromTrailTitle,
  toTrailTitle,
  toTrailIndex,
  storageKey,
  trailColor,
}: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey)) return;
    setVisible(true);
  }, [storageKey]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    }
    setVisible(false);
  };

  const msg = trailMessages[toTrailIndex] ?? {
    eyebrow: `fim de "${fromTrailTitle.toLowerCase()}" · começo de "${toTrailTitle.toLowerCase()}"`,
    head: "nova trilha começa aqui",
    sub: "respira um pouco, olha pra trás e segue.",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-6 sm:p-8 mb-8"
          aria-label="transição entre trilhas"
        >
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: trailColor }}
            aria-hidden="true"
          />
          <div
            className="absolute -right-6 -top-2 opacity-25 pointer-events-none"
            aria-hidden="true"
          >
            <EletivaSymbol size={140} pose="celebrating" rotate={-6} />
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="fechar marco"
            className="absolute right-3 top-3 rounded-full p-2 hover:bg-perestroika-bege/10"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-bege/70 mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> {msg.eyebrow}
          </p>
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-3 max-w-lg">
            {msg.head}
          </h2>
          <p className="font-body text-sm sm:text-base text-perestroika-bege/85 max-w-xl mb-5">
            {msg.sub}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-5 py-2.5 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            seguir pro módulo
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
