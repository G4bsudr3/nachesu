import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  recordAutosaveEvent,
  type AutosaveFieldStatus,
} from "./autosaveTelemetry";
import {
  clearLocalDraft,
  readLocalDraft,
  writeLocalDraft,
} from "./deliverableLocalDraft";


// payload livre que cada pílula da aula 1 grava em module_deliverables.content.
export type DeliverableContent = Record<string, unknown>;

type DeliverableRow = {
  id: string;
  module_id: string;
  user_id: string;
  content: DeliverableContent;
  status: "rascunho" | "enviado" | "aprovado" | "ajustar";
  submitted_at: string | null;
};

export function useDeliverable(moduleId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const enabled = !!user && !!moduleId;
  const queryKey = ["module-deliverable", moduleId, user?.id];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data: existing, error } = await supabase
        .from("module_deliverables")
        .select("id, module_id, user_id, content, status, submitted_at")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (existing ?? null) as DeliverableRow | null;
    },
  });

  const ensureDeliverable = async (): Promise<DeliverableRow> => {
    if (data) return data;
    const { data: existing } = await supabase
      .from("module_deliverables")
      .select("id, module_id, user_id, content, status, submitted_at")
      .eq("module_id", moduleId!)
      .eq("user_id", user!.id)
      .maybeSingle();
    if (existing) {
      qc.setQueryData(queryKey, existing);
      return existing as DeliverableRow;
    }
    const { data: created, error: insertError } = await supabase
      .from("module_deliverables")
      .insert({
        module_id: moduleId!,
        user_id: user!.id,
        kind: "mixed",
        status: "rascunho",
        content: {},
      })
      .select("id, module_id, user_id, content, status, submitted_at")
      .single();
    if (insertError) throw insertError;
    qc.setQueryData(queryKey, created);
    return created as DeliverableRow;
  };

  const saveMutation = useMutation({
    mutationFn: async (patch: DeliverableContent) => {
      if (!enabled) throw new Error("sem contexto");
      const row = await ensureDeliverable();
      const next = { ...(row.content ?? {}), ...patch };
      const { error } = await supabase
        .from("module_deliverables")
        .update({ content: next as never, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData<DeliverableRow | null | undefined>(queryKey, (prev) =>
        prev ? { ...prev, content: next } : prev,
      );
    },
    onError: (err) => {
      console.warn("[useDeliverable] falha ao salvar rascunho", err);
    },
  });

  return {
    deliverable: data ?? null,
    isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

const RETRY_DELAYS_MS = [1500, 4000, 10000]; // 3 tentativas extras

/**
 * autosave com debounce + retry automático.
 * - dispara save ~debounceMs após mudança
 * - em falha, reagenda com backoff (1.5s, 4s, 10s)
 * - registra cada tentativa em telemetria pra debug por estudante
 */
export function useAutoSaveField<T>(opts: {
  value: T;
  initial: T;
  save: (patch: DeliverableContent) => Promise<unknown>;
  field: string;
  debounceMs?: number;
  moduleId?: string;
  userId?: string;
}): AutosaveFieldStatus {
  const { value, initial, save, field, debounceMs = 700, moduleId, userId } = opts;
  const [status, setStatus] = useState<AutosaveFieldStatus>({
    state: "idle",
    attempts: 0,
    lastSavedAt: null,
    lastError: null,
    nextRetryAt: null,
  });
  const initialRef = useRef(initial);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const inFlightValue = useRef<T>(value);

  const sameAsInitial = useMemo(
    () => JSON.stringify(value) === JSON.stringify(initialRef.current),
    [value],
  );

  const runSave = async (attempt: number, payloadValue: T) => {
    attemptRef.current = attempt;
    setStatus((s) => ({ ...s, state: attempt > 1 ? "retry" : "saving", attempts: attempt, nextRetryAt: null }));
    if (moduleId && userId) {
      recordAutosaveEvent({
        userId,
        moduleId,
        field,
        state: attempt > 1 ? "retry" : "saving",
        attempt,
      });
    }
    try {
      await save({ [field]: payloadValue as unknown as DeliverableContent[string] });
      const at = Date.now();
      setStatus({ state: "saved", attempts: attempt, lastSavedAt: at, lastError: null, nextRetryAt: null });
      if (moduleId && userId) {
        recordAutosaveEvent({ userId, moduleId, field, state: "saved", attempt });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const delay = RETRY_DELAYS_MS[attempt - 1];
      if (delay !== undefined) {
        const nextAt = Date.now() + delay;
        setStatus({
          state: "retry",
          attempts: attempt,
          lastSavedAt: null,
          lastError: message,
          nextRetryAt: nextAt,
        });
        if (moduleId && userId) {
          recordAutosaveEvent({
            userId,
            moduleId,
            field,
            state: "error",
            attempt,
            error: message,
          });
        }
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          // valor mais recente vence
          runSave(attempt + 1, inFlightValue.current);
        }, delay);
      } else {
        setStatus({
          state: "error",
          attempts: attempt,
          lastSavedAt: null,
          lastError: message,
          nextRetryAt: null,
        });
        if (moduleId && userId) {
          recordAutosaveEvent({
            userId,
            moduleId,
            field,
            state: "error",
            attempt,
            error: message,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (sameAsInitial) return;
    inFlightValue.current = value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    setStatus((s) => ({ ...s, state: "saving", attempts: 0, nextRetryAt: null }));
    debounceTimer.current = setTimeout(() => {
      runSave(1, value);
    }, debounceMs);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, field, debounceMs, sameAsInitial]);

  // cleanup do retry pendente quando o componente desmonta
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  return status;
}
