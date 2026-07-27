import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EletivaTrail = {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  color: string | null;
  course_id: string | null;
};

export type EletivaModule = {
  number: number;
  trail_id: string;
  title: string;
  objective: string | null;
  total_minutes: number | null;
  available_from: string | null;
  published: boolean;
};

export type ModuleProgress = {
  module_id: string;
  started_at: string | null;
  completed_at: string | null;
};

export type PillProgress = {
  pill_id: string;
  completed_at: string;
};

export type EletivaSnapshot = {
  trails: EletivaTrail[];
  modules: (EletivaModule & { id: string })[];
  progressByModuleId: Record<string, ModuleProgress>;
  completedPillIds: Set<string>;
  unlockedModuleIds: Set<string>;
  sequentialUnlock: boolean;
  totalPublished: number;
  totalCompleted: number;
  currentModule: (EletivaModule & { id: string }) | null;
  nextModule: (EletivaModule & { id: string }) | null;
};

const isAvailable = (m: { published: boolean; available_from: string | null }) => {
  if (!m.published) return false;
  if (!m.available_from) return true;
  return new Date(m.available_from).getTime() <= Date.now();
};

const ADMIN_BYPASS_EMAILS = new Set([
  "hey@frattz.com",
  "duduobregon@gmail.com",
]);

/**
 * snapshot de progresso de uma eletiva.
 * passa courseId pra escopar por matrícula. sem courseId, agrega tudo
 * que o aluno enxerga (legado — usado só por callers antigos).
 */
export const useEletivaProgress = (courseId?: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["eletiva-progress", user?.id ?? "anon", courseId ?? "all"],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<EletivaSnapshot> => {
      const trailsQuery = supabase
        .from("trails")
        .select("id, order_index, title, description, color, course_id")
        .order("order_index");
      if (courseId) trailsQuery.eq("course_id", courseId);

      const [
        { data: trails },
        progressRes,
        pillProgressRes,
        sequentialRes,
        overridesRes,
      ] = await Promise.all([

        trailsQuery,
        user
          ? supabase
              .from("student_module_progress")
              .select("module_id, started_at, completed_at")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as ModuleProgress[] }),
        user
          ? supabase
              .from("student_pill_progress")
              .select("pill_id, completed_at")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as PillProgress[] }),
        supabase
          .from("hub_settings")
          .select("value")
          .eq("key", "eletiva_sequential_unlock")
          .maybeSingle(),
        user
          ? supabase
              .from("user_module_overrides")
              .select("scope, module_id, trail_id, course_id, visible")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const trailIds = (trails ?? []).map((t: any) => t.id);
      const modulesQuery = supabase
        .from("modules")
        .select("id, number, trail_id, title, objective, total_minutes, available_from, published")
        .order("number");
      if (trailIds.length > 0) modulesQuery.in("trail_id", trailIds);
      const { data: modules } = trailIds.length > 0
        ? await modulesQuery
        : { data: [] as any[] };

      const progressByModuleId: Record<string, ModuleProgress> = {};
      for (const p of (progressRes.data ?? []) as ModuleProgress[]) {
        progressByModuleId[p.module_id] = p;
      }

      const completedPillIds = new Set<string>(
        ((pillProgressRes.data ?? []) as PillProgress[]).map((p) => p.pill_id),
      );

      const allModules = (modules ?? []) as (EletivaModule & { id: string })[];

      // overrides: módulo > trilha > eletiva. true força ver, false força esconder, ausente = padrão.
      const overrides = (overridesRes.data ?? []) as Array<{
        scope: "module" | "trail" | "course";
        module_id: string | null;
        trail_id: string | null;
        course_id: string | null;
        visible: boolean;
      }>;
      const trailById = new Map((trails ?? []).map((t: any) => [t.id, t]));
      const resolveOverride = (m: { id: string; trail_id: string }): boolean | null => {
        const moduleOv = overrides.find((o) => o.scope === "module" && o.module_id === m.id);
        if (moduleOv) return moduleOv.visible;
        const trailOv = overrides.find((o) => o.scope === "trail" && o.trail_id === m.trail_id);
        if (trailOv) return trailOv.visible;
        const trail: any = trailById.get(m.trail_id);
        if (trail?.course_id) {
          const courseOv = overrides.find((o) => o.scope === "course" && o.course_id === trail.course_id);
          if (courseOv) return courseOv.visible;
        }
        return null;
      };

      // módulo disponível pro aluno = published + dentro da janela, com override sobrepondo
      const isReleased = (m: { id: string; trail_id: string; published: boolean; available_from: string | null }) => {
        const ov = resolveOverride(m);
        if (ov === true) return true;
        if (ov === false) return false;
        return isAvailable(m);
      };
      const publishedModules = allModules.filter(isReleased);
      // conta qualquer módulo desta eletiva já concluído pelo estudante,
      // mesmo que depois tenha saído da janela de release (evita "5/20"
      // fantasma quando a coordenação despublica módulos após conclusão).
      const totalCompleted = allModules.filter(
        (m) => progressByModuleId[m.id]?.completed_at,
      ).length;
      // a plataforma comunica o total de módulos da eletiva (20),
      // não apenas os já publicados, pra dar referência real de jornada.
      const totalPublished = allModules.length;


      // sequencial: default true. setting "false" → modo livre.
      const emailBypass = ADMIN_BYPASS_EMAILS.has(
        (user?.email ?? "").trim().toLowerCase(),
      );
      const sequentialUnlock =
        !emailBypass &&
        (sequentialRes.data?.value ?? "true").toLowerCase() !== "false";

      // calcula desbloqueios. ordenação por number garante "anterior".
      const sortedAll = [...allModules].sort((a, b) => a.number - b.number);
      const unlockedModuleIds = new Set<string>();
      for (let i = 0; i < sortedAll.length; i++) {
        const m = sortedAll[i];
        if (!isReleased(m)) continue;
        if (!sequentialUnlock) {
          unlockedModuleIds.add(m.id);
          continue;
        }
        if (m.number === 1) {
          unlockedModuleIds.add(m.id);
          continue;
        }
        const prev = sortedAll.find((p) => p.number === m.number - 1);
        if (!prev) {
          unlockedModuleIds.add(m.id);
          continue;
        }
        // sequencial de verdade: só desbloqueia se o anterior estiver
        // concluído. se o anterior nem foi liberado, este fica travado
        // também (evita pular módulo por causa de despublicação/atraso).
        if (progressByModuleId[prev.id]?.completed_at) {
          unlockedModuleIds.add(m.id);
        }
      }

      // currentModule = primeira disponível e desbloqueada não concluída
      const currentModule =
        publishedModules.find(
          (m) => unlockedModuleIds.has(m.id) && !progressByModuleId[m.id]?.completed_at,
        ) ?? null;

      // nextModule = próxima depois da current
      const nextModule = currentModule
        ? publishedModules.find((m) => m.number > currentModule.number) ?? null
        : null;

      return {
        trails: (trails ?? []) as EletivaTrail[],
        modules: allModules,
        progressByModuleId,
        completedPillIds,
        unlockedModuleIds,
        sequentialUnlock,
        totalPublished,
        totalCompleted,
        currentModule,
        nextModule,
      };
    },
  });
};
