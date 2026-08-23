import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isConsentCurrent } from "@/lib/consent";

/**
 * fase A · lê se o estudante já aceitou o termo de uso do tutor (LGPD), na
 * versão vigente. usado pra gatilhar o TutorConsentModal antes de qualquer
 * interação. reprompta se o texto do aviso mudou de versão.
 */
export const useTutorConsent = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-consent", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<{ accepted: boolean; at: string | null; version: string | null }> => {
      const { data } = (await supabase.rpc("get_my_profile").maybeSingle()) as unknown as {
        data: { tutor_consent_at: string | null; tutor_consent_version?: string | null } | null;
      };
      const at = data?.tutor_consent_at ?? null;
      // tutor_consent_version pode não existir até a migration rodar: trata como null.
      const version = data?.tutor_consent_version ?? null;
      return {
        accepted: isConsentCurrent(at, version),
        at,
        version,
      };
    },
  });
};
