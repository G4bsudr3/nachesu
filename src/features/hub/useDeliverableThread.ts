import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DeliverableMessageRow {
  id: string;
  deliverable_id: string;
  author_id: string;
  author_role: "student" | "educator";
  body_md: string;
  read_at: string | null;
  created_at: string;
  author_name?: string | null;
}

/**
 * thread de mensagens entre aluno e educador presa à entrega.
 * usa realtime pra atualização ao vivo nos dois lados.
 */
export function useDeliverableThread(deliverableId: string | null | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["deliverable-thread", deliverableId] as const;

  useEffect(() => {
    if (!deliverableId) return;
    const ch = supabase
      .channel(`deliverable-thread-${deliverableId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliverable_messages",
          filter: `deliverable_id=eq.${deliverableId}`,
        },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [deliverableId, qc]);

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!deliverableId && !!user,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("deliverable_messages" as never)
        .select("*")
        .eq("deliverable_id", deliverableId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (rows ?? []) as DeliverableMessageRow[];
      const authorIds = Array.from(new Set(list.map((m) => m.author_id)));
      if (authorIds.length === 0) return list;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, nickname")
        .in("user_id", authorIds);
      const map = new Map<string, string>();
      (profs ?? []).forEach((p) => {
        map.set(p.user_id, p.display_name ?? p.nickname ?? "");
      });
      return list.map((m) => ({ ...m, author_name: map.get(m.author_id) ?? null }));
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!user || !deliverableId) throw new Error("sem contexto");
      const trimmed = body.trim();
      if (trimmed.length < 1) throw new Error("mensagem vazia");
      if (trimmed.length > 4000) throw new Error("mensagem acima de 4000 caracteres");
      const { error } = await supabase
        .from("deliverable_messages" as never)
        .insert({
          deliverable_id: deliverableId,
          author_id: user.id,
          body_md: trimmed,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !deliverableId || !data) return;
      const toMark = data.filter((m) => !m.read_at && m.author_id !== user.id).map((m) => m.id);
      if (toMark.length === 0) return;
      await supabase
        .from("deliverable_messages" as never)
        .update({ read_at: new Date().toISOString() } as never)
        .in("id", toMark);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    messages: data ?? [],
    isLoading,
    send: sendMutation.mutateAsync,
    sending: sendMutation.isPending,
    markRead: markReadMutation.mutate,
  };
}
