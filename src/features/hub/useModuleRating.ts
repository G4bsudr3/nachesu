import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { nsGet, nsSet } from "@/lib/nsKey";

/**
 * checkpoints de pulso: só pedimos avaliação em 5 dos 20 módulos.
 * módulo 1 (primeira impressão), 5/10/15 (fim de trilha) e 20 (fechamento).
 */
export const RATING_CHECKPOINTS = [1, 5, 10, 15, 20];

export const isRatingCheckpoint = (moduleNumber: number | null | undefined) =>
  typeof moduleNumber === "number" && RATING_CHECKPOINTS.includes(moduleNumber);

export interface ModuleRating {
  rating: number;
  comment: string | null;
  updated_at: string;
}

const dismissKey = (moduleId: string) => `pulso.dismiss.${moduleId}`;

export const isRatingDismissed = (moduleId: string) => nsGet(dismissKey(moduleId)) === "1";
export const dismissRating = (moduleId: string) => nsSet(dismissKey(moduleId), "1");

export function useModuleRating(moduleId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["module-rating", moduleId, user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!moduleId && !!user?.id,
    queryFn: async (): Promise<ModuleRating | null> => {
      const { data, error } = await supabase
        .from("module_ratings")
        .select("rating, comment, updated_at")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ModuleRating | null) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment?: string | null }) => {
      if (!moduleId || !user) throw new Error("sem contexto");
      const payload = {
        user_id: user.id,
        module_id: moduleId,
        rating,
        ...(comment !== undefined ? { comment: comment?.trim() ? comment.trim() : null } : {}),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("module_ratings")
        .upsert(payload, { onConflict: "user_id,module_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });

  return {
    rating: query.data ?? null,
    loading: query.isLoading,
    save: save.mutateAsync,
    saving: save.isPending,
  };
}
