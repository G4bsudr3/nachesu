import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CourseId = string;
export type ScopeId = "all" | CourseId;

export interface CourseMetrics {
  id: CourseId;
  title: string;
  slug: string;
  matriculados_ativos: number;
  pendentes_revisao: number;
  em_risco: number;
  em_risco_critico: number; // lost
  nunca_comecaram: number; // matriculados ativos não-teste sem nenhuma atividade
  modulo_proximo: { number: number; title: string; release_at: string } | null;
  funnel: {
    matriculados: number;
    primeiro_login: number;
    modulo_1: number;
    trilha_1: number;
    final: number;
  };
  modules: Array<{
    id: string;
    number: number;
    title: string;
    trail_order: number;
    started: number;
    completed: number;
    pct: number;
    avg_rating: number | null;
  }>;
  engajamento_14d: Array<{ date: string; ativos: number }>;
  risk_dist: {
    em_chama: number; // ativo nos últimos 3d
    em_ritmo: number; // ativo 4-7d
    lento: number; // 7-14d
    em_risco: number; // 14-21d
    dormente: number; // 21+d
  };
}

export interface AdminMetrics {
  generated_at: string;
  pendentes_aprovacao: number;
  courses: CourseMetrics[];
}

const DAY = 86400000;
const isoDaysAgo = (d: number) => new Date(Date.now() - d * DAY).toISOString();

async function fetchMetrics(): Promise<AdminMetrics> {
  const start14d = isoDaysAgo(14);

  const [coursesRes, pendRes, trailsRes, modulesRes] = await Promise.all([
    supabase.from("courses").select("id, title, slug").order("order_index"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("trails").select("id, course_id, order_index"),
    supabase
      .from("modules")
      .select("id, number, title, trail_id, order_index, published, available_from")
      .eq("published", true),
  ]);

  const courses = coursesRes.data ?? [];
  const trails = trailsRes.data ?? [];
  const modules = modulesRes.data ?? [];
  const nowIso = new Date().toISOString();


  const trailById = new Map(trails.map((t: any) => [t.id, t]));
  const modulesByCourse = new Map<string, any[]>();
  for (const m of modules) {
    const trail = trailById.get(m.trail_id) as any;
    if (!trail?.course_id) continue;
    if (!modulesByCourse.has(trail.course_id)) modulesByCourse.set(trail.course_id, []);
    modulesByCourse.get(trail.course_id)!.push({ ...m, trail_order: trail.order_index });
  }

  const result: CourseMetrics[] = [];

  for (const c of courses) {
    const courseModules = (modulesByCourse.get(c.id) ?? []).sort(
      (a, b) => a.trail_order - b.trail_order || a.order_index - b.order_index || a.number - b.number,
    );
    const courseModuleIds = courseModules.map((m) => m.id);

    const [enrollRes, riskRes, delivRes, progRes, ratingRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("user_id, created_at")
        .eq("course_id", c.id)
        .eq("status", "active"),
      supabase
        .from("student_engagement_risk")
        .select("user_id, risk_level, days_inactive, last_activity_at")
        .eq("course_id", c.id),
      supabase
        .from("module_deliverables")
        .select("id, modules!inner(trails!inner(course_id))", {
          count: "exact",
          head: true,
        })
        .eq("status", "enviado")
        .eq("modules.trails.course_id", c.id),
      courseModuleIds.length
        ? supabase
            .from("student_module_progress")
            .select("user_id, module_id, started_at, completed_at")
            .in("module_id", courseModuleIds)
            .gte("started_at", start14d)
        : Promise.resolve({ data: [] as any[] }),
      courseModuleIds.length
        ? supabase
            .from("module_ratings")
            .select("module_id, rating")
            .in("module_id", courseModuleIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const enrollments = (enrollRes.data ?? []) as any[];
    const risks = (riskRes.data ?? []) as any[];
    const progress = (progRes.data ?? []) as any[];
    const ratings = (ratingRes.data ?? []) as any[];

    // module health
    const ratingMap = new Map<string, number[]>();
    ratings.forEach((r) => {
      if (!ratingMap.has(r.module_id)) ratingMap.set(r.module_id, []);
      ratingMap.get(r.module_id)!.push(r.rating);
    });

    const moduleAgg = courseModules.map((m) => {
      const mp = progress.filter((p) => p.module_id === m.id);
      const started = new Set(mp.map((p) => p.user_id)).size;
      const completed = new Set(
        mp.filter((p) => p.completed_at).map((p) => p.user_id),
      ).size;
      const rs = ratingMap.get(m.id) ?? [];
      return {
        id: m.id,
        number: m.number,
        title: m.title,
        trail_order: m.trail_order,
        started,
        completed,
        pct: started > 0 ? Math.round((completed / started) * 100) : 0,
        avg_rating: rs.length
          ? Number((rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1))
          : null,
      };
    });

    // funnel
    const matriculados = enrollments.length;
    const userIds = enrollments.map((e) => e.user_id);
    const firstModule = courseModules[0];
    const trail1Mods = courseModules.filter((m) => m.trail_order === (courseModules[0]?.trail_order ?? 0));
    const allUserProg = progress;
    const usersStartedM1 = firstModule
      ? new Set(allUserProg.filter((p) => p.module_id === firstModule.id).map((p) => p.user_id))
      : new Set<string>();
    const usersCompletedM1 = firstModule
      ? new Set(
          allUserProg
            .filter((p) => p.module_id === firstModule.id && p.completed_at)
            .map((p) => p.user_id),
        )
      : new Set<string>();
    const trail1ModIds = new Set(trail1Mods.map((m) => m.id));
    const completedByUser = new Map<string, Set<string>>();
    allUserProg.forEach((p) => {
      if (!p.completed_at) return;
      if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set());
      completedByUser.get(p.user_id)!.add(p.module_id);
    });
    const usersCompletedTrail1 = new Set<string>();
    userIds.forEach((uid) => {
      const done = completedByUser.get(uid);
      if (!done) return;
      const allDone = [...trail1ModIds].every((id) => done.has(id));
      if (allDone && trail1ModIds.size > 0) usersCompletedTrail1.add(uid);
    });
    const finalMod = courseModules[courseModules.length - 1];
    const usersCompletedFinal = finalMod
      ? new Set(
          allUserProg
            .filter((p) => p.module_id === finalMod.id && p.completed_at)
            .map((p) => p.user_id),
        )
      : new Set<string>();

    // primeiro login: aproximação via qualquer started_at
    const usersWithAnyActivity = new Set(allUserProg.map((p) => p.user_id));

    // engajamento 14d
    const days: Array<{ date: string; ativos: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * DAY);
      const dayStr = day.toISOString().slice(0, 10);
      const setU = new Set(
        allUserProg
          .filter((p) => (p.started_at as string).slice(0, 10) === dayStr)
          .map((p) => p.user_id),
      );
      days.push({ date: dayStr, ativos: setU.size });
    }

    // distribuição de risco
    const riskByUser = new Map<string, any>();
    risks.forEach((r) => riskByUser.set(r.user_id, r));
    const dist = { em_chama: 0, em_ritmo: 0, lento: 0, em_risco: 0, dormente: 0 };
    userIds.forEach((uid) => {
      const r = riskByUser.get(uid);
      const d = r?.days_inactive ?? 999;
      if (d <= 3) dist.em_chama++;
      else if (d <= 7) dist.em_ritmo++;
      else if (d <= 14) dist.lento++;
      else if (d <= 21) dist.em_risco++;
      else dist.dormente++;
    });

    // próximo módulo: o de menor available_from no futuro
    const futureMods = courseModules
      .filter((m) => m.available_from && m.available_from > nowIso)
      .sort((a, b) => (a.available_from as string).localeCompare(b.available_from as string));
    const nextMod = futureMods[0] ?? null;

    result.push({
      id: c.id,
      title: c.title,
      slug: c.slug,
      matriculados_ativos: matriculados,
      pendentes_revisao: delivRes.count ?? 0,
      em_risco: risks.filter((r) => ["medium", "high", "lost"].includes(r.risk_level)).length,
      em_risco_critico: risks.filter((r) => r.risk_level === "lost").length,
      modulo_proximo: nextMod
        ? { number: nextMod.number, title: nextMod.title, release_at: nextMod.available_from as string }
        : null,

      funnel: {
        matriculados,
        primeiro_login: usersWithAnyActivity.size,
        modulo_1: usersStartedM1.size,
        trilha_1: usersCompletedTrail1.size,
        final: usersCompletedFinal.size,
      },
      modules: moduleAgg,
      engajamento_14d: days,
      risk_dist: dist,
    });
  }

  return {
    generated_at: new Date().toISOString(),
    pendentes_aprovacao: pendRes.count ?? 0,
    courses: result,
  };
}

export const useAdminMetrics = () =>
  useQuery({
    queryKey: ["admin-metrics-v1"],
    queryFn: fetchMetrics,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
