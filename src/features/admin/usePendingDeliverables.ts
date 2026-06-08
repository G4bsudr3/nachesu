import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type DeliverableRow = Database["public"]["Tables"]["module_deliverables"]["Row"];
type ModuleLite = { id: string; number: number; title: string; trail_id: string };
type TrailLite = { id: string; course_id: string | null; title: string };
type ProfileLite = { user_id: string; display_name: string | null; nickname: string | null; is_test: boolean | null };

export type DeliverableInbox = DeliverableRow & {
  module: ModuleLite | null;
  trail: TrailLite | null;
  course_id: string | null;
  profile: ProfileLite | null;
};

export type InboxFilter = "pendentes" | "ajuste" | "revisados" | "rascunho" | "todos";

const isDraftRow = (d: { submitted_at: string | null; status: string | null }) =>
  d.submitted_at === null && d.status === "rascunho";

type RpcRow = {
  id: string;
  user_id: string;
  module_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  feedback: string | null;
  score: number | null;
  content: unknown;
  created_at: string;
  updated_at: string;
  module_number: number | null;
  module_title: string | null;
  module_trail_id: string | null;
  trail_title: string | null;
  course_id: string | null;
  profile_display_name: string | null;
  profile_nickname: string | null;
  profile_is_test: boolean | null;
};

/**
 * fila de entregas pra revisão do educador.
 * usa RPC security-definer admin_inbox_deliverables() que devolve tudo
 * já joinado (módulo, trilha, perfil) — não dependemos da RLS de aluno
 * pra ler dados nesse caminho.
 */
export function usePendingDeliverables(opts: {
  courseId?: string | null;
  moduleId?: string | null;
  status?: InboxFilter;
  includeTest?: boolean;
}) {
  const { courseId = null, moduleId = null, status = "todos", includeTest = false } = opts;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-deliverables-inbox"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("admin_inbox_deliverables");
      if (error) {
        logger.error("admin_inbox_deliverables falhou", error);
        throw error;
      }
      const list = (rows ?? []) as RpcRow[];
      return list.map<DeliverableInbox>((r) => ({
        id: r.id,
        user_id: r.user_id,
        module_id: r.module_id,
        status: r.status as DeliverableRow["status"],
        submitted_at: r.submitted_at,
        reviewed_at: r.reviewed_at,
        reviewer_id: r.reviewer_id,
        feedback: r.feedback,
        score: r.score,
        content: r.content as DeliverableRow["content"],
        created_at: r.created_at,
        updated_at: r.updated_at,
        module: r.module_number !== null && r.module_title !== null && r.module_trail_id
          ? {
              id: r.module_id,
              number: r.module_number,
              title: r.module_title,
              trail_id: r.module_trail_id,
            }
          : null,
        trail: r.module_trail_id && r.trail_title !== null
          ? {
              id: r.module_trail_id,
              course_id: r.course_id,
              title: r.trail_title,
            }
          : null,
        course_id: r.course_id,
        profile: {
          user_id: r.user_id,
          display_name: r.profile_display_name,
          nickname: r.profile_nickname,
          is_test: r.profile_is_test,
        },
      }));
    },
  });

  const visibleByTest = useMemo(
    () => (data ?? []).filter((d) => includeTest || !d.profile?.is_test),
    [data, includeTest],
  );

  const statusRank = (d: DeliverableInbox) => {
    if (!isDraftRow(d) && d.reviewed_at === null && d.status !== "ajuste") return 0; // pendente
    if (d.status === "ajuste") return 1;
    if (isDraftRow(d)) return 2;
    return 3; // revisado
  };

  const filtered = useMemo(() => {
    const rows = visibleByTest.filter((d) => {
      const draft = isDraftRow(d);
      if (status === "pendentes" && (draft || d.reviewed_at !== null || d.status === "ajuste"))
        return false;
      if (status === "revisados" && (draft || d.reviewed_at === null || d.status === "ajuste"))
        return false;
      if (status === "ajuste" && d.status !== "ajuste") return false;
      if (status === "rascunho" && !draft) return false;
      if (courseId && d.course_id !== courseId) return false;
      if (moduleId && d.module_id !== moduleId) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      const r = statusRank(a) - statusRank(b);
      if (r !== 0) return r;
      const at = a.submitted_at ?? a.updated_at ?? "";
      const bt = b.submitted_at ?? b.updated_at ?? "";
      return bt.localeCompare(at);
    });
  }, [visibleByTest, status, courseId, moduleId]);

  const pendingCount = useMemo(
    () =>
      visibleByTest.filter(
        (d) => !isDraftRow(d) && d.reviewed_at === null && d.status !== "ajuste",
      ).length,
    [visibleByTest],
  );

  const ajusteCount = useMemo(
    () => visibleByTest.filter((d) => d.status === "ajuste").length,
    [visibleByTest],
  );

  const rascunhoCount = useMemo(() => visibleByTest.filter(isDraftRow).length, [visibleByTest]);

  const revisadosCount = useMemo(
    () => visibleByTest.filter((d) => d.reviewed_at !== null && d.status !== "ajuste").length,
    [visibleByTest],
  );

  const totalCount = visibleByTest.length;
  const testCount = useMemo(
    () => (data ?? []).filter((d) => d.profile?.is_test).length,
    [data],
  );

  return {
    data: filtered,
    all: visibleByTest,
    pendingCount,
    ajusteCount,
    rascunhoCount,
    revisadosCount,
    totalCount,
    testCount,
    isLoading,
    refetch,
  };
}
