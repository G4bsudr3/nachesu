import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AccessSession {
  session_id: string;
  started_at: string;
  last_active_at: string;
  user_agent: string | null;
  is_active: boolean;
}

export interface AccessDay {
  access_date: string;
  first_seen_at: string;
  last_seen_at: string;
  device_kind: string;
  hits: number;
}

export interface AccessHistory {
  sessions: AccessSession[];
  days: AccessDay[];
  lastSignInAt: string | null;
  firstSeenAt: string | null;
  totalDays: number;
  /** últimas 8 semanas, da mais antiga pra mais recente */
  weeks: { label: string; days: number }[];
}

const startOfWeek = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); // segunda
  return c;
};

/**
 * histórico de acesso do estudante: sessões vivas da autenticação
 * (quando entrou, última atividade, dispositivo) + registro próprio por dia,
 * que sobrevive à expiração das sessões.
 */
export function useStudentAccessHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-access", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AccessHistory> => {
      const [{ data: sessions }, { data: log }, { data: signIn }] = await Promise.all([
        supabase.rpc("admin_access_sessions" as never, { _user_id: userId! } as never),
        supabase
          .from("user_access_log")
          .select("access_date, first_seen_at, last_seen_at, device_kind, hits")
          .eq("user_id", userId!)
          .order("access_date", { ascending: false })
          .limit(180),
        supabase.rpc("admin_last_sign_in" as never, { _user_ids: [userId!] } as never),
      ]);

      const days = (log ?? []) as AccessDay[];
      const sessionRows = ((sessions ?? []) as AccessSession[]);

      const dayKeys = new Set<string>(days.map((d) => d.access_date));
      sessionRows.forEach((s) => {
        dayKeys.add(new Date(s.started_at).toLocaleDateString("en-CA"));
      });

      const now = new Date();
      const weeks: { label: string; days: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const start = startOfWeek(new Date(now.getTime() - i * 7 * 86400000));
        const end = new Date(start.getTime() + 7 * 86400000);
        let count = 0;
        dayKeys.forEach((k) => {
          const d = new Date(`${k}T12:00:00`);
          if (d >= start && d < end) count += 1;
        });
        weeks.push({
          label: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          days: count,
        });
      }

      const signInRow = ((signIn ?? []) as Array<{ last_sign_in_at: string | null }>)[0];
      const oldest = [
        ...days.map((d) => d.first_seen_at),
        ...sessionRows.map((s) => s.started_at),
      ].sort()[0];

      return {
        sessions: sessionRows,
        days,
        lastSignInAt: signInRow?.last_sign_in_at ?? null,
        firstSeenAt: oldest ?? null,
        totalDays: dayKeys.size,
        weeks,
      };
    },
  });
}

/** transforma o user agent num rótulo curto e humano */
export function deviceLabel(ua: string | null) {
  if (!ua) return "dispositivo não identificado";
  const s = ua.toLowerCase();
  if (s.includes("iphone")) return "iphone";
  if (s.includes("ipad")) return "ipad";
  if (s.includes("android")) return "android";
  if (s.includes("macintosh") || s.includes("mac os")) return "mac";
  if (s.includes("windows")) return "windows";
  if (s.includes("linux")) return "linux";
  return "outro dispositivo";
}
