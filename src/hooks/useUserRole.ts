import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * busca os papéis do usuário logado em user_roles.
 * retorna { roles, isAdmin, loading }.
 */
export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user && !authLoading,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) {
        logger.error("[useUserRole] erro:", error);
        return [];
      }
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = data ?? [];

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isMentor: roles.includes("mentor"),
    loading: authLoading || (!!user && isLoading),
  };
};
