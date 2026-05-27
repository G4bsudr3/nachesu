import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useActiveEletivaExtras } from "@/features/hub/useEletivaExtras";
import { useUserRole } from "@/hooks/useUserRole";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

interface ExtrasGateProps {
  children: ReactNode;
}

const RedirectWithToast = () => {
  useEffect(() => {
    toast.info("essa área não está liberada na sua eletiva.", {
      description: "te trouxe de volta pro início.",
      duration: 4000,
    });
  }, []);
  return <Navigate to="/app" replace />;
};

/**
 * gate pra rotas de features sociais legadas (mural, álbum, builder ia,
 * carta pro futuro, tutorial, onboarding, feedback final, certificado).
 *
 * regra:
 * - admin: passa direto (precisa ver pra decidir reativar)
 * - aluno + flag on: passa
 * - aluno + flag off OU sem matrícula: redireciona pra /app com toast
 */
export const ExtrasGate = ({ children }: ExtrasGateProps) => {
  const { enabled, isLoading } = useActiveEletivaExtras();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="motion-safe:animate-pulse">
          <EletivaSymbol size={56} pose="thinking" />
        </div>
        <span className="sr-only">verificando acesso</span>
      </div>
    );
  }
  if (isAdmin) return <>{children}</>;
  if (!enabled) return <RedirectWithToast />;
  return <>{children}</>;
};
