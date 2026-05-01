import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FbiData, FbiFieldKey } from "./schema";
import { logger } from "@/lib/logger";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;
const LS_PREFIX = "chora.publicFbi.";

const hashEmail = (e: string) => e.replace(/[^a-z0-9]/gi, "_");

/**
 * versão pública do useFbiForm. sem auth, salva via edge function submit-public-fbi.
 * auto-save em localStorage + debounced persist no banco.
 */
export const usePublicFbiForm = (
  email: string,
  prefill: FbiData,
  prefillKeys: Set<keyof FbiData>,
  invitedParticipantId: string,
) => {
  const lsKey = LS_PREFIX + hashEmail(email);

  // merge: localStorage > prefill
  const getInitial = (): FbiData => {
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored) {
        const parsed = JSON.parse(stored) as FbiData;
        return { ...prefill, ...parsed };
      }
    } catch {}
    return { ...prefill };
  };

  const [data, setData] = useState<FbiData>(getInitial);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const pendingRef = useRef<FbiData>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // persist to localStorage on every data change
  useEffect(() => {
    try {
      localStorage.setItem(lsKey, JSON.stringify(data));
    } catch {}
  }, [data, lsKey]);

  const persist = useCallback(
    async (patch: FbiData) => {
      setSaveStatus("saving");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-public-fbi`;
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email,
            invited_participant_id: invitedParticipantId,
            data: patch,
            submit: false,
          }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        setSaveStatus("saved");
      } catch (e) {
        logger.error("[public-fbi] save error:", e);
        setSaveStatus("error");
      }
    },
    [email, invitedParticipantId],
  );

  const scheduleSave = useCallback(
    (patch: FbiData) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const toSend = pendingRef.current;
        pendingRef.current = {};
        timerRef.current = null;
        void persist(toSend);
      }, DEBOUNCE_MS);
    },
    [persist],
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (Object.keys(pendingRef.current).length === 0) return;
    const toSend = pendingRef.current;
    pendingRef.current = {};
    await persist(toSend);
  }, [persist]);

  const setField = useCallback(
    <K extends FbiFieldKey>(key: K, value: FbiData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
      if (submitted) return;
      scheduleSave({ [key]: value } as FbiData);
    },
    [scheduleSave, submitted],
  );

  const submit = useCallback(async () => {
    await flush();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-public-fbi`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email,
          invited_participant_id: invitedParticipantId,
          data,
          submit: true,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        logger.error("[public-fbi] submit error:", errText);
        return { ok: false as const, error: errText };
      }
      setSubmitted(true);
      // clean localStorage after successful submit
      try { localStorage.removeItem(lsKey); } catch {}
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: String(e) };
    }
  }, [email, invitedParticipantId, data, flush, lsKey]);

  // flush on unmount
  useEffect(() => () => { void flush(); }, [flush]);

  // initial save of prefill data
  useEffect(() => {
    if (Object.keys(prefill).length > 0) {
      scheduleSave(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    setField,
    submit,
    flush,
    loading: false,
    submitted,
    saveStatus,
    prefill,
    prefillKeys,
  };
};
