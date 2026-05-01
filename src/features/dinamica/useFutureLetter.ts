import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface FutureLetterSession {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  send_at: string;
  status: "draft" | "open" | "closed" | "sent";
  created_at: string;
}

export interface FutureLetterMember {
  id: string;
  group_id: string;
  user_id: string;
  email_snapshot: string | null;
  email_sent_at: string | null;
}

export interface FutureLetterGroup {
  id: string;
  session_id: string;
  letter_text: string;
  created_by: string;
  submitted_at: string;
  sent_at: string | null;
  created_at: string;
  members?: FutureLetterMember[];
}

interface FutureLetterResponseRow extends Omit<FutureLetterGroup, "members" | "sent_at"> {
  member_user_ids: string[] | null;
}

/** hook: pega a sessão aberta atual e o grupo do user (se existir) */
export const useActiveFutureLetter = () => {
  const { user } = useAuth();
  const [session, setSession] = useState<FutureLetterSession | null>(null);
  const [myGroup, setMyGroup] = useState<FutureLetterGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: sessions } = await supabase
      .from("future_letter_sessions")
      .select("*")
      .eq("status", "open")
      .order("send_at", { ascending: true })
      .limit(1);
    const s = sessions?.[0] as FutureLetterSession | undefined;
    setSession(s ?? null);

    if (s) {
      const { data: responses, error: responseError } = await (supabase as any)
        .rpc("get_my_future_letter_response", {
          _session_id: s.id,
        });
      const g = (responses?.[0] ?? null) as FutureLetterResponseRow | null;

      if (responseError || !g) {
        setMyGroup(null);
      } else {
        setMyGroup({
          ...g,
          sent_at: null,
          members: (g.member_user_ids ?? []).map((memberUserId) => ({
            id: memberUserId,
            group_id: g.id,
            user_id: memberUserId,
            email_snapshot: null,
            email_sent_at: null,
          })),
        });
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { session, myGroup, loading, refresh };
};

/** hook: salva a carta no admin */
export const useSealFutureLetter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const seal = async (params: {
    sessionId: string;
    letterText: string;
    memberUserIds: string[];
  }) => {
    if (!user) throw new Error("not logged in");
    if (params.letterText.trim().length < 10) {
      toast.error("a carta tá muito curta");
      return null;
    }
    if (!params.memberUserIds.includes(user.id)) {
      params.memberUserIds = [user.id, ...params.memberUserIds];
    }

    const memberUserIds = Array.from(new Set(params.memberUserIds));

    const { data, error } = await (supabase as any)
      .rpc("save_future_letter_response", {
        _session_id: params.sessionId,
        _letter_text: params.letterText.trim(),
        _member_user_ids: memberUserIds,
      })
      .single();

    if (error) {
      logger.error("[useSealFutureLetter] erro salvando carta", error);
      toast.error("não consegui salvar a carta");
      return null;
    }

    toast.success("carta salva no admin.");
    // invalida status pós-evento pra atualizar chips e próximo passo na hora
    queryClient.invalidateQueries({ queryKey: ["post-event-status"] });
    return data ?? null;
  };

  return { seal };
};
