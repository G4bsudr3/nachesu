import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EnrollmentRow = Database["public"]["Tables"]["enrollments"]["Row"];
type CourseLite = { id: string; title: string; slug: string; professor_name: string };

export interface StudentProfile {
  profile: ProfileRow | null;
  email: string | null;
  roles: string[];
  enrollments: Array<EnrollmentRow & { course: CourseLite | null }>;
}

/**
 * carrega o cabeçalho do perfil 360°: profile + roles + matrículas.
 * email vem via RPC admin_list_users (já existente) pra evitar criar nova edge.
 */
export function useStudentProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StudentProfile> => {
      const [{ data: profile }, { data: roles }, { data: enrolls }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", userId!)
          .order("enrolled_at", { ascending: false }),
      ]);

      const courseIds = (enrolls ?? []).map((e) => e.course_id);
      const { data: courses } = courseIds.length
        ? await supabase
            .from("courses")
            .select("id, title, slug, professor_name")
            .in("id", courseIds)
        : { data: [] as CourseLite[] };

      const courseMap = new Map<string, CourseLite>(
        (courses ?? []).map((c) => [c.id, c as CourseLite]),
      );

      // email: tenta via RPC admin_list_users (uma chamada apenas)
      let email: string | null = null;
      try {
        const { data: users } = await (
          supabase.rpc as unknown as (
            name: "admin_list_users",
          ) => Promise<{ data: Array<{ user_id: string; email: string }> | null }>
        )("admin_list_users");
        email = users?.find((u) => u.user_id === userId)?.email ?? null;
      } catch {
        /* ignore */
      }

      return {
        profile: (profile as ProfileRow) ?? null,
        email,
        roles: (roles ?? []).map((r) => r.role as string),
        enrollments: (enrolls ?? []).map((e) => ({
          ...(e as EnrollmentRow),
          course: courseMap.get(e.course_id) ?? null,
        })),
      };
    },
  });
}
