import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminInsight {
  id: string;
  scope: string;
  summary_md: string;
  generated_at: string;
  model: string | null;
  period_start: string | null;
  period_end: string | null;
}

const KEY = ["admin-insight", "global"];

async function fetchLatest(): Promise<AdminInsight | null> {
  const { data, error } = await supabase
    .from("admin_insights")
    .select("id, scope, summary_md, generated_at, model, period_start, period_end")
    .eq("scope", "global")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminInsight | null) ?? null;
}

export const useAdminInsight = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchLatest,
    staleTime: 5 * 60_000,
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-insight-digest", {
        body: {},
      });
      if (error) throw error;
      return (data as { insight: AdminInsight }).insight;
    },
    onSuccess: (insight) => {
      qc.setQueryData(KEY, insight);
    },
  });

  return {
    insight: query.data,
    loading: query.isLoading,
    regenerate: regenerate.mutateAsync,
    regenerating: regenerate.isPending,
  };
};
