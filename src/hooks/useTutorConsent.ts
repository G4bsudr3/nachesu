import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * fase A · lê se o estudante já aceitou o termo de uso do tutor (LGPD).
 * usado pra gatilhar o TutorConsentModal antes de qualquer interação.
 */
export const useTutorConsent = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-consent", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<{ accepted: boolean; at: string | null }> => {
      const { data } = await supabase
        .from("profiles")
        .select("tutor_consent_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return {
        accepted: !!data?.tutor_consent_at,
        at: data?.tutor_consent_at ?? null,
      };
    },
  });
};
