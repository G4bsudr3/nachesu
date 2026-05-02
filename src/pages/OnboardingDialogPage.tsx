import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingDialog, type OnboardingState } from "@/components/OnboardingDialog";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

/**
 * rota dedicada pra abrir o onboarding dialog mesmo sem passar pelo dashboard.
 * útil pra deep-link, retomada via push, ou redirecionamento pós-login.
 */
const OnboardingDialogPage = () => {
  const navigate = useNavigate();
  const { data: eletiva, isLoading } = useEletivaProgress();
  const [open, setOpen] = useState(true);

  // determina o estado certo a partir do snapshot
  const computeState = (): { state: OnboardingState; moduleNumber: number } => {
    if (!eletiva || eletiva.totalPublished === 0) {
      return { state: "primeiro-acesso-fechado", moduleNumber: 1 };
    }
    const moduleNumber = eletiva.currentModule?.number ?? eletiva.nextModule?.number ?? 1;
    if (eletiva.totalCompleted === 0) {
      return { state: "primeiro-acesso-aberto", moduleNumber };
    }
    return { state: "retorno", moduleNumber };
  };

  const handleClose = () => {
    setOpen(false);
    navigate("/app", { replace: true });
  };

  const handlePrimary = () => {
    setOpen(false);
    if (!eletiva || eletiva.totalPublished === 0) {
      navigate("/app/trilhas", { replace: true });
      return;
    }
    const target = eletiva.currentModule ?? eletiva.nextModule;
    if (target) {
      navigate(`/app/modulo/${target.number}`, { replace: true });
    } else {
      navigate("/app", { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse">
            <EletivaSymbol size={72} pose="building" />
          </div>
          <p className="font-body text-xs text-perestroika-preto/55 lowercase">
            preparando seu primeiro acesso...
          </p>
        </div>
      </div>
    );
  }

  const { state, moduleNumber } = computeState();

  return (
    <div className="min-h-dvh bg-perestroika-bege">
      <OnboardingDialog
        open={open}
        onClose={handleClose}
        onPrimary={handlePrimary}
        state={state}
        currentModuleNumber={moduleNumber}
      />
    </div>
  );
};

export default OnboardingDialogPage;
