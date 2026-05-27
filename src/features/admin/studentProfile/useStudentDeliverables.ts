import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DeliverableInbox } from "../usePendingDeliverables";
import type { Database } from "@/integrations/supabase/types";

type DeliverableRow = Database["public"]["Tables"]["module_deliverables"]["Row"];

export function useStudentDeliverables(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-deliverables", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DeliverableInbox[]> => {
      const { data: rows, error } = await supabase
        .from("module_deliverables")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const list = (rows ?? []) as DeliverableRow[];
      if (list.length === 0) return [];

      const moduleIds = Array.from(new Set(list.map((r) => r.module_id)));
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, nickname")
        .eq("user_id", userId!)
        .maybeSingle();
      const { data: mods } = await supabase
        .from("modules")
        .select("id, number, title, trail_id")
        .in("id", moduleIds);
      const trailIds = Array.from(
        new Set((mods ?? []).map((m) => m.trail_id).filter(Boolean) as string[]),
      );
      const { data: trails } = trailIds.length
        ? await supabase.from("trails").select("id, course_id, title").in("id", trailIds)
        : { data: [] as { id: string; course_id: string | null; title: string }[] };

      const trailMap = new Map((trails ?? []).map((t) => [t.id, t]));
      const modMap = new Map((mods ?? []).map((m) => [m.id, m]));

      return list.map((r) => {
        const mod = modMap.get(r.module_id) ?? null;
        const trail = mod ? trailMap.get(mod.trail_id) ?? null : null;
        return {
          ...r,
          module: mod,
          trail,
          course_id: trail?.course_id ?? null,
          profile: profile ?? null,
        } as DeliverableInbox;
      });
    },
  });
}
