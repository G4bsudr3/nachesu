import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * rota protegida por role: só usuários com role 'admin' entram.
 * não-logado → /auth. logado sem admin → /app.
 */
export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-perestroika-bege">
        <div className="font-display uppercase text-3xl text-perestroika-preto/40 animate-pulse">
          carregando...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;

  return <>{children}</>;
};
