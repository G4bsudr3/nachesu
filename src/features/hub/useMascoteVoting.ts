import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type VotingStatus = "fechada" | "aberta" | "encerrada";

interface VoteRow {
  user_id: string;
  candidate_index: number;
}

interface Args {
  insightId: string | null;
  status: VotingStatus;
  candidatosCount: number;
  isAdmin: boolean;
}

export const useMascoteVoting = ({ insightId, status, candidatosCount, isAdmin }: Args) => {
  const { user } = useAuth();
  const [myVote, setMyVote] = useState<number | null>(null);
  const [totalVotos, setTotalVotos] = useState(0);
  const [tally, setTally] = useState<number[]>(() => new Array(candidatosCount).fill(0));
  const [totalElegiveis, setTotalElegiveis] = useState(0);
  const [busy, setBusy] = useState(false);

  // total de pessoas elegíveis pra votar (profiles ativos)
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { count } = await supabase
        .from("profiles_public")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "active");
      if (!cancel && typeof count === "number") setTotalElegiveis(count);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // carrega meu voto + (se admin) votos totais
  const refetchVotes = useCallback(async () => {
    if (!insightId) return;

    if (user) {
      const { data: mine } = await supabase
        .from("mascote_votes")
        .select("candidate_index")
        .eq("insight_id", insightId)
        .eq("user_id", user.id)
        .maybeSingle();
      setMyVote(mine ? (mine as any).candidate_index : null);
    }

    if (isAdmin) {
      const { data: all } = await supabase
        .from("mascote_votes")
        .select("user_id, candidate_index")
        .eq("insight_id", insightId);
      const rows = (all ?? []) as VoteRow[];
      setTotalVotos(rows.length);
      const t = new Array(candidatosCount).fill(0);
      for (const r of rows) {
        if (r.candidate_index >= 0 && r.candidate_index < t.length) t[r.candidate_index]++;
      }
      setTally(t);
    } else {
      // participante usa head count pra saber só o total (count exact é permitido pelo RLS? não — só vê o próprio)
      // pra mostrar "X de Y votaram" sem revelar em quem, usamos a edge de count via RPC seria ideal,
      // mas pra simplificar: participante só vê o próprio voto e "tu já votou".
      setTotalVotos(0);
    }
  }, [insightId, user, isAdmin, candidatosCount]);

  useEffect(() => {
    refetchVotes();
  }, [refetchVotes]);

  // realtime: refetch quando há novo voto
  useEffect(() => {
    if (!insightId) return;
    const channel = supabase
      .channel(`mascote-votes-${insightId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mascote_votes", filter: `insight_id=eq.${insightId}` },
        () => {
          refetchVotes();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [insightId, refetchVotes]);

  const open = useCallback(async () => {
    setBusy(true);
    const res = await supabase.functions.invoke("mascote-voting", { body: { action: "open" } });
    setBusy(false);
    return res;
  }, []);

  const close = useCallback(async () => {
    setBusy(true);
    const res = await supabase.functions.invoke("mascote-voting", { body: { action: "close" } });
    setBusy(false);
    return res;
  }, []);

  const vote = useCallback(async (index: number) => {
    setBusy(true);
    const res = await supabase.functions.invoke("mascote-voting", {
      body: { action: "vote", index },
    });
    setBusy(false);
    if (!res.error) setMyVote(index);
    return res;
  }, []);

  const participation = useMemo(() => {
    if (!totalElegiveis) return 0;
    return Math.min(100, Math.round((totalVotos / totalElegiveis) * 100));
  }, [totalVotos, totalElegiveis]);

  return {
    status,
    myVote,
    totalVotos,
    totalElegiveis,
    tally,
    participation,
    busy,
    open,
    close,
    vote,
    refetch: refetchVotes,
  };
};
