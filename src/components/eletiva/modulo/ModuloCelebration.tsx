import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

interface Props {
  moduleNumber: number;
  courseSlug: string | null;
  /** label opcional do próximo módulo: "próximo módulo libera em 7 dias" */
  nextHint?: string;
}

/**
 * tela de celebração que aparece quando o estudante conclui o módulo inteiro.
 * signature moment: joão-de-barro em pose celebrating + display gigante em
 * stagger reveal. fica no topo do conteúdo, não bloqueia rolagem pro
 * material já consumido.
 */
export function ModuloCelebration({ moduleNumber, courseSlug, nextHint }: Props) {
  const reduce = useReducedMotion();
  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <section
      role="status"
      aria-label="módulo concluído"
      className="my-8 rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-6 py-10 sm:py-14 text-center flex flex-col items-center gap-5"
    >
      <motion.div {...fade}>
        <EletivaSymbol pose="celebrating" className="h-28 w-28 sm:h-36 sm:w-36" />
      </motion.div>
      <motion.h2
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] as const },
            })}
        className="font-display uppercase leading-[0.92] max-w-2xl"
        style={{ fontSize: "clamp(36px, 8vw, 72px)" }}
      >
        você fechou o módulo {String(moduleNumber).padStart(2, "0")}
      </motion.h2>
      <motion.p
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.6, delay: 0.32 },
            })}
        className="font-body text-sm sm:text-base text-perestroika-preto/75 max-w-md"
      >
        {nextHint ?? "obrigado por entregar com presença. próximo módulo libera em breve."}
      </motion.p>
      {courseSlug && (
        <Link
          to={`/app/eletiva/${courseSlug}`}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          voltar pro mapa da eletiva
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
