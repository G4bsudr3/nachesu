import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EletivaTrail = {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  color: string | null;
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

export const useEletivaProgress = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["eletiva-progress", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<EletivaSnapshot> => {
      const [{ data: trails }, { data: modules }, progressRes] = await Promise.all([
        supabase
          .from("trails")
          .select("id, order_index, title, description, color")
          .order("order_index"),
        supabase
          .from("modules")
          .select("id, number, trail_id, title, objective, total_minutes, available_from, published")
          .order("number"),
        user
          ? supabase
              .from("student_module_progress")
              .select("module_id, started_at, completed_at")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as ModuleProgress[] }),
      ]);

      const progressByModuleId: Record<string, ModuleProgress> = {};
      for (const p of (progressRes.data ?? []) as ModuleProgress[]) {
        progressByModuleId[p.module_id] = p;
      }

      const allModules = (modules ?? []) as (EletivaModule & { id: string })[];
      const publishedModules = allModules.filter(isAvailable);
      const totalCompleted = publishedModules.filter(
        (m) => progressByModuleId[m.id]?.completed_at,
      ).length;

      // currentModule = primeira disponível não concluída
      const currentModule =
        publishedModules.find((m) => !progressByModuleId[m.id]?.completed_at) ?? null;

      // nextModule = depois da current
      const nextModule = currentModule
        ? publishedModules.find((m) => m.number > currentModule.number) ?? null
        : null;

      return {
        trails: (trails ?? []) as EletivaTrail[],
        modules: allModules,
        progressByModuleId,
        totalPublished: publishedModules.length,
        totalCompleted,
        currentModule,
        nextModule,
      };
    },
  });
};
