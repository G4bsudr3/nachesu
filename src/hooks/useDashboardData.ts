import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { IDEA_STEP_ID } from "@/features/tutorial/tutorialSteps";

export interface DashboardData {
  profile: {
    nickname: string | null;
    display_name: string | null;
    has_password: boolean | null;
  } | null;
  fbiSubmitted: boolean;
  preworkStats: {
    total: number;
    done: number;
    obrigatoriosCompletos: boolean;
  };
  mission01Submitted: boolean;
  mission02Submitted: boolean;
  tutorialStepIds: string[];
  ideaCompleted: boolean;
  nicknameDisplay: string;
}

/**
 * fetch único e cacheado dos dados que tanto AppDashboard quanto Onboarding
 * precisavam buscar separadamente. com React Query, navegar entre as 2
 * telas reaproveita o cache.
 */
export const useDashboardData = () => {
  const { user } = useAuth();

  return useQuery<DashboardData>({
    queryKey: ["dashboard-data", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const u = user!;
      const [
        { data: profile },
        { data: fbi },
        { data: items },
        { data: progress },
        { data: missionsList },
        { data: subs },
        { data: tutorialRows },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("nickname, display_name, has_password")
          .eq("user_id", u.id)
          .maybeSingle(),
        supabase
          .from("fbi_responses")
          .select("submitted")
          .or(`user_id.eq.${u.id},email.eq.${u.email}`)
          .order("submitted", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("prework_items").select("id, obrigatorio").eq("published", true),
        supabase.from("prework_progress").select("item_id").eq("user_id", u.id),
        supabase.from("missions").select("id, ordem").in("ordem", [1, 2]),
        supabase.from("mission_submissions").select("mission_id").eq("user_id", u.id),
        supabase.from("tutorial_progress").select("step_id").eq("user_id", u.id),
      ]);

      const allItems = items ?? [];
      const doneSet = new Set((progress ?? []).map((p) => p.item_id));
      const obrigatorios = allItems.filter((i) => (i as { obrigatorio?: boolean }).obrigatorio);
      const obrigatoriosFeitos = obrigatorios.filter((i) => doneSet.has(i.id)).length;

      const submittedSet = new Set((subs ?? []).map((s) => s.mission_id));
      const m01 = (missionsList ?? []).find((m) => m.ordem === 1);
      const m02 = (missionsList ?? []).find((m) => m.ordem === 2);

      const remoteIds = (tutorialRows ?? []).map((r) => r.step_id);

      const nicknameDisplay =
        profile?.nickname ?? profile?.display_name ?? u.email?.split("@")[0] ?? "builder";

      return {
        profile: profile ?? null,
        fbiSubmitted: Boolean(fbi?.submitted),
        preworkStats: {
          total: allItems.length,
          done: allItems.filter((i) => doneSet.has(i.id)).length,
          obrigatoriosCompletos:
            obrigatorios.length > 0 && obrigatoriosFeitos === obrigatorios.length,
        },
        mission01Submitted: Boolean(m01 && submittedSet.has(m01.id)),
        mission02Submitted: Boolean(m02 && submittedSet.has(m02.id)),
        tutorialStepIds: remoteIds,
        ideaCompleted: remoteIds.includes(IDEA_STEP_ID),
        nicknameDisplay,
      };
    },
  });
};
