import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EMPTY_DRAFT, type FeedbackFinalDraft } from "./feedbackFinalSchema";

const DRAFT_KEY = "chora:feedback-final-draft";

export const useFeedbackFinal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [alreadyAnswered, setAlreadyAnswered] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setAlreadyAnswered(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("hub_event_feedback_final")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setAlreadyAnswered(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadDraft = (): FeedbackFinalDraft => {
    if (typeof window === "undefined") return EMPTY_DRAFT;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return EMPTY_DRAFT;
      const parsed = JSON.parse(raw);
      return { ...EMPTY_DRAFT, ...parsed };
    } catch {
      return EMPTY_DRAFT;
    }
  };

  const saveDraft = (draft: FeedbackFinalDraft) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  };

  const submit = async (draft: FeedbackFinalDraft) => {
    if (!user) return { error: new Error("não autenticado") };
    if (
      draft.nota_imersao === null ||
      draft.nota_profs === null ||
      draft.melhoria_entregas === null ||
      draft.nps_recomendacao === null
    ) {
      return { error: new Error("preencha as notas obrigatórias") };
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("hub_event_feedback_final")
      .insert({
        user_id: user.id,
        nota_imersao: draft.nota_imersao,
        nota_profs: draft.nota_profs,
        melhoria_entregas: draft.melhoria_entregas,
        nps_recomendacao: draft.nps_recomendacao,
        geral: draft.geral.trim() || null,
        mais_gostou: draft.mais_gostou.trim() || null,
        menos_gostou: draft.menos_gostou.trim() || null,
        conteudo_faltou: draft.conteudo_faltou.trim() || null,
        coracao_aberto: draft.coracao_aberto.trim() || null,
      })
      .select("id, created_at")
      .single();
    setSubmitting(false);
    if (!error) {
      setAlreadyAnswered(true);
      clearDraft();
      // invalida status pós-evento pra atualizar chips e próximo passo na hora
      queryClient.invalidateQueries({ queryKey: ["post-event-status"] });
    }
    return { error, data };
  };

  return {
    alreadyAnswered,
    submitting,
    submit,
    loadDraft,
    saveDraft,
    clearDraft,
  };
};
