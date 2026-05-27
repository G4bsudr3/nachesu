import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminStudentNote {
  id: string;
  user_id: string;
  author_id: string;
  body_md: string;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
}

export function useAdminStudentNotes(userId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["admin-student-notes", userId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async (): Promise<AdminStudentNote[]> => {
      const { data: rows, error } = await supabase
        .from("admin_student_notes" as never)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (rows ?? []) as AdminStudentNote[];
      const authorIds = Array.from(new Set(list.map((r) => r.author_id)));
      if (authorIds.length === 0) return list;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, nickname")
        .in("user_id", authorIds);
      const map = new Map<string, string>();
      (profs ?? []).forEach((p) => map.set(p.user_id, p.display_name ?? p.nickname ?? ""));
      return list.map((n) => ({ ...n, author_name: map.get(n.author_id) ?? null }));
    },
  });

  const create = useMutation({
    mutationFn: async (body: string) => {
      const trimmed = body.trim();
      if (trimmed.length < 1) throw new Error("escreve uma nota");
      if (!user || !userId) throw new Error("sem contexto");
      const { error } = await supabase
        .from("admin_student_notes" as never)
        .insert({ user_id: userId, author_id: user.id, body_md: trimmed } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_student_notes" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    notes: data ?? [],
    isLoading,
    create: create.mutateAsync,
    creating: create.isPending,
    remove: remove.mutateAsync,
    removing: remove.isPending,
  };
}
