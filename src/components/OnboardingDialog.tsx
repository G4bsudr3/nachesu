import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { Check, ArrowRight } from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  onPrimary: () => void;
  accessLevel: "full" | "gated";
  cardPublished: boolean;
  fbiSubmitted: boolean;
}

export const OnboardingDialog = ({
  open,
  onClose,
  onPrimary,
  accessLevel,
  cardPublished,
  fbiSubmitted,
}: OnboardingDialogProps) => {
  // 3 estados: sem fbi → carta pendente → carta publicada
  const noFbi = !fbiSubmitted;
  const primaryLabel = noFbi
    ? "ver o mapa da trilha"
    : cardPublished
      ? "ver minha carta"
      : "ir pro hub";

  const title = noFbi ? "boas-vindas ao chŏra hub" : "bem-vindo ao chŏra hub";
  const subtitle = noFbi
    ? "pra você descobrir o seu arquétipo e abrir a sua própria carta, a gente precisa de uns 10 minutos seus no fbi. abrimos o mapa da trilha pra você ver o que vem pela frente."
    : "esse é o seu espaço da imersão. é daqui que você prepara, joga e revisita depois.";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-perestroika-bege border-perestroika-preto/15 sm:rounded-3xl max-w-lg p-0 overflow-hidden">
        <div className="flex flex-col items-center pt-8 pb-2 px-6 sm:px-10">
          <LagrimaGradient size={56} />
          <DialogTitle className="mt-5 font-display uppercase text-4xl sm:text-5xl leading-none text-perestroika-preto text-center text-balance">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-3 font-body text-sm sm:text-base text-perestroika-preto/75 text-center text-pretty">
            {subtitle}
          </DialogDescription>
        </div>

        <div className="px-6 sm:px-10 pb-8 pt-4 flex flex-col gap-6">
          {noFbi ? (
            <section>
              <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-3">
                seu primeiro passo
              </h3>
              <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-4">
                <div className="font-body text-sm sm:text-base font-semibold text-perestroika-preto mb-1">
                  responda o fbi
                </div>
                <p className="font-body text-sm text-perestroika-preto/70 text-pretty">
                  19 perguntas curtas. é o que destrava a sua carta personalizada de builder.
                </p>
              </div>
            </section>
          ) : (
            <section>
              <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-3">
                o que tem aqui pra você agora
              </h3>
              <ul className="flex flex-col gap-3">
                {cardPublished ? (
                  <li className="flex gap-3">
                    <Check className="h-4 w-4 mt-1 shrink-0 text-perestroika-preto" />
                    <div>
                      <div className="font-body text-sm sm:text-base font-semibold text-perestroika-preto">
                        sua carta de builder completa
                      </div>
                      <p className="font-body text-sm text-perestroika-preto/70 text-pretty">
                        a versão pública é um teaser. aqui você vê arquétipo, superpoder, sombra e próximo movimento, na íntegra.
                      </p>
                    </div>
                  </li>
                ) : (
                  <li className="flex gap-3">
                    <Check className="h-4 w-4 mt-1 shrink-0 text-perestroika-preto" />
                    <div>
                      <div className="font-body text-sm sm:text-base font-semibold text-perestroika-preto">
                        sua carta de builder
                      </div>
                      <p className="font-body text-sm text-perestroika-preto/70 text-pretty">
                        o frattz está finalizando. avisamos no whatsapp quando publicar.
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex gap-3">
                  <Check className="h-4 w-4 mt-1 shrink-0 text-perestroika-preto" />
                  <div>
                    <div className="font-body text-sm sm:text-base font-semibold text-perestroika-preto">
                      suas respostas do fbi
                    </div>
                    <p className="font-body text-sm text-perestroika-preto/70 text-pretty">
                      pra revisitar quando quiser.
                    </p>
                  </div>
                </li>
              </ul>
            </section>
          )}

          <section>
            <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-3">
              sua trilha no hub
            </h3>
            <ul className="flex flex-col gap-2 font-body text-sm text-perestroika-preto/80">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-perestroika-preto/40" /> fbi · 10 min</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-perestroika-preto/40" /> sua carta de builder</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-perestroika-preto/40" /> pré-work · 6 itens</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-perestroika-preto/40" /> tutorial · etapa 00 + 5 etapas</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-perestroika-preto/40" /> missões · 5 desafios curtos</li>
              <li className="flex items-center gap-2 text-perestroika-preto/55"><Check className="h-3.5 w-3.5 text-perestroika-preto/30" /> hub da turma · libera dia 25</li>
            </ul>
          </section>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-6 font-body text-sm uppercase tracking-wide transition-all hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              {primaryLabel}
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

          <p className="font-body text-xs text-perestroika-preto/60 text-center text-pretty">
            a gente avisa no whatsapp sempre que algo novo libera.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
