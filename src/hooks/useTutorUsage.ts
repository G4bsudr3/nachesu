import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * conta quantas perguntas o estudante já fez ao tutor hoje (timezone BRT).
 * usado pelo chip "X/Y hoje" no header.
 */
export const useTutorUsage = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-usage", user?.id],
    enabled: !!user,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<number> => {
      const nowMs = Date.now();
      const brtNow = new Date(nowMs - 3 * 60 * 60 * 1000);
      brtNow.setUTCHours(0, 0, 0, 0);
      const startOfDayUtc = new Date(brtNow.getTime() + 3 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("tutor_message_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", startOfDayUtc);
      if (error) throw error;
      return count ?? 0;
    },
  });
};
