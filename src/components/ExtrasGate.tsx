import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useActiveEletivaExtras } from "@/features/hub/useEletivaExtras";
import { useUserRole } from "@/hooks/useUserRole";

interface ExtrasGateProps {
  children: ReactNode;
}

/**
 * gate pra rotas de features sociais legadas (mural, álbum, builder ia,
 * carta pro futuro). escondidas por padrão na eletiva.
 * - admin: passa direto (precisa ver pra decidir reativar)
 * - aluno + flag off: redireciona pra /app
 * - aluno + flag on: passa
 */
export const ExtrasGate = ({ children }: ExtrasGateProps) => {
  const { enabled, isLoading } = useActiveEletivaExtras();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (isLoading || roleLoading) return null;
  if (isAdmin) return <>{children}</>;
  if (!enabled) return <Navigate to="/app" replace />;
  return <>{children}</>;
};
