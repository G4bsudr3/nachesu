import { motion, useReducedMotion } from "framer-motion";

type Letter = { letter: string; word: string };

const DEFAULT_LETTERS: Letter[] = [
  { letter: "C", word: "contexto" },
  { letter: "O", word: "objetivo" },
  { letter: "R", word: "regras" },
  { letter: "F", word: "formato" },
];

interface Props {
  accent: string;
  letters?: Letter[];
  caption?: string;
}

/**
 * signature moment do módulo 2: 4 cards C-O-R-F com letras Recoleta-like
 * gigantes entrando em stagger + palavra revelada por mask reveal embaixo.
 * respeita prefers-reduced-motion.
 */
export function CorfSignature({ accent, letters = DEFAULT_LETTERS, caption }: Props) {
  const reduce = useReducedMotion();

  return (
    <figure
      aria-label="framework corf: contexto, objetivo, regras, formato"
      className="rounded-3xl border-2 p-5 sm:p-8"
      style={{ borderColor: accent, backgroundColor: `${accent}10` }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {letters.map((item, i) => (
          <motion.div
            key={item.letter}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
            whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              delay: reduce ? 0 : i * 0.2,
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="rounded-2xl bg-perestroika-bege border-2 border-perestroika-preto/15 px-2 py-5 sm:py-7 flex flex-col items-center text-center overflow-hidden"
          >
            <span
              className="font-display leading-none"
              style={{
                color: accent,
                fontSize: "clamp(72px, 14vw, 144px)",
              }}
              aria-hidden="true"
            >
              {item.letter}
            </span>
            <div className="mt-2 sm:mt-3 overflow-hidden">
              <motion.span
                initial={reduce ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
                whileInView={reduce ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  delay: reduce ? 0 : i * 0.2 + 0.35,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="block font-body text-[11px] sm:text-sm uppercase tracking-[0.06em] sm:tracking-[0.18em] text-perestroika-preto/80"
              >
                {item.word}
              </motion.span>
            </div>
          </motion.div>
        ))}
      </div>
      {caption && (
        <figcaption className="font-body text-xs sm:text-sm text-perestroika-preto/65 text-center mt-4 sm:mt-5">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
