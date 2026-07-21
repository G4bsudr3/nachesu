import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description?: string | null;
  professor_name: string;
  professor_bio_md: string | null;
  professor_avatar_url: string | null;
  hero_image_url: string | null;
  theme: any;
  order_index: number;
  published: boolean;
};

export type Enrollment = {
  id: string;
  course_id: string;
  user_id: string;
  status: "active" | "paused";
  enrolled_at: string;
  course?: Course;
};

/**
 * eletivas em que o usuário logado está matriculado.
 * RLS já filtra: só matriculadas e publicadas vêm.
 */
export function useMyEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, course_id, user_id, status, enrolled_at, course:courses(*)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("enrolled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Enrollment[];
    },
  });
}

/**
 * lista todas eletivas (pra admin).
 */
export function useAllCourses() {
  return useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
}

export function useCourseBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["course", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Course | null;
    },
  });
}
