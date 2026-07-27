import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardData {
  profile: {
    nickname: string | null;
    display_name: string | null;
    has_password: boolean | null;
  } | null;
  nicknameDisplay: string;
}

/**
 * fetch enxuto do perfil pro dashboard / user menu.
 * flags de fbi/prework/missions/tutorial foram removidas junto com o legado Chŏra.
 */
export const useDashboardData = () => {
  const { user } = useAuth();

  return useQuery<DashboardData>({
    queryKey: ["dashboard-data", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const u = user!;
      const { data: profile } = (await supabase
        .rpc("get_my_profile")
        .maybeSingle()) as unknown as {
        data: {
          nickname: string | null;
          display_name: string | null;
          has_password: boolean;
        } | null;
      };

      const nicknameDisplay =
        profile?.nickname ?? profile?.display_name ?? u.email?.split("@")[0] ?? "builder";

      return {
        profile: profile ?? null,
        nicknameDisplay,
      };
    },
  });
};
