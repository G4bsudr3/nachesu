import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fbiAnswerToLevel, type BuilderLevel } from "@/lib/builderLevel";

const CACHE_KEY = (uid: string) => `chora:builder-level:${uid}`;
const OVERRIDE_KEY = (uid: string) => `chora:builder-level-override:${uid}`;

const VALID_LEVELS: BuilderLevel[] = ["novato", "iniciante", "intermediario", "avancado"];
const isValidLevel = (v: string | null): v is BuilderLevel =>
  !!v && (VALID_LEVELS as string[]).includes(v);

const readOverride = (uid: string): BuilderLevel | null => {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY(uid));
    return isValidLevel(raw) ? raw : null;
  } catch { return null; }
};

/**
 * lê experiencia_lovable do fbi e devolve o nível do builder.
 * permite override manual (persistido em localStorage) sem mudar o detectado.
 */
export const useBuilderLevel = (): {
  level: BuilderLevel;
  detected: BuilderLevel;
  hasOverride: boolean;
  loading: boolean;
  setOverride: (l: BuilderLevel) => void;
  clearOverride: () => void;
} => {
  const { user } = useAuth();

  const [detected, setDetected] = useState<BuilderLevel>(() => {
    if (!user) return "novato";
    try {
      const cached = localStorage.getItem(CACHE_KEY(user.id));
      if (cached) return fbiAnswerToLevel(cached);
    } catch { /* ignore */ }
    return "novato";
  });

  const [override, setOverrideState] = useState<BuilderLevel | null>(() => {
    if (!user) return null;
    return readOverride(user.id);
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setOverrideState(readOverride(user.id));
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("fbi_responses")
        .select("experiencia_lovable")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order("submitted", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const answer = data?.experiencia_lovable ?? null;
      const next = fbiAnswerToLevel(answer);
      setDetected(next);
      setLoading(false);
      try {
        if (answer) localStorage.setItem(CACHE_KEY(user.id), answer);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setOverride = useCallback((l: BuilderLevel) => {
    if (!user) return;
    try { localStorage.setItem(OVERRIDE_KEY(user.id), l); } catch { /* ignore */ }
    setOverrideState(l);
  }, [user]);

  const clearOverride = useCallback(() => {
    if (!user) return;
    try { localStorage.removeItem(OVERRIDE_KEY(user.id)); } catch { /* ignore */ }
    setOverrideState(null);
  }, [user]);

  const level = override ?? detected;
  return { level, detected, hasOverride: override !== null, loading, setOverride, clearOverride };
};
