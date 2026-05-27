import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TutorMessage {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

export interface TutorConversation {
  id: string;
  trail_id: string;
  trail_title: string | null;
  course_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages: TutorMessage[];
  messageCount: number;
}

/**
 * todas as conversas com o tutor IA (TutorChat) deste estudante.
 * RLS já permite SELECT pra admin via `tutor_conversations select admin`.
 * `chora_bot_messages` (fluxo legado) fica fora desta fase.
 */
export function useStudentTutorConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-student-tutor", userId],
    enabled: !!userId,
    queryFn: async (): Promise<TutorConversation[]> => {
      const { data: rows, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  trail_id: string;
                  course_id: string | null;
                  title: string | null;
                  messages: TutorMessage[];
                  created_at: string;
                  updated_at: string;
                }> | null;
                error: Error | null;
              }>;
            };
          };
        };
      })
        .from("tutor_conversations")
        .select("id, trail_id, course_id, title, messages, created_at, updated_at")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const list = rows ?? [];
      if (list.length === 0) return [];

      const trailIds = Array.from(new Set(list.map((r) => r.trail_id)));
      const { data: trails } = await supabase
        .from("trails")
        .select("id, title")
        .in("id", trailIds);
      const trailMap = new Map((trails ?? []).map((t) => [t.id, t.title]));

      return list.map((r) => ({
        ...r,
        trail_title: trailMap.get(r.trail_id) ?? null,
        messageCount: Array.isArray(r.messages) ? r.messages.length : 0,
      }));
    },
  });
}
