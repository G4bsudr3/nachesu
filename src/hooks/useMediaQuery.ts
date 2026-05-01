import { useSyncExternalStore } from "react";

/**
 * Hook reativo a media query, sem mismatch entre primeira render e cliente.
 *
 * Usa useSyncExternalStore: o React reaproveita o snapshot do servidor (false
 * por default) e re-renderiza assim que hidrata no cliente, sem warning.
 *
 * Exemplo:
 *   const isDesktop = useMediaQuery("(min-width: 640px)");
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    // snapshot no cliente
    () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia(query).matches;
    },
    // snapshot no servidor / primeira render → sempre false (mobile-first safe)
    () => false,
  );
}
