import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DeliverableRow = Database["public"]["Tables"]["module_deliverables"]["Row"];
type ModuleLite = { id: string; number: number; title: string; trail_id: string };
type TrailLite = { id: string; course_id: string | null; title: string };
type ProfileLite = { user_id: string; display_name: string | null; nickname: string | null };

export type DeliverableInbox = DeliverableRow & {
  module: ModuleLite | null;
  trail: TrailLite | null;
  course_id: string | null;
  profile: ProfileLite | null;
};

export type InboxFilter = "pendentes" | "revisados" | "todos";

/**
 * fila de entregas pra revisão do professor.
 * filtros aplicados em memória pra simplicidade (volume baixo).
 */
export function usePendingDeliverables(opts: {
  courseId?: string | null;
  moduleId?: string | null;
  status?: InboxFilter;
}) {
  const { courseId = null, moduleId = null, status = "pendentes" } = opts;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-deliverables-inbox"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("module_deliverables")
        .select("*")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      const list = (rows ?? []) as DeliverableRow[];
      if (list.length === 0) return [] as DeliverableInbox[];

      const moduleIds = Array.from(new Set(list.map((r) => r.module_id)));
      const userIds = Array.from(new Set(list.map((r) => r.user_id)));

      const [{ data: mods }, { data: profs }] = await Promise.all([
        supabase.from("modules").select("id, number, title, trail_id").in("id", moduleIds),
        supabase.from("profiles").select("user_id, display_name, nickname").in("user_id", userIds),
      ]);

      const trailIds = Array.from(
        new Set((mods ?? []).map((m) => m.trail_id).filter(Boolean) as string[]),
      );
      const { data: trails } = trailIds.length
        ? await supabase.from("trails").select("id, course_id, title").in("id", trailIds)
        : { data: [] as TrailLite[] };

      const trailMap = new Map<string, TrailLite>(
        (trails ?? []).map((t) => [t.id, t as TrailLite]),
      );
      const modMap = new Map<string, ModuleLite>((mods ?? []).map((m) => [m.id, m as ModuleLite]));
      const profMap = new Map<string, ProfileLite>(
        (profs ?? []).map((p) => [p.user_id, p as ProfileLite]),
      );

      return list.map((r) => ({
        ...r,
        module: modMap.get(r.module_id) ?? null,
        profile: profMap.get(r.user_id) ?? null,
      })) as DeliverableInbox[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => {
      if (status === "pendentes" && d.reviewed_at !== null) return false;
      if (status === "revisados" && d.reviewed_at === null) return false;
      if (courseId && d.module?.course_id !== courseId) return false;
      if (moduleId && d.module_id !== moduleId) return false;
      return true;
    });
  }, [data, status, courseId, moduleId]);

  const pendingCount = useMemo(
    () => (data ?? []).filter((d) => d.reviewed_at === null).length,
    [data],
  );

  return { data: filtered, all: data ?? [], pendingCount, isLoading, refetch };
}
