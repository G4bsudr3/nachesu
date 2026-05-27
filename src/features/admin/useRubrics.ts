import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RubricCriterion {
  label: string;
  description?: string;
}

export interface Rubric {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean;
  criteria: RubricCriterion[];
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
      return (data ?? []).map((r: any) => ({
        ...r,
        criteria: Array.isArray(r.criteria) ? r.criteria : [],
      })) as Rubric[];
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
        if (data) return normalize(data);
      }
      const { data: def } = await supabase
        .from("rubrics")
        .select("*")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      return def ? normalize(def) : null;
    },
  });
}

function normalize(r: any): Rubric {
  return { ...r, criteria: Array.isArray(r.criteria) ? r.criteria : [] };
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
