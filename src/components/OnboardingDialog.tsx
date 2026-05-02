import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { ArrowRight } from "lucide-react";

export type OnboardingState = "primeiro-acesso-aberto" | "primeiro-acesso-fechado" | "retorno";

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  onPrimary: () => void;
  state: OnboardingState;
  /** número do módulo atual a abrir (default 1) */
  currentModuleNumber?: number;
}

const COPY: Record<
  OnboardingState,
  {
    title: string;
    subtitle: string;
    primary: string;
    pose: "talking" | "building" | "resting";
    bullets: string[];
  }
> = {
  "primeiro-acesso-aberto": {
    title: "boas-vindas à eletiva",
    subtitle:
      "ia na prática, do zero. são 20 módulos divididos em 4 trilhas, no seu tempo. o primeiro tá aberto.",
    primary: "abrir o primeiro módulo",
    pose: "talking",
    bullets: [
      "fundamentos: o que é IA e por que isso muda o jogo",
      "prompts: aprender a conversar com a máquina",
      "construção: tirar ideia do papel com IA",
      "publicar: soltar o seu projeto pro mundo",
    ],
  },
  "primeiro-acesso-fechado": {
    title: "boas-vindas à eletiva",
    subtitle:
      "ia na prática, do zero. a eletiva tá aquecendo, o primeiro módulo abre em breve. enquanto isso, dá uma olhada no mapa.",
    primary: "ver as trilhas",
    pose: "resting",
    bullets: [
      "fundamentos: o que é IA e por que isso muda o jogo",
      "prompts: aprender a conversar com a máquina",
      "construção: tirar ideia do papel com IA",
      "publicar: soltar o seu projeto pro mundo",
    ],
  },
  retorno: {
    title: "bom te ver de volta",
    subtitle: "seu próximo módulo tá aí embaixo. continua de onde parou.",
    primary: "continuar",
    pose: "building",
    bullets: [],
  },
};

export const OnboardingDialog = ({
  open,
  onClose,
  onPrimary,
  state,
}: OnboardingDialogProps) => {
  const { title, subtitle, primary, pose, bullets } = COPY[state];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-perestroika-bege border-perestroika-preto/15 sm:rounded-3xl max-w-lg p-0 overflow-hidden">
        <div className="flex flex-col items-center pt-8 pb-2 px-6 sm:px-10">
          <EletivaSymbol size={64} pose={pose} />
          <DialogTitle className="mt-5 font-display uppercase text-4xl sm:text-5xl leading-none text-perestroika-preto text-center text-balance">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-3 font-body text-sm sm:text-base text-perestroika-preto/75 text-center text-pretty">
            {subtitle}
          </DialogDescription>
        </div>

        <div className="px-6 sm:px-10 pb-8 pt-4 flex flex-col gap-6">
          {bullets.length > 0 && (
            <section>
              <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-3">
                as 4 trilhas
              </h3>
              <ul className="flex flex-col gap-2.5 font-body text-sm text-perestroika-preto/80">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-perestroika-preto/40"
                    />
                    <span className="text-pretty">{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-6 font-body text-sm uppercase tracking-wide transition-all hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              {primary}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-body text-sm text-perestroika-preto/60 underline underline-offset-4 hover:text-perestroika-preto transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
            >
              depois eu vejo
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
