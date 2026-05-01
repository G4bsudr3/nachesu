import { useAuth } from "@/contexts/AuthContext";
import { isFullAccess, type AccessLevel } from "@/lib/access";

/** Retorna o nível de acesso UX do user logado.
 * 'full' = um dos 5 admins, vê tudo.
 * 'gated' = qualquer outro user logado, só vê fbi + carta. */
export const useAccessLevel = (): { level: AccessLevel; isFull: boolean; isGated: boolean; loading: boolean } => {
  const { user, loading } = useAuth();
  const level: AccessLevel = isFullAccess(user?.email) ? "full" : "gated";
  return {
    level,
    isFull: level === "full",
    isGated: level === "gated",
    loading,
  };
};
