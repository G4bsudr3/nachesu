import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TutorMessageActionsProps {
  content: string;
  trailId: string;
  /** true se essa é a resposta mais recente (única que pode receber rating) */
  isLatest: boolean;
}

type ReasonKey = "confuso" | "fora_do_tema" | "longo_demais" | "errado" | "nao_ajudou";
const REASON_LABELS: Record<ReasonKey, string> = {
  confuso: "confuso",
  fora_do_tema: "fora do tema",
  longo_demais: "longo demais",
  errado: "errado",
  nao_ajudou: "não ajudou",
};

export const TutorMessageActions = ({ content, trailId, isLatest }: TutorMessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [sending, setSending] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [chosenReason, setChosenReason] = useState<ReasonKey | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("não consegui copiar");
    }
  };

  const callRate = async (val: 1 | -1 | null, reason: ReasonKey | null) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-rate-message`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ trail_id: trailId, helpful: val, reason }),
    });
    if (!resp.ok) throw new Error(await resp.text());
  };

  const rate = async (val: 1 | -1) => {
    if (sending || !isLatest) return;
    setSending(true);
    const next = rating === val ? null : val;
    const prev = rating;
    setRating(next);
    try {
      await callRate(next, null);
      if (next === -1) setShowReasons(true);
      else setShowReasons(false);
    } catch {
      setRating(prev);
      toast.error("não consegui registrar tua avaliação");
    } finally {
      setSending(false);
    }
  };

  const pickReason = async (r: ReasonKey) => {
    if (sending) return;
    setSending(true);
    setChosenReason(r);
    try {
      await callRate(-1, r);
      setShowReasons(false);
      toast.success("valeu, isso ajuda a melhorar o tutor.");
    } catch {
      setChosenReason(null);
      toast.error("não consegui salvar o motivo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "resposta copiada" : "copiar resposta"}
          className="p-1.5 rounded-xl hover:bg-perestroika-preto/5 text-perestroika-preto/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        {isLatest && (
          <>
            <button
              type="button"
              onClick={() => rate(1)}
              disabled={sending}
              aria-pressed={rating === 1}
              aria-label="resposta útil"
              className={`p-1.5 rounded-md hover:bg-perestroika-preto/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                rating === 1 ? "text-primary" : "text-perestroika-preto/70"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => rate(-1)}
              disabled={sending}
              aria-pressed={rating === -1}
              aria-label="resposta ruim"
              className={`p-1.5 rounded-md hover:bg-perestroika-preto/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                rating === -1 ? "text-destructive" : "text-perestroika-preto/70"
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <AnimatePresence>
        {isLatest && showReasons && rating === -1 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 flex flex-wrap gap-1.5"
            role="group"
            aria-label="por que essa resposta não ajudou?"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55 mr-1 self-center">
              o que rolou?
            </span>
            {(Object.keys(REASON_LABELS) as ReasonKey[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={sending}
                onClick={() => pickReason(key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-body border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  chosenReason === key
                    ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                    : "bg-transparent text-perestroika-preto/70 border-perestroika-preto/15 hover:bg-perestroika-preto/5"
                }`}
              >
                {REASON_LABELS[key]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
