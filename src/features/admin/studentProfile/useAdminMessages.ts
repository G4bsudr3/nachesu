import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminMessageInput {
  recipient_id: string;
  subject: string;
  body_md: string;
  link?: string | null;
  send_email?: boolean;
}

export interface AdminMessageRow {
  id: string;
  subject: string;
  body_md: string;
  link: string | null;
  email_sent: boolean;
  read_at: string | null;
  created_at: string;
  author_id: string;
}

export function useStudentAdminMessages(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-messages", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AdminMessageRow[]> => {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("id, subject, body_md, link, email_sent, read_at, created_at, author_id")
        .eq("recipient_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AdminMessageRow[];
    },
  });
}

export function useSendAdminMessage(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminMessageInput) => {
      const { data, error } = await supabase.functions.invoke("send-admin-message", {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: boolean; id: string; email_sent: boolean };
    },
    onSuccess: (data) => {
      toast.success(
        data.email_sent ? "mensagem enviada (in-app + e-mail)" : "mensagem enviada in-app",
      );
      qc.invalidateQueries({ queryKey: ["admin-student-messages", userId] });
      qc.invalidateQueries({ queryKey: ["admin-student-comm", userId] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "não consegui enviar");
    },
  });
}
