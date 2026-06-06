import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RubricCriterion {
  label: string;
  description?: string;
}

export type RubricScoreType = "none" | "numeric" | "letter";

export interface Rubric {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean;
  criteria: RubricCriterion[];
  score_type: RubricScoreType;
  score_max: number;
  /** true quando esta rubrica foi devolvida por fallback (módulo sem rubric_id) */
  is_fallback?: boolean;
  created_at: string;
  updated_at: string;
}

export function useRubrics() {
  return useQuery({
    queryKey: ["rubrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rubrics")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r: any) => normalize(r, false)) as Rubric[];
    },
  });
}

export function useRubricForModule(moduleId: string | null | undefined) {
  return useQuery({
    queryKey: ["rubric-for-module", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      // tenta rubrica do módulo
      const { data: mod } = await supabase
        .from("modules")
        .select("rubric_id")
        .eq("id", moduleId!)
        .maybeSingle();
      const rubricId = (mod as any)?.rubric_id;
      if (rubricId) {
        const { data } = await supabase.from("rubrics").select("*").eq("id", rubricId).maybeSingle();
        if (data) return normalize(data, false);
      }
      const { data: def } = await supabase
        .from("rubrics")
        .select("*")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      return def ? normalize(def, true) : null;
    },
  });
}

function normalize(r: any, isFallback = false): Rubric {
  return {
    ...r,
    criteria: Array.isArray(r.criteria) ? r.criteria : [],
    score_type: (r.score_type as RubricScoreType) ?? "none",
    score_max: typeof r.score_max === "number" ? r.score_max : 10,
    is_fallback: isFallback,
  };
}

export function useUpsertRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Rubric> & { criteria: RubricCriterion[]; name: string; slug: string }) => {
      const payload: any = {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        is_default: input.is_default ?? false,
        criteria: input.criteria,
        score_type: input.score_type ?? "none",
        score_max: input.score_max ?? 10,
      };
      if (input.id) payload.id = input.id;
      const { data, error } = await supabase.from("rubrics").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rubrics"] }),
  });
}

export function useDeleteRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rubrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rubrics"] }),
  });
}
