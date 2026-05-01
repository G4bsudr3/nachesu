import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";
import { useUserRole } from "@/hooks/useUserRole";

interface ExtrasGateProps {
  children: ReactNode;
}

/**
 * gate pra rotas de features sociais herdadas do chŏra lovable.
 * - admin: passa direto (precisa ver pra decidir reativar)
 * - aluno + flag off: redireciona pra /app
 * - aluno + flag on: passa
 *
 * usar em volta das rotas: galeria, projetos, ranking, álbum, turma, builder, carta-futuro.
 */
export const ExtrasGate = ({ children }: ExtrasGateProps) => {
  const { enabled, isLoading } = useEletivaExtras();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  if (isLoading || roleLoading) return null;
  if (isAdmin) return <>{children}</>;
  if (!enabled) return <Navigate to="/app" replace />;
  return <>{children}</>;
};
