import { useCallback, useEffect, useState } from "react";
import { nsGet, nsRemove, nsSet } from "@/lib/nsKey";

type Mark = { pillId: string; label: string; at: number };

const key = (userId: string | undefined, moduleId: string) =>
  `modulo-resume:${userId ?? "anon"}:${moduleId}`;

/**
 * lembra em qual bloco do módulo a pessoa estava mexendo por último.
 * persiste em localStorage, então sobrevive a reload, troca de aba e volta no dia seguinte.
 */
export const useModuleResume = (moduleId: string | null | undefined, userId?: string) => {
  const [mark, setMark] = useState<Mark | null>(null);

  useEffect(() => {
    if (!moduleId) {
      setMark(null);
      return;
    }
    try {
      const raw = nsGet(key(userId, moduleId));
      setMark(raw ? (JSON.parse(raw) as Mark) : null);
    } catch {
      setMark(null);
    }
  }, [moduleId, userId]);

  const remember = useCallback(
    (pillId: string, label: string) => {
      if (!moduleId) return;
      const next: Mark = { pillId, label, at: Date.now() };
      try {
        nsSet(key(userId, moduleId), JSON.stringify(next));
      } catch {
        /* noop */
      }
      setMark(next);
    },
    [moduleId, userId],
  );

  const forget = useCallback(() => {
    if (!moduleId) return;
    nsRemove(key(userId, moduleId));
    setMark(null);
  }, [moduleId, userId]);

  return { mark, remember, forget };
};
