import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type IdeaSource = "fbi" | "custom";

export interface TutorialIdea {
  idea: string;
  source: IdeaSource;
}

const STORAGE_KEY = (uid: string) => `chora-tutorial-idea:${uid}`;

const readCache = (uid: string | undefined): TutorialIdea | null => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.idea && (parsed.source === "fbi" || parsed.source === "custom")) {
      return { idea: String(parsed.idea), source: parsed.source };
    }
    return null;
  } catch {
    return null;
  }
};

const writeCache = (uid: string, value: TutorialIdea | null) => {
  try {
    if (value) localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY(uid));
  } catch {
    // ignora
  }
};

export type SaveResult =
  | { ok: true; synced: true }
  | { ok: true; synced: false; reason: "offline" | "no-user" | "server"; message: string };

export const useTutorialIdea = () => {
  const { user } = useAuth();
  const [idea, setIdea] = useState<TutorialIdea | null>(() => readCache(user?.id));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setIdea(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = readCache(user.id);
      if (cached) setIdea(cached);
      const { data, error } = await supabase
        .from("tutorial_idea")
        .select("idea, source")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const next: TutorialIdea = {
          idea: data.idea,
          source: (data.source === "fbi" ? "fbi" : "custom") as IdeaSource,
        };
        setIdea(next);
        writeCache(user.id, next);
      } else if (!error && !data) {
        // sem registro remoto, mas pode haver cache local de tentativa anterior
        if (cached) {
          // tenta ressincronizar se temos cache mas não no servidor
          await supabase
            .from("tutorial_idea")
            .upsert({ user_id: user.id, idea: cached.idea, source: cached.source });
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (next: TutorialIdea): Promise<SaveResult> => {
      const trimmed = { idea: next.idea.trim(), source: next.source };
      if (!trimmed.idea) {
        return {
          ok: true,
          synced: false,
          reason: "server",
          message: "ideia vazia",
        };
      }
      setSaving(true);
      // optimistic local
      setIdea(trimmed);
      if (user) writeCache(user.id, trimmed);

      if (!user) {
        setSaving(false);
        return {
          ok: true,
          synced: false,
          reason: "no-user",
          message: "salvei só no seu navegador. faz login pra sincronizar entre dispositivos.",
        };
      }

      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (isOffline) {
        setSaving(false);
        return {
          ok: true,
          synced: false,
          reason: "offline",
          message: "sem internet. salvei no seu navegador e sincronizo sozinho quando voltar a conexão.",
        };
      }

      const { error } = await supabase
        .from("tutorial_idea")
        .upsert({ user_id: user.id, idea: trimmed.idea, source: trimmed.source });
      setSaving(false);
      if (error) {
        return {
          ok: true,
          synced: false,
          reason: "server",
          message:
            "deu ruim no servidor, mas salvei no seu navegador. pode seguir o tutorial normalmente, tento sincronizar de novo quando você voltar aqui.",
        };
      }
      return { ok: true, synced: true };
    },
    [user],
  );

  return { idea, loading, saving, save };
};
