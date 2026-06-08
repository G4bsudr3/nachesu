import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";
import {
  computeCompleteness,
  type Completeness,
} from "./deliverableRendering/completeness";
import type {
  DeliverableContent,
  PillForResolve,
  PillKind,
} from "./deliverableRendering/types";

type DeliverableRow = Database["public"]["Tables"]["module_deliverables"]["Row"];
type ModuleLite = { id: string; number: number; title: string; trail_id: string };
type TrailLite = { id: string; course_id: string | null; title: string };
type ProfileLite = { user_id: string; display_name: string | null; nickname: string | null; is_test: boolean | null };

export type DeliverableInbox = DeliverableRow & {
  module: ModuleLite | null;
  trail: TrailLite | null;
  course_id: string | null;
  profile: ProfileLite | null;
  /** quanto do conteúdo está preenchido (mesmo em rascunho) */
  completeness: Completeness;
};

export type InboxFilter =
  | "pendentes"
  | "ajuste"
  | "revisados"
  | "rascunho"
  | "rascunho-completo"
  | "todos";

const isDraftRow = (d: { submitted_at: string | null; status: string | null }) =>
  d.submitted_at === null && d.status === "rascunho";

type RpcRow = {
  id: string;
  user_id: string;
  module_id: string;
  kind: DeliverableRow["kind"];
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

type PillRpcRow = {
  id: string;
  module_id: string;
  order_index: number;
  kind: string;
  title: string;
  body_md: string | null;
  required: boolean | null;
  interaction_schema: Record<string, unknown> | null;
};

/**
 * fila de entregas pra revisão do educador.
 * usa RPC security-definer admin_inbox_deliverables() que devolve tudo
 * já joinado (módulo, trilha, perfil) — não dependemos da RLS de aluno
 * pra ler dados nesse caminho.
 *
 * em paralelo, busca as pílulas (admin_module_pills) dos módulos visíveis e
 * calcula a "completude" de cada deliverable. isso permite destacar rascunhos
 * completos (estudante já preencheu tudo, só falta enviar).
 */
export function usePendingDeliverables(opts: {
  courseId?: string | null;
  moduleId?: string | null;
  status?: InboxFilter;
  includeTest?: boolean;
}) {
  const { courseId = null, moduleId = null, status = "todos", includeTest = false } = opts;

  const { data: rawRows, isLoading: rowsLoading, refetch } = useQuery({
    queryKey: ["admin-deliverables-inbox"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("admin_inbox_deliverables");
      if (error) {
        logger.error("admin_inbox_deliverables falhou", error);
        throw error;
      }
      return (rows ?? []) as RpcRow[];
    },
  });

  const moduleIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of rawRows ?? []) if (r.module_id) set.add(r.module_id);
    return Array.from(set).sort();
  }, [rawRows]);

  const { data: pillsByModule } = useQuery({
    queryKey: ["admin-deliverables-inbox-pills", moduleIds.join(",")],
    enabled: moduleIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.all(
        moduleIds.map(async (mid) => {
          const { data, error } = await supabase.rpc("admin_module_pills", {
            p_module_id: mid,
          });
          if (error) {
            logger.error("admin_module_pills falhou", { moduleId: mid, error });
            return [mid, [] as PillForResolve[]] as const;
          }
          const pills = ((data ?? []) as PillRpcRow[]).map<PillForResolve>((p) => ({
            id: p.id,
            module_id: p.module_id,
            order_index: p.order_index,
            kind: p.kind as PillKind,
            title: p.title,
            body_md: p.body_md,
            required: !!p.required,
            interaction_schema: p.interaction_schema,
          }));
          return [mid, pills] as const;
        }),
      );
      const map: Record<string, PillForResolve[]> = {};
      for (const [mid, pills] of results) map[mid] = pills;
      return map;
    },
  });

  const data = useMemo<DeliverableInbox[] | undefined>(() => {
    if (!rawRows) return undefined;
    return rawRows.map<DeliverableInbox>((r) => {
      const pills = pillsByModule?.[r.module_id] ?? [];
      const completeness = computeCompleteness(
        pills,
        r.content as DeliverableContent | null,
      );
      return {
        id: r.id,
        user_id: r.user_id,
        module_id: r.module_id,
        kind: r.kind,
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
        completeness,
      };
    });
  }, [rawRows, pillsByModule]);

  const isLoading = rowsLoading;

  const visibleByTest = useMemo(
    () => (data ?? []).filter((d) => includeTest || !d.profile?.is_test),
    [data, includeTest],
  );

  const statusRank = (d: DeliverableInbox) => {
    if (!isDraftRow(d) && d.reviewed_at === null && d.status !== "ajuste") return 0; // pendente
    if (d.status === "ajuste") return 1;
    if (isDraftRow(d) && d.completeness.isComplete) return 2; // rascunho completo (próximo a virar entrega)
    if (isDraftRow(d)) return 3;
    return 4; // revisado
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
      if (status === "rascunho-completo" && !(draft && d.completeness.isComplete)) return false;
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
  const rascunhoCompleteCount = useMemo(
    () => visibleByTest.filter((d) => isDraftRow(d) && d.completeness.isComplete).length,
    [visibleByTest],
  );

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
    rascunhoCompleteCount,
    revisadosCount,
    totalCount,
    testCount,
    isLoading,
    refetch,
  };
}
