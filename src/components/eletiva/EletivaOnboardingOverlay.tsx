import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Step {
  pose: "talking" | "thinking" | "celebrating" | "building";
  title: string;
  body: string;
}

interface Props {
  /** slug do curso — usado pra persistir o "já viu" por eletiva */
  slug: string;
  /** título do curso pra mostrar no primeiro slide */
  courseTitle: string;
  professorName?: string | null;
}

// step_id compartilhado com tutorial_progress. persiste por usuário no db
// (não em localStorage) pra não reaparecer em outro dispositivo/navegador.
const stepId = (slug: string) => `eletiva-welcome:${slug}`;
const LEGACY_LS_KEY = (slug: string) => `eletiva:onboarded:${slug}`;

export const EletivaOnboardingOverlay = ({ slug, courseTitle, professorName }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      // migração transparente: se já tem flag antiga no localStorage,
      // grava no db e não abre.
      let alreadySeen = false;
      try {
        if (typeof window !== "undefined" && window.localStorage.getItem(LEGACY_LS_KEY(slug))) {
          alreadySeen = true;
        }
      } catch {
        /* private mode */
      }

      if (!alreadySeen) {
        const { data } = await supabase
          .from("tutorial_progress")
          .select("step_id")
          .eq("user_id", user.id)
          .eq("step_id", stepId(slug))
          .maybeSingle();
        alreadySeen = !!data;
      }

      if (cancelled) return;

      if (alreadySeen) {
        // garante upsert pra consolidar a flag no db em qualquer caminho
        void supabase
          .from("tutorial_progress")
          .upsert(
            { user_id: user.id, step_id: stepId(slug) },
            { onConflict: "user_id,step_id" }
          );
        return;
      }

      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, user?.id]);

  const close = async () => {
    setOpen(false);
    try {
      window.localStorage.setItem(LEGACY_LS_KEY(slug), "1");
    } catch {
      /* private mode */
    }
    if (user?.id) {
      await supabase
        .from("tutorial_progress")
        .upsert(
          { user_id: user.id, step_id: stepId(slug) },
          { onConflict: "user_id,step_id" }
        );
    }
  };

  // esc fecha o overlay: sem isso, no teclado/desktop o único jeito é o X.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const steps: Step[] = [
    {
      pose: "talking",
      title: `boas-vindas a ${courseTitle.toLowerCase()}`,
      body: professorName
        ? `quem te guia aqui é ${professorName.toLowerCase()}. eu sou o joão-de-barro, teu tutor IA, sempre por perto.`
        : `eu sou o joão-de-barro, teu tutor IA. tô por perto sempre que precisar destravar uma ideia.`,
    },
    {
      pose: "building",
      title: "como a eletiva funciona",
      body: "4 trilhas, 5 módulos cada. cada módulo tem pílulas curtas, exercícios e um registro pra fixar. faz no teu tempo.",
    },
    {
      pose: "thinking",
      title: "abre quando você fecha",
      body: "o próximo módulo libera assim que você marca o anterior como concluído. nada de pressa, só ritmo.",
    },
    {
      pose: "celebrating",
      title: "bora começar?",
      body: "vai pro mapa de trilhas e escolhe por onde entrar. eu fico no canto pra qualquer dúvida.",
    },
  ];

  const current = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-perestroika-preto/60 backdrop-blur-sm p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="boas-vindas à eletiva"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative w-full max-w-lg rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege text-perestroika-preto p-6 sm:p-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label="fechar boas-vindas"
              className="absolute top-2 right-2 inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-perestroika-preto/60 hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4 mb-5">
              <div className="shrink-0">
                <EletivaSymbol size={72} pose={current.pose} />
              </div>
              <div className="pt-1">
                <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> passo {step + 1} de {steps.length}
                </p>
                <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[0.95]">
                  {current.title}
                </h2>
              </div>
            </div>

            <p className="font-body text-base text-perestroika-preto/80 mb-6">{current.body}</p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5" aria-hidden="true">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i === step ? "bg-perestroika-preto" : "bg-perestroika-preto/20"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full px-4 min-h-11 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto touch-manipulation"
                >
                  pular
                </button>
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="rounded-full bg-perestroika-preto text-perestroika-bege px-5 min-h-11 font-body text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform touch-manipulation"
                  >
                    próximo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full bg-perestroika-preto text-perestroika-bege px-5 min-h-11 font-body text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform touch-manipulation"
                  >
                    bora
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
