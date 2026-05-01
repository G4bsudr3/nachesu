import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * status unificado da jornada pós-evento.
 * 1 query react-query, 3 fetches paralelos, cacheada por 60s.
 *
 * ordem de prioridade (qual ação aparece primeiro pro user):
 *   carta pro futuro → pesquisa final → certificado → tudo feito
 */
export interface PostEventStatus {
  // carta pro futuro
  futureLetterSessionOpen: boolean;
  futureLetterDone: boolean;
  // pesquisa final
  feedbackFinalDone: boolean;
  // certificado
  certificateIssued: boolean;
  // helpers de UI
  loading: boolean;
  allDone: boolean;
  /** primeira ação pendente, na ordem definida acima */
  nextAction: "carta-futuro" | "pesquisa-final" | "certificado" | "done";
}

const computeNextAction = (s: {
  futureLetterSessionOpen: boolean;
  futureLetterDone: boolean;
  feedbackFinalDone: boolean;
  certificateIssued: boolean;
}): PostEventStatus["nextAction"] => {
  if (s.futureLetterSessionOpen && !s.futureLetterDone) return "carta-futuro";
  if (!s.feedbackFinalDone) return "pesquisa-final";
  if (!s.certificateIssued) return "certificado";
  return "done";
};

export const usePostEventStatus = (): PostEventStatus => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["post-event-status", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) {
        return {
          futureLetterSessionOpen: false,
          futureLetterDone: false,
          feedbackFinalDone: false,
          certificateIssued: false,
        };
      }

      const [sessionRes, feedbackRes, certRes] = await Promise.all([
        supabase
          .from("future_letter_sessions")
          .select("id")
          .eq("status", "open")
          .order("send_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("hub_event_feedback_final")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("hub_certificates")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const sessionOpen = !!sessionRes.data;
      let futureLetterDone = false;

      // se tem sessão aberta, checa via RPC se o user já submeteu
      if (sessionOpen && sessionRes.data) {
        const { data: response } = await (supabase as any).rpc(
          "get_my_future_letter_response",
          { _session_id: sessionRes.data.id },
        );
        const row = response?.[0];
        futureLetterDone = !!row?.submitted_at;
      }

      return {
        futureLetterSessionOpen: sessionOpen,
        futureLetterDone,
        feedbackFinalDone: !!feedbackRes.data,
        certificateIssued: !!certRes.data,
      };
    },
  });

  const base = data ?? {
    futureLetterSessionOpen: false,
    futureLetterDone: false,
    feedbackFinalDone: false,
    certificateIssued: false,
  };

  const nextAction = computeNextAction(base);

  return {
    ...base,
    loading: isLoading,
    allDone: nextAction === "done",
    nextAction,
  };
};
