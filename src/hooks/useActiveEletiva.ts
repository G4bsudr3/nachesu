import { useCallback, useEffect, useState } from "react";

const KEY = "eletiva:active-slug";

/**
 * slug da eletiva "atual" escolhida pelo aluno (persistido em localStorage).
 * usado pra escopar o hero/progresso do dashboard quando o aluno
 * está matriculado em mais de uma eletiva.
 */
export function useActiveEletiva() {
  const [slug, setSlugState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(KEY);
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSlugState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setSlug = useCallback((next: string | null) => {
    if (next) window.localStorage.setItem(KEY, next);
    else window.localStorage.removeItem(KEY);
    setSlugState(next);
  }, []);

  return { slug, setSlug };
}
