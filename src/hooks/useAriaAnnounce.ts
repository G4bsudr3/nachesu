import { useEffect, useRef, useState } from "react";

/**
 * announce com debounce + dedupe.
 * - só anuncia depois que `value` ficou estável por `delay` ms
 * - não reanuncia se o valor final for igual ao último anunciado
 * - respeita prefers-reduced-motion: aumenta o delay e fica mais silencioso
 */
export const useAriaAnnounce = (value: string, delay = 600): string => {
  const [announced, setAnnounced] = useState("");
  const lastRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const effectiveDelay = reduce ? Math.max(delay, 1000) : delay;

    timerRef.current = window.setTimeout(() => {
      if (value && value !== lastRef.current) {
        lastRef.current = value;
        // limpa antes pra forçar SR a reler mensagens iguais consecutivas em casos extremos
        setAnnounced("");
        window.setTimeout(() => setAnnounced(value), 30);
      }
      timerRef.current = null;
    }, effectiveDelay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay]);

  return announced;
};
