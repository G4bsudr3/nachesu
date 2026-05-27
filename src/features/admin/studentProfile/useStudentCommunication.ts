import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NudgeEntry {
  id: string;
  level: string;
  days_inactive: number;
  email_sent: boolean;
  sent_at: string;
  course_id: string;
}

export interface NotificationEntry {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface CommunicationLog {
  nudges: NudgeEntry[];
  notifications: NotificationEntry[];
}

/**
 * histórico de comunicação automática enviada a esse estudante:
 * nudges de evasão + notificações in-app dos últimos 90 dias.
 * `email_send_log` fica fora porque hoje só `service_role` tem SELECT;
 * exige migração adicional pra expor pra admin.
 */
export function useStudentCommunication(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-comm", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CommunicationLog> => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: nudges }, { data: notifications }] = await Promise.all([
        supabase
          .from("evasion_nudges")
          .select("id, level, days_inactive, email_sent, sent_at, course_id")
          .eq("user_id", userId!)
          .order("sent_at", { ascending: false })
          .limit(20),
        supabase
          .from("notifications")
          .select("id, kind, title, body, link, read_at, created_at")
          .eq("user_id", userId!)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      return {
        nudges: (nudges ?? []) as NudgeEntry[],
        notifications: (notifications ?? []) as NotificationEntry[],
      };
    },
  });
}
