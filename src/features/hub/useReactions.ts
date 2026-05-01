import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export const HUB_EMOJIS = ["🔥", "💫", "🤙", "👀", "🎉"] as const;
export type HubEmoji = (typeof HUB_EMOJIS)[number];

export type ReactionTargetKind = "submission" | "project" | "material" | "album_photo";

export interface ReactionState {
  counts: Record<HubEmoji, number>;
  /** emojis que o usuário atual já marcou */
  mine: Set<HubEmoji>;
}

const empty: ReactionState = {
  counts: { "🔥": 0, "💫": 0, "🤙": 0, "👀": 0, "🎉": 0 },
  mine: new Set(),
};

export const useReactions = (
  targetId: string,
  targetKind: ReactionTargetKind = "submission",
) => {
  const { user } = useAuth();
  const [state, setState] = useState<ReactionState>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("hub_reactions")
      .select("emoji, user_id")
      .eq("target_id", targetId)
      .eq("target_kind", targetKind);

    const counts = { ...empty.counts };
    const mine = new Set<HubEmoji>();
    for (const r of data ?? []) {
      const e = r.emoji as HubEmoji;
      if (HUB_EMOJIS.includes(e)) {
        counts[e] = (counts[e] ?? 0) + 1;
        if (user && r.user_id === user.id) mine.add(e);
      }
    }
    setState({ counts, mine });
    setLoading(false);
  }, [targetId, targetKind, user]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (emoji: HubEmoji) => {
      if (!user) return;
      const has = state.mine.has(emoji);

      // optimistic
      setState((s) => {
        const counts = { ...s.counts, [emoji]: s.counts[emoji] + (has ? -1 : 1) };
        const mine = new Set(s.mine);
        if (has) mine.delete(emoji);
        else mine.add(emoji);
        return { counts, mine };
      });

      if (has) {
        const { error } = await supabase
          .from("hub_reactions")
          .delete()
          .eq("user_id", user.id)
          .eq("target_id", targetId)
          .eq("target_kind", targetKind)
          .eq("emoji", emoji);
        if (error) {
          logger.error("[useReactions] delete falhou", error);
          toast.error("não rolou tirar a reação. tenta de novo");
          refresh();
        }
      } else {
        const { error } = await supabase
          .from("hub_reactions")
          .insert({
            user_id: user.id,
            target_id: targetId,
            target_kind: targetKind,
            emoji,
          });
        if (error) {
          logger.error("[useReactions] insert falhou", error);
          toast.error("não rolou reagir. tenta de novo");
          refresh();
        }
      }
    },
    [user, targetId, targetKind, state.mine, refresh],
  );

  return { state, loading, toggle };
};
