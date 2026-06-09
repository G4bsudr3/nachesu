import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OverrideScope = "module" | "trail" | "course";

export type UserOverride = {
  id: string;
  user_id: string;
  scope: OverrideScope;
  module_id: string | null;
  trail_id: string | null;
  course_id: string | null;
  visible: boolean;
};

/** overrides do user logado (estudante) — usado em useEletivaProgress */
export const useMyOverrides = (userId: string | null | undefined) =>
  useQuery({
    queryKey: ["user_overrides", userId ?? "anon"],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<UserOverride[]> => {
      const { data, error } = await supabase
        .from("user_module_overrides")
        .select("id, user_id, scope, module_id, trail_id, course_id, visible")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as UserOverride[];
    },
  });

/** overrides de um estudante específico (admin) */
export const useOverridesForUser = (targetUserId: string | null) =>
  useQuery({
    queryKey: ["user_overrides_admin", targetUserId],
    enabled: !!targetUserId,
    staleTime: 30_000,
    queryFn: async (): Promise<UserOverride[]> => {
      const { data, error } = await supabase
        .from("user_module_overrides")
        .select("id, user_id, scope, module_id, trail_id, course_id, visible")
        .eq("user_id", targetUserId!);
      if (error) throw error;
      return (data ?? []) as UserOverride[];
    },
  });

export const useSetOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      user_id: string;
      scope: OverrideScope;
      target_id: string;
      // null = limpa override; true/false = força
      visible: boolean | null;
    }) => {
      const idColumn =
        args.scope === "module" ? "module_id" : args.scope === "trail" ? "trail_id" : "course_id";

      if (args.visible === null) {
        const { error } = await supabase
          .from("user_module_overrides")
          .delete()
          .eq("user_id", args.user_id)
          .eq("scope", args.scope)
          .eq(idColumn, args.target_id);
        if (error) throw error;
        return;
      }

      const payload: any = {
        user_id: args.user_id,
        scope: args.scope,
        visible: args.visible,
        module_id: null,
        trail_id: null,
        course_id: null,
      };
      payload[idColumn] = args.target_id;

      // tenta update; se 0 linhas, insert
      const { data: existing } = await supabase
        .from("user_module_overrides")
        .select("id")
        .eq("user_id", args.user_id)
        .eq("scope", args.scope)
        .eq(idColumn, args.target_id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("user_module_overrides")
          .update({ visible: args.visible })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_module_overrides").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["user_overrides_admin", vars.user_id] });
      qc.invalidateQueries({ queryKey: ["user_overrides", vars.user_id] });
      qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
      toast.success("visibilidade atualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "não rolou salvar override"),
  });
};

export const useClearOverridesForUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_module_overrides")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["user_overrides_admin", userId] });
      qc.invalidateQueries({ queryKey: ["user_overrides", userId] });
      qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
      toast.success("overrides limpos");
    },
    onError: (e: any) => toast.error(e?.message ?? "erro ao limpar"),
  });
};
