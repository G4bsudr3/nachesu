import { Navigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileStatus } from "@/hooks/useProfileStatus";

interface ProtectedRouteProps {
  children: ReactNode;
  /** quando true, ignora checagem de status (use em /app/pending pra não criar loop) */
  allowPending?: boolean;
}

export const ProtectedRoute = ({ children, allowPending = false }: ProtectedRouteProps) => {
  const { user, loading, signOut } = useAuth();
  const { status, loading: statusLoading } = useProfileStatus();

  useEffect(() => {
    if (!loading && !statusLoading && status === "archived") {
      toast.error("acesso revogado");
      signOut();
    }
  }, [status, loading, statusLoading, signOut]);

  if (loading || (user && statusLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-perestroika-bege">
        <div className="font-display uppercase text-3xl text-perestroika-preto/40 animate-pulse">
          carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (status === "archived") {
    return <Navigate to="/auth" replace />;
  }

  if (status === "pending" && !allowPending) {
    return <Navigate to="/app/pending" replace />;
  }

  return <>{children}</>;
};
