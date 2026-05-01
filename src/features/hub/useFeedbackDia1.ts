import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EVENT_DAY = "dia-1";
const DISMISS_KEY = "chora:feedback-d1-dismissed";
const SESSION_KEY = "chora:feedback-d1-session-dismissed";

export interface FeedbackDia1Input {
  experiencia: string;
  poderia_ser_diferente: string;
  algo_que_amou: string;
}

export const useFeedbackDia1 = () => {
  const { user } = useAuth();
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
        .from("hub_event_feedback")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_day", EVENT_DAY)
        .maybeSingle();
      if (!cancelled) setAlreadyAnswered(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dismissedPermanent = typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
  const dismissedSession = typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";

  const shouldShow = !!user && alreadyAnswered === false && !dismissedPermanent && !dismissedSession;

  const dismissPermanent = () => {
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const dismissSession = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  const submit = async (input: FeedbackDia1Input) => {
    if (!user) return { error: new Error("não autenticado") };
    setSubmitting(true);
    const { error } = await supabase.from("hub_event_feedback").insert({
      user_id: user.id,
      event_day: EVENT_DAY,
      experiencia: input.experiencia.trim() || null,
      poderia_ser_diferente: input.poderia_ser_diferente.trim() || null,
      algo_que_amou: input.algo_que_amou.trim() || null,
    });
    setSubmitting(false);
    if (!error) {
      setAlreadyAnswered(true);
      localStorage.setItem(DISMISS_KEY, "1");
    }
    return { error };
  };

  return { shouldShow, submitting, submit, dismissPermanent, dismissSession };
};
