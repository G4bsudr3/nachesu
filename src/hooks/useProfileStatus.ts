import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

type Status = "active" | "pending" | "archived" | null;

export const useProfileStatus = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["profile-status", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<Status> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        logger.error("[useProfileStatus] erro:", error);
        return "active"; // fail open pra não trancar usuário existente
      }
      return ((data?.status as Status) ?? "active");
    },
  });

  return {
    status: user ? (data ?? null) : null,
    loading: !!user && isLoading,
  };
};
