import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// payload livre que cada pílula da aula 1 grava em module_deliverables.content.
// shape esperado:
// {
//   guided_answers?: Record<string, string>,
//   items?: RadarItem[],
//   quiz_answers?: Record<string, string | string[]>,
//   bonus?: { fact?: string; why?: string },
// }
export type DeliverableContent = Record<string, unknown>;

type DeliverableRow = {
  id: string;
  module_id: string;
  user_id: string;
  content: DeliverableContent;
  status: "rascunho" | "enviado" | "aprovado" | "ajustar";
  submitted_at: string | null;
};

/**
 * carrega (ou cria) o deliverable do aluno pra esse módulo e devolve helper de
 * autosave por chave. usado pelas 5 pílulas da aula 1.
 */
export function useDeliverable(moduleId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const enabled = !!user && !!moduleId;

  const { data, isLoading } = useQuery({
    queryKey: ["module-deliverable", moduleId, user?.id],
    enabled,
    queryFn: async () => {
      const { data: existing, error } = await supabase
        .from("module_deliverables")
        .select("id, module_id, user_id, content, status, submitted_at")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing as DeliverableRow;

      // primeira interação: cria rascunho vazio
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
      return created as DeliverableRow;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: DeliverableContent) => {
      if (!data) throw new Error("deliverable ainda carregando");
      const next = { ...(data.content ?? {}), ...patch };
      const { error } = await supabase
        .from("module_deliverables")
        .update({ content: next as never, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData<DeliverableRow | undefined>(
        ["module-deliverable", moduleId, user?.id],
        (prev) => (prev ? { ...prev, content: next } : prev),
      );
    },
  });

  return {
    deliverable: data ?? null,
    isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

/**
 * autosave com debounce: dispara `save({ [key]: value })` ~700ms após mudar.
 * mostra estado "salvando" / "salvo" pra feedback discreto.
 */
export function useAutoSaveField<T>(opts: {
  value: T;
  initial: T;
  save: (patch: DeliverableContent) => Promise<unknown>;
  field: string;
  debounceMs?: number;
}) {
  const { value, initial, save, field, debounceMs = 700 } = opts;
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialRef = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sameAsInitial = useMemo(
    () => JSON.stringify(value) === JSON.stringify(initialRef.current),
    [value],
  );

  useEffect(() => {
    if (sameAsInitial) return;
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(() => {
      save({ [field]: value as unknown as DeliverableContent[string] })
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, field, save, debounceMs, sameAsInitial]);

  return status;
}
