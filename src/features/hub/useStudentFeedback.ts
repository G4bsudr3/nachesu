import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type DeliverableRow = Database["public"]["Tables"]["module_deliverables"]["Row"];

export type StudentFeedbackRow = DeliverableRow & {
  reviewer_name?: string | null;
};

const seenKey = (deliverableId: string, reviewedAt: string) =>
  `feedback-seen:${deliverableId}:${reviewedAt}`;

/** marca como visto (localStorage) */
export const markFeedbackSeen = (deliverableId: string, reviewedAt: string | null) => {
  if (!reviewedAt || typeof window === "undefined") return;
  try {
    localStorage.setItem(seenKey(deliverableId, reviewedAt), "1");
  } catch {
    /* ignore */
  }
};

const isSeen = (deliverableId: string, reviewedAt: string | null) => {
  if (!reviewedAt || typeof window === "undefined") return true;
  try {
    return localStorage.getItem(seenKey(deliverableId, reviewedAt)) === "1";
  } catch {
    return true;
  }
};

/**
 * busca todos os feedbacks revisados do aluno + um sinal "tem novo?".
 * usado por FeedbackBadge e pelo card no topo de Modulo.tsx.
 */
export function useStudentFeedback(opts?: { moduleId?: string | null }) {
  const { user } = useAuth();
  const { moduleId = null } = opts ?? {};
  const [tick, setTick] = useState(0);

  // escuta storage entre abas pra atualizar badge
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("feedback-seen:")) setTick((t) => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["student-feedback", user?.id, moduleId],
    enabled: !!user,
    queryFn: async () => {
      const q = supabase
        .from("module_deliverables")
        .select("*")
        .eq("user_id", user!.id)
        .not("reviewed_at", "is", null);
      const { data: rows, error } = moduleId ? await q.eq("module_id", moduleId) : await q;
      if (error) throw error;
      const list = (rows ?? []) as DeliverableRow[];
      const reviewerIds = Array.from(
        new Set(list.map((r) => r.reviewer_id).filter(Boolean) as string[]),
      );
      if (reviewerIds.length === 0) return list as StudentFeedbackRow[];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, nickname")
        .in("user_id", reviewerIds);
      const profMap = new Map<string, { display_name: string | null; nickname: string | null }>(
        (profs ?? []).map((p) => [p.user_id, p]),
      );
      return list.map((r) => ({
        ...r,
        reviewer_name: r.reviewer_id
          ? profMap.get(r.reviewer_id)?.display_name ??
            profMap.get(r.reviewer_id)?.nickname ??
            null
          : null,
      })) as StudentFeedbackRow[];
    },
  });

  const unseen = (data ?? []).filter((d) => !isSeen(d.id, d.reviewed_at));
  // depende de tick pra re-render quando alguém marca como visto
  void tick;

  return {
    feedbacks: data ?? [],
    unseen,
    hasUnseen: unseen.length > 0,
    isLoading,
    refetch,
  };
}
