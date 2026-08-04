import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationLogRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  student_label: string;
  turma: string | null;
  email: string | null;
  email_status: string | null;
  email_error: string | null;
  email_at: string | null;
}

export interface NotificationLogData {
  rows: NotificationLogRow[];
  kinds: string[];
  hiddenTestCount: number;
  stats: {
    total: number;
    read: number;
    emailsSent: number;
    emailsFailed: number;
    emailsPending: number;
  };
}


const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * junta notificações in-app com o log de envio de e-mail e o cadastro oficial
 * da escola, pra o admin ver num lugar só o que foi disparado, lido e falhou.
 * o log de e-mail é deduplicado por message_id (última linha vence).
 */
export function useNotificationLog(range: string = "30d") {
  return useQuery({
    queryKey: ["admin-notification-log", range],
    queryFn: async (): Promise<NotificationLogData> => {
      const days = RANGE_DAYS[range] ?? 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const [notifRes, emailRes, rosterRes, profilesRes, signInRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, user_id, kind, title, body, link, read_at, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("email_send_log")
          .select("message_id, template_name, recipient_email, status, error_message, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("student_roster").select("email_normalized, full_name, turma"),
        supabase.from("profiles").select("id, nickname, display_name"),
        supabase.rpc("admin_last_sign_in" as never, {} as never),
      ]);

      const notifs = notifRes.data ?? [];
      const emailRows = emailRes.data ?? [];

      // dedupe por message_id, mantendo o registro mais recente
      const latestByMessage = new Map<string, (typeof emailRows)[number]>();
      for (const row of emailRows) {
        const key = row.message_id ?? `${row.recipient_email}-${row.created_at}`;
        if (!latestByMessage.has(key)) latestByMessage.set(key, row);
      }
      const dedupedEmails = [...latestByMessage.values()];

      const emailsByRecipient = new Map<string, typeof dedupedEmails>();
      for (const row of dedupedEmails) {
        const key = (row.recipient_email ?? "").toLowerCase();
        const list = emailsByRecipient.get(key) ?? [];
        list.push(row);
        emailsByRecipient.set(key, list);
      }

      const emailByUser = new Map<string, string>();
      const signIns = (signInRes.data ?? []) as Array<{
        user_id: string;
        email: string | null;
      }>;
      signIns.forEach((s) => {
        if (s.email) emailByUser.set(s.user_id, s.email.toLowerCase());
      });

      const rosterByEmail = new Map(
        (rosterRes.data ?? []).map((r) => [r.email_normalized.toLowerCase(), r]),
      );
      const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

      const rows: NotificationLogRow[] = notifs.map((n) => {
        const email = emailByUser.get(n.user_id) ?? null;
        const roster = email ? rosterByEmail.get(email) : undefined;
        const profile = profileById.get(n.user_id);
        const label =
          roster?.full_name ||
          profile?.display_name ||
          profile?.nickname ||
          email?.split("@")[0] ||
          "estudante";

        // e-mail mais próximo (até 10 min depois) do disparo dessa notificação
        const candidates = email ? emailsByRecipient.get(email) ?? [] : [];
        const notifTs = new Date(n.created_at).getTime();
        const match = candidates.find((c) => {
          const t = new Date(c.created_at).getTime();
          return t >= notifTs - 60_000 && t <= notifTs + 10 * 60_000;
        });

        return {
          ...n,
          student_label: label,
          turma: roster?.turma ?? null,
          email,
          email_status: match?.status ?? null,
          email_error: match?.error_message ?? null,
          email_at: match?.created_at ?? null,
        };
      });

      const emailsSent = dedupedEmails.filter((e) => e.status === "sent").length;
      const emailsFailed = dedupedEmails.filter((e) =>
        ["dlq", "failed", "bounced"].includes(e.status),
      ).length;
      const emailsPending = dedupedEmails.filter((e) => e.status === "pending").length;

      return {
        rows,
        kinds: [...new Set(notifs.map((n) => n.kind))].sort(),
        stats: {
          total: rows.length,
          read: rows.filter((r) => r.read_at).length,
          emailsSent,
          emailsFailed,
          emailsPending,
        },
      };
    },
  });
}
