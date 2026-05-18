import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useActiveEletivaExtras } from "@/features/hub/useEletivaExtras";
import { useUserRole } from "@/hooks/useUserRole";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

interface ExtrasGateProps {
  children: ReactNode;
}

/**
 * gate pra rotas de features sociais legadas (mural, álbum, builder ia,
 * carta pro futuro, tutorial, onboarding, feedback final, certificado).
 *
 * regra:
 * - admin: passa direto (precisa ver pra decidir reativar)
 * - aluno + flag on: passa
 * - aluno + flag off OU sem matrícula: redireciona pra /app (equivalente a 403)
 *
 * a flag é resolvida via useActiveEletivaExtras(): per-course se a eletiva
 * ativa tem override, senão cai no global (default false). aluno sem
 * enrollment cai no global também (false) → bloqueado.
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
  if (!enabled) return <Navigate to="/app" replace />;
  return <>{children}</>;
};
