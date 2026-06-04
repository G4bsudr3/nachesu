import { motion, useReducedMotion } from "framer-motion";

export type NivelItem = {
  nivel: string;
  rotulo: string;
  prompt: string;
  resposta_esperada: string;
};

interface Props {
  accent: string;
  titulo?: string;
  cenario?: string;
  niveis: NivelItem[];
}

/**
 * 3 cards verticais comparando níveis de prompt (fraco / OK / forte),
 * com escalada visual de saturação. usado na pílula C do módulo 2.
 */
export function ComparacaoNiveis({ accent, titulo, cenario, niveis }: Props) {
  const reduce = useReducedMotion();

  return (
    <section aria-label="comparação de níveis de prompt" className="space-y-4">
      {titulo && (
        <p
          className="font-display uppercase leading-tight"
          style={{ fontSize: "clamp(20px, 3.6vw, 28px)" }}
        >
          {titulo}
        </p>
      )}
      {cenario && (
        <p className="font-body text-sm sm:text-base text-perestroika-preto/80 whitespace-pre-wrap">
          {cenario}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {niveis.map((n, i) => {
          const intensity = i === 0 ? 0.06 : i === 1 ? 0.14 : 0.22;
          return (
            <motion.article
              key={n.nivel}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: reduce ? 0 : i * 0.12, duration: 0.45 }}
              className="rounded-2xl border-2 p-4 sm:p-5 flex flex-col gap-3"
              style={{
                borderColor: accent,
                backgroundColor: `rgba(254, 123, 2, ${intensity})`,
              }}
            >
              <header>
                <p
                  className="font-body text-[11px] uppercase tracking-[0.2em]"
                  style={{ color: accent }}
                >
                  nível {n.nivel}
                </p>
                <p className="font-display uppercase text-xl sm:text-2xl leading-tight mt-1">
                  {n.rotulo}
                </p>
              </header>
              <div>
                <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                  prompt
                </p>
                <p className="font-body text-sm text-perestroika-preto/90 whitespace-pre-wrap leading-relaxed bg-perestroika-bege rounded-lg border border-perestroika-preto/10 p-3">
                  {n.prompt}
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                  resposta esperada
                </p>
                <p className="font-body text-xs sm:text-sm text-perestroika-preto/80 whitespace-pre-wrap leading-relaxed">
                  {n.resposta_esperada}
                </p>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
