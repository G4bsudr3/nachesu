import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TutorSettings = {
  enabled: boolean;
  per_user_daily_limit: number;
  model: string;
  system_prompt_addon: string | null;
  updated_at: string | null;
};

export const useTutorSettings = () => {
  return useQuery({
    queryKey: ["tutor-settings"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<TutorSettings> => {
      const { data, error } = await supabase
        .from("tutor_settings")
        .select("enabled, per_user_daily_limit, model, system_prompt_addon, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          enabled: true,
          per_user_daily_limit: 50,
          model: "google/gemini-2.5-flash",
          system_prompt_addon: null,
          updated_at: null,
        }
      );
    },
  });
};
