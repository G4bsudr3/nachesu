import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { BuilderLevel } from "@/lib/builderLevel";

export type DepthPref = "comeca-por-aqui" | "vai-mais-fundo";

const LS_KEY = "chora.depthPref";
const EVT = "chora:depth-changed";
const CHANNEL = "chora-depth";

const labelFor = (d: DepthPref) =>
  d === "vai-mais-fundo" ? "vai mais fundo" : "começa por aqui";

export const defaultDepthForLevel = (level: BuilderLevel): DepthPref => {
  if (level === "intermediario" || level === "avancado") return "vai-mais-fundo";
  return "comeca-por-aqui";
};

const isValid = (v: unknown): v is DepthPref =>
  v === "comeca-por-aqui" || v === "vai-mais-fundo";

const readCookie = (): DepthPref | null => {
  try {
    if (typeof document === "undefined") return null;
    const match = document.cookie.split("; ").find((c) => c.startsWith(`${LS_KEY}=`));
    if (!match) return null;
    const v = decodeURIComponent(match.split("=")[1] ?? "");
    return isValid(v) ? v : null;
  } catch { return null; }
};

const writeCookie = (v: DepthPref) => {
  try {
    if (typeof document === "undefined") return;
    // 1 ano, same-site lax, sem secure pra funcionar em http local
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${LS_KEY}=${encodeURIComponent(v)}; path=/; max-age=${maxAge}; samesite=lax`;
  } catch { /* ignore */ }
};

/** lê na ordem: localStorage → sessionStorage → cookie. devolve a primeira fonte válida. */
const readStored = (): DepthPref | null => {
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (isValid(ls)) return ls;
  } catch { /* ignore */ }
  try {
    const ss = sessionStorage.getItem(LS_KEY);
    if (isValid(ss)) return ss;
  } catch { /* ignore */ }
  return readCookie();
};

/** escreve em todas as camadas disponíveis pra sobreviver a localStorage bloqueado/modo privado. */
const writeStored = (v: DepthPref) => {
  try { localStorage.setItem(LS_KEY, v); } catch { /* ignore */ }
  try { sessionStorage.setItem(LS_KEY, v); } catch { /* ignore */ }
  writeCookie(v);
};

export const useDepth = (level: BuilderLevel, levelLoading: boolean = false) => {
  const stored = readStored();
  const [depth, setDepthState] = useState<DepthPref>(() => stored ?? defaultDepthForLevel(level));
  const [isCustom, setIsCustom] = useState<boolean>(() => stored !== null);
  const lastValueRef = useRef<DepthPref>(depth);
  const localOriginRef = useRef(false);

  // ready quando: tem preferência salva (não depende do level) OU level já terminou de carregar
  const ready = stored !== null || !levelLoading;

  useEffect(() => { lastValueRef.current = depth; }, [depth]);

  // se não tem custom e o level mudar, segue o default
  useEffect(() => {
    if (!isCustom) setDepthState(defaultDepthForLevel(level));
  }, [level, isCustom]);

  // sincroniza entre componentes/abas: storage + custom event + BroadcastChannel
  useEffect(() => {
    const channel: BroadcastChannel | null =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;

    const apply = (fromOtherTab: boolean) => {
      const stored = readStored();
      const next = stored ?? defaultDepthForLevel(level);
      if (next === lastValueRef.current) return;

      setDepthState(next);
      setIsCustom(stored !== null);
      lastValueRef.current = next;

      // só notifica quando veio de outra aba e a mudança não foi local
      if (fromOtherTab && !localOriginRef.current) {
        toast.info(`profundidade sincronizada: ${labelFor(next)}`, {
          description: "atualizada em outra aba.",
          duration: 2500,
        });
      }
      localOriginRef.current = false;
    };

    const onSameTab = () => apply(false);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== LS_KEY) return;
      apply(true);
    };

    const onChannel = () => apply(true);

    window.addEventListener(EVT, onSameTab);
    window.addEventListener("storage", onStorage);
    channel?.addEventListener("message", onChannel);

    // re-sincroniza ao voltar pra aba (visibilidade) e ao focar
    const onVisible = () => {
      if (document.visibilityState === "visible") apply(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.removeEventListener(EVT, onSameTab);
      window.removeEventListener("storage", onStorage);
      channel?.removeEventListener("message", onChannel);
      channel?.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [level]);

  const setDepth = useCallback((next: DepthPref) => {
    writeStored(next);
    localOriginRef.current = true;
    lastValueRef.current = next;
    setDepthState(next);
    setIsCustom(true);
    try { window.dispatchEvent(new Event(EVT)); } catch { /* ignore */ }
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel(CHANNEL);
        ch.postMessage({ depth: next, ts: Date.now() });
        ch.close();
      }
    } catch { /* ignore */ }
  }, []);

  return { depth, setDepth, isCustom, ready };
};
