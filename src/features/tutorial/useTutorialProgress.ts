import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "chora-tutorial-progress";

const readStorage = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const writeStorage = (ids: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage indisponível, ignora
  }
};

export const getTutorialProgressCount = (): number => readStorage().length;

export const useTutorialProgress = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(() => new Set(readStorage()));

  // Sincroniza do servidor ao logar; mantém localStorage como fallback se a API falhar
  useEffect(() => {
    if (!user) {
      setCompleted(new Set(readStorage()));
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tutorial_progress")
        .select("step_id")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (error || !data) {
        // fallback: mantém o que tem em localStorage
        setCompleted(new Set(readStorage()));
        return;
      }

      const remoteIds = data.map((r) => r.step_id);
      const localIds = readStorage();
      // união: se o usuário marcou offline, faz upsert no servidor
      const merged = new Set<string>([...remoteIds, ...localIds]);
      const onlyLocal = localIds.filter((id) => !remoteIds.includes(id));

      if (onlyLocal.length > 0) {
        await supabase
          .from("tutorial_progress")
          .insert(onlyLocal.map((step_id) => ({ user_id: user.id, step_id })));
      }

      const finalIds = Array.from(merged);
      writeStorage(finalIds);
      setCompleted(new Set(finalIds));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    (id: string) => {
      // optimistic local update + persistência
      setCompleted((prev) => {
        const next = new Set(prev);
        const isAdding = !next.has(id);
        if (isAdding) next.add(id);
        else next.delete(id);
        const arr = Array.from(next);
        writeStorage(arr);

        if (user) {
          // fire-and-forget; localStorage mantém o estado se a API falhar
          if (isAdding) {
            void supabase
              .from("tutorial_progress")
              .insert({ user_id: user.id, step_id: id });
          } else {
            void supabase
              .from("tutorial_progress")
              .delete()
              .eq("user_id", user.id)
              .eq("step_id", id);
          }
        }
        return next;
      });
    },
    [user],
  );

  return { completed, toggle, count: completed.size };
};
