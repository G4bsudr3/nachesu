import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  released: number;
  completed: number;
  percent: number;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  currentModuleNumber: number | null;
}

/**
 * agrega o progresso por curso pra cada matrícula ativa.
 * combina student_module_progress + module_releases + module_deliverables.
 */
export function useStudentProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-progress", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CourseProgress[]> => {
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", userId!)
        .eq("status", "active");
      const courseIds = (enrolls ?? []).map((e) => e.course_id);
      if (courseIds.length === 0) return [];

      const [{ data: courses }, { data: trails }, { data: releases }, { data: progress }, { data: deliverables }] =
        await Promise.all([
          supabase.from("courses").select("id, title, slug").in("id", courseIds),
          supabase.from("trails").select("id, course_id").in("course_id", courseIds),
          supabase.from("module_releases").select("module_id, released_at"),
          supabase
            .from("student_module_progress")
            .select("module_id, started_at, completed_at")
            .eq("user_id", userId!),
          supabase
            .from("module_deliverables")
            .select("module_id, updated_at")
            .eq("user_id", userId!),
        ]);

      const trailToCourse = new Map<string, string>(
        (trails ?? []).map((t) => [t.id, t.course_id as string]),
      );

      const { data: modules } = await supabase
        .from("modules")
        .select("id, number, trail_id");

      const moduleToCourse = new Map<string, { courseId: string; number: number }>();
      (modules ?? []).forEach((m) => {
        const c = trailToCourse.get(m.trail_id);
        if (c) moduleToCourse.set(m.id, { courseId: c, number: m.number });
      });

      const releasedByCourse = new Map<string, Set<string>>();
      (releases ?? []).forEach((r) => {
        const ctx = moduleToCourse.get(r.module_id);
        if (!ctx) return;
        if (!releasedByCourse.has(ctx.courseId)) releasedByCourse.set(ctx.courseId, new Set());
        releasedByCourse.get(ctx.courseId)!.add(r.module_id);
      });

      const completedByCourse = new Map<string, Set<string>>();
      (progress ?? []).forEach((p) => {
        if (!p.completed_at) return;
        const ctx = moduleToCourse.get(p.module_id);
        if (!ctx) return;
        if (!completedByCourse.has(ctx.courseId)) completedByCourse.set(ctx.courseId, new Set());
        completedByCourse.get(ctx.courseId)!.add(p.module_id);
      });

      // última atividade: progresso ou deliverable
      const lastActivityByCourse = new Map<string, string>();
      const trackActivity = (moduleId: string, ts: string) => {
        const ctx = moduleToCourse.get(moduleId);
        if (!ctx) return;
        const prev = lastActivityByCourse.get(ctx.courseId);
        if (!prev || ts > prev) lastActivityByCourse.set(ctx.courseId, ts);
      };
      (progress ?? []).forEach((p) => trackActivity(p.module_id, p.completed_at ?? p.started_at));
      (deliverables ?? []).forEach((d) => trackActivity(d.module_id, d.updated_at));

      // módulo atual: maior `number` liberado mas não concluído
      const currentByCourse = new Map<string, number>();
      releasedByCourse.forEach((modIds, courseId) => {
        const completed = completedByCourse.get(courseId) ?? new Set();
        let highest: number | null = null;
        modIds.forEach((modId) => {
          if (completed.has(modId)) return;
          const ctx = moduleToCourse.get(modId);
          if (!ctx) return;
          if (highest === null || ctx.number < highest) highest = ctx.number;
        });
        if (highest !== null) currentByCourse.set(courseId, highest);
      });

      const now = Date.now();
      return (courses ?? []).map((c) => {
        const released = releasedByCourse.get(c.id)?.size ?? 0;
        const completed = completedByCourse.get(c.id)?.size ?? 0;
        const last = lastActivityByCourse.get(c.id) ?? null;
        const days = last
          ? Math.floor((now - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          courseId: c.id,
          courseTitle: c.title,
          courseSlug: c.slug,
          released,
          completed,
          percent: released > 0 ? Math.round((completed / released) * 100) : 0,
          lastActivityAt: last,
          daysSinceActivity: days,
          currentModuleNumber: currentByCourse.get(c.id) ?? null,
        };
      });
    },
  });
}
