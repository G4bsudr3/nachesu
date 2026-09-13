import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectLinkRow = {
  deliverable_id: string;
  user_id: string;
  module_number: number;
  module_title: string;
  url: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  status: string;
};

export type StudentProjects = {
  user_id: string;
  name: string;
  code: string | null;
  latest: ProjectLinkRow;
  history: ProjectLinkRow[];
};

/**
 * projetos reais construídos no lovable, extraídos dos links enviados nas entregas.
 * um card por estudante, com o link mais recente em destaque.
 */
export function useProjectLinks(courseId: string | null) {
  return useQuery({
    queryKey: ["admin-project-links", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async (): Promise<StudentProjects[]> => {
      const { data, error } = await supabase.rpc("admin_project_links", {
        p_course_id: courseId,
      });
      if (error) throw error;
      const rows = (data ?? []) as ProjectLinkRow[];
      if (rows.length === 0) return [];

      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, nickname")
        .in("user_id", userIds);
      const byId = new Map(
        (profiles ?? []).map((p) => [
          p.user_id as string,
          p as { user_id: string; display_name: string | null; nickname: string | null },
        ]),
      );

      const grouped = new Map<string, ProjectLinkRow[]>();
      rows.forEach((r) => {
        const list = grouped.get(r.user_id) ?? [];
        list.push(r);
        grouped.set(r.user_id, list);
      });

      const result: StudentProjects[] = [];
      grouped.forEach((list, userId) => {
        const sorted = [...list].sort((a, b) => {
          const da = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
          const db = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
          if (db !== da) return db - da;
          return b.module_number - a.module_number;
        });
        const p = byId.get(userId);
        result.push({
          user_id: userId,
          name: p?.display_name ?? p?.nickname ?? userId.slice(0, 8),
          code: p?.nickname ?? null,
          latest: sorted[0],
          history: sorted,
        });
      });

      return result.sort((a, b) => {
        const da = a.latest.submitted_at ? new Date(a.latest.submitted_at).getTime() : 0;
        const db = b.latest.submitted_at ? new Date(b.latest.submitted_at).getTime() : 0;
        return db - da;
      });
    },
  });
}
