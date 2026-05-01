import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CommentTargetKind = "submission" | "project" | "material" | "album_photo";

export interface HubCommentGif {
  url: string;
  preview_url: string | null;
  provider: string | null;
}

export interface HubComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: {
    nickname: string | null;
    display_name: string | null;
    slug: string | null;
  };
  edited: boolean;
  gif: HubCommentGif | null;
}

export interface CommentDraft {
  body: string;
  gif?: HubCommentGif | null;
}

const isEdited = (created: string, updated: string) =>
  new Date(updated).getTime() - new Date(created).getTime() > 5000;

export const useComments = (
  targetId: string,
  targetKind: CommentTargetKind = "submission",
) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<HubComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("hub_comments")
      .select(
        "id, user_id, body, created_at, updated_at, gif_url, gif_preview_url, gif_provider",
      )
      .eq("target_id", targetId)
      .eq("target_kind", targetKind)
      .order("created_at", { ascending: true });

    const rows = data ?? [];
    if (rows.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: authors } = await supabase
      .from("profiles")
      .select("user_id, nickname, display_name, slug")
      .in("user_id", userIds);

    const authorMap = new Map(
      (authors ?? []).map((a) => [
        a.user_id,
        { nickname: a.nickname, display_name: a.display_name, slug: a.slug },
      ]),
    );

    setComments(
      rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        body: r.body,
        created_at: r.created_at,
        updated_at: r.updated_at,
        author: authorMap.get(r.user_id) ?? { nickname: null, display_name: null, slug: null },
        edited: isEdited(r.created_at, r.updated_at),
        gif: r.gif_url
          ? { url: r.gif_url, preview_url: r.gif_preview_url, provider: r.gif_provider }
          : null,
      })),
    );
    setLoading(false);
  }, [targetId, targetKind]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const myComment = user ? comments.find((c) => c.user_id === user.id) ?? null : null;

  const upsert = useCallback(
    async (draft: CommentDraft): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "sem sessão" };
      const trimmed = draft.body.trim();
      const hasGif = Boolean(draft.gif?.url);
      if (trimmed.length === 0 && !hasGif) {
        return { ok: false, error: "comenta alguma coisa ou escolhe um gif 🤙" };
      }
      if (trimmed.length > 280) return { ok: false, error: "passou de 280 caracteres" };

      setSaving(true);
      const payload = {
        body: trimmed,
        gif_url: draft.gif?.url ?? null,
        gif_preview_url: draft.gif?.preview_url ?? null,
        gif_provider: draft.gif?.provider ?? null,
      };

      const { error } = myComment
        ? await supabase.from("hub_comments").update(payload).eq("id", myComment.id)
        : await supabase.from("hub_comments").insert({
            user_id: user.id,
            target_id: targetId,
            target_kind: targetKind,
            ...payload,
          });
      setSaving(false);

      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [user, targetId, targetKind, myComment, refresh],
  );

  const remove = useCallback(async () => {
    if (!user || !myComment) return;
    setSaving(true);
    await supabase.from("hub_comments").delete().eq("id", myComment.id);
    setSaving(false);
    await refresh();
  }, [user, myComment, refresh]);

  return { comments, myComment, loading, saving, upsert, remove };
};
