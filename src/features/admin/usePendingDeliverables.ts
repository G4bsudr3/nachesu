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

export type InboxFilter = "pendentes" | "ajuste" | "revisados" | "rascunho" | "todos";

const isDraftRow = (d: { submitted_at: string | null; status: string | null }) =>
  d.submitted_at === null && d.status === "rascunho";

/**
 * fila de entregas pra revisão do professor.
 * traz tanto entregas enviadas quanto rascunhos com conteúdo (pra admin ver
 * quem começou e tá no meio antes do estudante apertar enviar).
 */
export function usePendingDeliverables(opts: {
  courseId?: string | null;
  moduleId?: string | null;
  status?: InboxFilter;
}) {
  const { courseId = null, moduleId = null, status = "pendentes" } = opts;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-deliverables-inbox"],
    staleTime: 30_000,
    queryFn: async () => {
      const [submittedRes, draftsRes] = await Promise.all([
        supabase
          .from("module_deliverables")
          .select("*")
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: true })
          .limit(500),
        supabase
          .from("module_deliverables")
          .select("*")
          .eq("status", "rascunho")
          .is("submitted_at", null)
          .order("updated_at", { ascending: false })
          .limit(500),
      ]);
      if (submittedRes.error) throw submittedRes.error;
      if (draftsRes.error) throw draftsRes.error;

      // só rascunhos com algum conteúdo digitado
      const drafts = (draftsRes.data ?? []).filter((r) => {
        const c = r.content as Record<string, unknown> | null;
        if (!c || typeof c !== "object") return false;
        return Object.keys(c).length > 0;
      });

      const list = [...(submittedRes.data ?? []), ...drafts] as DeliverableRow[];
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

      return list.map((r) => {
        const mod = modMap.get(r.module_id) ?? null;
        const trail = mod ? trailMap.get(mod.trail_id) ?? null : null;
        return {
          ...r,
          module: mod,
          trail,
          course_id: trail?.course_id ?? null,
          profile: profMap.get(r.user_id) ?? null,
        };
      }) as DeliverableInbox[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => {
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
  }, [data, status, courseId, moduleId]);

  const pendingCount = useMemo(
    () =>
      (data ?? []).filter(
        (d) => !isDraftRow(d) && d.reviewed_at === null && d.status !== "ajuste",
      ).length,
    [data],
  );

  const ajusteCount = useMemo(
    () => (data ?? []).filter((d) => d.status === "ajuste").length,
    [data],
  );

  const rascunhoCount = useMemo(() => (data ?? []).filter(isDraftRow).length, [data]);

  return {
    data: filtered,
    all: data ?? [],
    pendingCount,
    ajusteCount,
    rascunhoCount,
    isLoading,
    refetch,
  };
}
