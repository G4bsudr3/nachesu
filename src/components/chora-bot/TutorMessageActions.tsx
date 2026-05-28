import { useState } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TutorMessageActionsProps {
  content: string;
  trailId: string;
  /** true se essa é a resposta mais recente (única que pode receber rating) */
  isLatest: boolean;
}

export const TutorMessageActions = ({ content, trailId, isLatest }: TutorMessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [sending, setSending] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("não consegui copiar");
    }
  };

  const rate = async (val: 1 | -1) => {
    if (sending || !isLatest) return;
    setSending(true);
    const next = rating === val ? null : val;
    setRating(next);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-rate-message`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ trail_id: trailId, helpful: next }),
      });
      if (!resp.ok) throw new Error(await resp.text());
    } catch {
      setRating(rating);
      toast.error("não consegui registrar tua avaliação");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-70 hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={copy}
        aria-label="copiar resposta"
        className="p-1.5 rounded-md hover:bg-perestroika-preto/5 text-perestroika-preto/70"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {isLatest && (
        <>
          <button
            type="button"
            onClick={() => rate(1)}
            disabled={sending}
            aria-label="resposta útil"
            className={`p-1.5 rounded-md hover:bg-perestroika-preto/5 ${
              rating === 1 ? "text-primary" : "text-perestroika-preto/70"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => rate(-1)}
            disabled={sending}
            aria-label="resposta ruim"
            className={`p-1.5 rounded-md hover:bg-perestroika-preto/5 ${
              rating === -1 ? "text-destructive" : "text-perestroika-preto/70"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
