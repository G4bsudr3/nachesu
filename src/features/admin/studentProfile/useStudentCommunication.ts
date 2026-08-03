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

export interface EmailEntry {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface CommunicationLog {
  nudges: NudgeEntry[];
  notifications: NotificationEntry[];
  emails: EmailEntry[];
  email: string | null;
  lastSignInAt: string | null;
}

/**
 * histórico de comunicação enviada a esse estudante:
 * nudges de evasão, notificações in-app e log de envio de e-mail (90 dias),
 * mais o último acesso à plataforma.
 * o log de e-mail é deduplicado por message_id (linha mais recente vence).
 */
export function useStudentCommunication(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-comm", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CommunicationLog> => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: nudges }, { data: notifications }, { data: signIn }] = await Promise.all([
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
        supabase.rpc("admin_last_sign_in" as never, { _user_ids: [userId!] } as never),
      ]);

      const signInRow = ((signIn ?? []) as Array<{
        email: string | null;
        last_sign_in_at: string | null;
      }>)[0];
      const email = signInRow?.email ?? null;

      let emails: EmailEntry[] = [];
      if (email) {
        const { data: log } = await supabase
          .from("email_send_log")
          .select("message_id, template_name, recipient_email, status, error_message, created_at")
          .eq("recipient_email", email)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(100);
        const seen = new Set<string>();
        emails = ((log ?? []) as EmailEntry[]).filter((row) => {
          const key = row.message_id ?? `${row.template_name}-${row.created_at}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      return {
        nudges: (nudges ?? []) as NudgeEntry[],
        notifications: (notifications ?? []) as NotificationEntry[],
        emails,
        email,
        lastSignInAt: signInRow?.last_sign_in_at ?? null,
      };
    },
  });
}
