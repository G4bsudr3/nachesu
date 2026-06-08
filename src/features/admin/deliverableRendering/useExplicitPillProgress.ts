import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DeliverableInbox } from "../usePendingDeliverables";

/**
 * busca quais pílulas o estudante marcou explicitamente como concluídas
 * (clicou no botão "marcar como feita"). serve pra distinguir entre
 * pílulas "respondidas e marcadas" vs "respondidas mas auto-concluídas
 * pelo autosave".
 *
 * admin tem acesso via RLS (has_role admin) à tabela student_pill_progress.
 */
export function useExplicitPillProgress(deliverable: DeliverableInbox | null) {
  const userId = deliverable?.user_id ?? null;
  const moduleId = deliverable?.module_id ?? null;

  const query = useQuery({
    queryKey: ["explicit-pill-progress", userId, moduleId],
    enabled: !!userId && !!moduleId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_pill_progress")
        .select("pill_id, module_pills!inner(module_id)")
        .eq("user_id", userId!)
        .eq("module_pills.module_id", moduleId!);
      if (error) throw error;
      return ((data ?? []) as Array<{ pill_id: string }>).map((r) => r.pill_id);
    },
  });

  const markedIds = useMemo(() => new Set(query.data ?? []), [query.data]);

  return {
    markedIds,
    isLoading: query.isLoading,
  };
}
