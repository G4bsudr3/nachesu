import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type VotingStatus = "draft" | "open" | "closed";

export interface VotingSession {
  id: string;
  title: string;
  description: string | null;
  status: VotingStatus;
  opens_at: string | null;
  closes_at: string | null;
}

export interface MyVote {
  project_id: string;
  created_at: string;
}

/** Pega a sessão "ativa" (open primeiro, senão closed mais recente). Aluno-friendly. */
export const useActiveVotingSession = () => {
  const [session, setSession] = useState<VotingSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    // tenta open primeiro
    const open = await supabase
      .from("project_voting_sessions")
      .select("id,title,description,status,opens_at,closes_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open.data) {
      setSession(open.data as VotingSession);
      setLoading(false);
      return;
    }
    const closed = await supabase
      .from("project_voting_sessions")
      .select("id,title,description,status,opens_at,closes_at")
      .eq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession((closed.data as VotingSession) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { session, loading, refresh };
};

export const useMyVote = (sessionId: string | null) => {
  const { user } = useAuth();
  const [vote, setVote] = useState<MyVote | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId || !user) {
      setVote(null);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("project_votes")
      .select("project_id, created_at")
      .eq("session_id", sessionId)
      .eq("voter_user_id", user.id)
      .maybeSingle();
    setVote((data as MyVote) ?? null);
    setLoading(false);
  }, [sessionId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const castVote = useCallback(
    async (projectId: string) => {
      if (!sessionId || !user) return { ok: false, error: "não autenticado" };
      // upsert: 1 voto por (session, user)
      const { error } = await supabase
        .from("project_votes")
        .upsert(
          { session_id: sessionId, voter_user_id: user.id, project_id: projectId },
          { onConflict: "session_id,voter_user_id" },
        );
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [sessionId, user, refresh],
  );

  const removeVote = useCallback(async () => {
    if (!sessionId || !user) return { ok: false };
    const { error } = await supabase
      .from("project_votes")
      .delete()
      .eq("session_id", sessionId)
      .eq("voter_user_id", user.id);
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [sessionId, user, refresh]);

  return { vote, loading, castVote, removeVote, refresh };
};

export interface TopTenRow {
  rank: number;
  project_id: string;
  title: string;
  description: string;
  link: string;
  cover_url: string | null;
  tags: string[];
  author_user_id: string;
  author_display_name: string | null;
  author_nickname: string | null;
  vote_count: number;
}

export const useTopTen = (sessionId: string | null) => {
  const [rows, setRows] = useState<TopTenRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_project_voting_top_ten", {
      _session_id: sessionId,
    });
    if (!error && data) {
      setRows(data as unknown as TopTenRow[]);
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, refresh };
};

export interface MyVoteResult {
  project_id: string;
  title: string;
  vote_count: number;
  rank: number;
  in_top_ten: boolean;
}

export const useMyVoteResult = (sessionId: string | null, enabled: boolean) => {
  const [result, setResult] = useState<MyVoteResult | null>(null);

  useEffect(() => {
    if (!sessionId || !enabled) {
      setResult(null);
      return;
    }
    supabase
      .rpc("get_my_project_vote_result", { _session_id: sessionId })
      .then(({ data }) => {
        const row = (data as unknown as MyVoteResult[] | null)?.[0] ?? null;
        setResult(row);
      });
  }, [sessionId, enabled]);

  return result;
};
