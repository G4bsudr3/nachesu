import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Msg = { role: "user" | "assistant"; content: string };

interface TutorChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailId: string;
  trailTitle: string;
  trailColor: string;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-trail-chat`;

export const TutorChat = ({
  open,
  onOpenChange,
  trailId,
  trailTitle,
  trailColor,
}: TutorChatProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // carrega histórico ao abrir
  const { data: stored } = useQuery({
    queryKey: ["tutor-conv", user?.id, trailId],
    enabled: open && !!user && !!trailId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_conversations")
        .select("messages")
        .eq("user_id", user!.id)
        .eq("trail_id", trailId)
        .maybeSingle();
      if (error) throw error;
      return (data?.messages ?? []) as Msg[];
    },
  });

  useEffect(() => {
    if (open) setMessages(stored ?? []);
  }, [open, stored]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ trail_id: trailId, message: text }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        let parsed: { error?: string } = {};
        try {
          parsed = JSON.parse(errText);
        } catch {
          // não json
        }
        if (resp.status === 429) {
          toast.error("muitas perguntas em sequência, respira e tenta de novo.");
        } else if (resp.status === 402) {
          toast.error("créditos da ia esgotaram. avisa a equipe.");
        } else {
          toast.error(parsed.error ?? "deu ruim ao falar com o tutor.");
        }
        // reverte msg do user
        setMessages(messages);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // invalida cache pra próxima abertura puxar do banco
      queryClient.invalidateQueries({ queryKey: ["tutor-conv", user?.id, trailId] });
    } catch (e) {
      console.error(e);
      toast.error("conexão caiu. tenta de novo.");
      setMessages(messages);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 bg-perestroika-bege text-perestroika-preto border-l-2 border-perestroika-preto flex flex-col"
      >
        <SheetHeader className="p-5 border-b border-perestroika-preto/15 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: trailColor }}
                aria-hidden="true"
              >
                <LagrimaGradient size={20} />
              </span>
              <div>
                <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                  tutor da trilha
                </p>
                <SheetTitle className="font-display uppercase text-xl leading-none mt-0.5">
                  joão-de-barro
                </SheetTitle>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 hover:bg-perestroika-preto/10"
              aria-label="fechar tutor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="font-body text-xs text-perestroika-preto/65 mt-2">
            conversando sobre <strong>{trailTitle.toLowerCase()}</strong>. seu histórico fica salvo.
          </p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !streaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-dashed border-perestroika-preto/25 p-5 text-sm text-perestroika-preto/70"
            >
              oi. eu sou o joão-de-barro, tutor dessa trilha. me pergunta qualquer coisa sobre os módulos,
              o problema central ou um próximo passo. eu não dou resposta pronta, mas destravo o seu raciocínio.
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 font-body text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-perestroika-preto text-perestroika-bege"
                      : "bg-white/70 border border-perestroika-preto/15"
                  }`}
                >
                  {m.content || (
                    <span className="inline-flex items-center gap-2 text-perestroika-preto/50">
                      <motion.span
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      >
                        <LagrimaGradient size={14} />
                      </motion.span>
                      pensando...
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="p-4 border-t border-perestroika-preto/15 bg-perestroika-bege"
        >
          <div className="flex items-end gap-2 rounded-2xl border-2 border-perestroika-preto bg-white/70 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="pergunta o que travou..."
              rows={1}
              maxLength={2000}
              disabled={streaming}
              className="flex-1 resize-none bg-transparent border-0 outline-none font-body text-sm placeholder:text-perestroika-preto/40 max-h-32 px-2 py-1.5"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="shrink-0 rounded-full bg-perestroika-preto text-perestroika-bege p-2.5 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
              aria-label="enviar"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-perestroika-preto/40 mt-1.5 px-1">
            shift + enter pra quebrar linha
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
};
