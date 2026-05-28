import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useTutorSettings } from "@/hooks/useTutorSettings";
import { TutorUsageChip } from "@/components/chora-bot/TutorUsageChip";
import { TutorDisabledNotice } from "@/components/chora-bot/TutorDisabledNotice";
import { TutorMessageActions } from "@/components/chora-bot/TutorMessageActions";

type Msg = {
  role: "user" | "assistant";
  content: string;
  context?: { done: string[]; current: string | null } | null;
};

interface TutorChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailId: string;
  trailTitle: string;
  trailColor: string;
  pillContext?: { pillTitle: string; pillPrompt: string } | null;
  /**
   * id do módulo atual em que o aluno está. usado pelo tutor pra saber
   * quais pílulas dessa sessão já foram concluídas e não explicar de novo
   * o que ele acabou de ver.
   */
  moduleId?: string | null;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-trail-chat`;

export const TutorChat = ({
  open,
  onOpenChange,
  trailId,
  trailTitle,
  trailColor,
  pillContext,
  moduleId,
}: TutorChatProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: snapshot } = useEletivaProgress();
  const { data: tutorSettings } = useTutorSettings();
  const tutorEnabled = tutorSettings?.enabled !== false;

  // resumo da trilha atual: módulos concluídos + módulo em andamento
  const buildTrailContext = (): { done: string[]; current: string | null } => {
    if (!snapshot) return { done: [], current: null };
    const trailModules = snapshot.modules
      .filter((m) => m.trail_id === trailId)
      .sort((a, b) => a.number - b.number);
    const done = trailModules
      .filter((m) => snapshot.progressByModuleId[m.id]?.completed_at)
      .map((m) => `m${String(m.number).padStart(2, "0")} · ${m.title.toLowerCase()}`);
    const currentMod = trailModules.find(
      (m) =>
        snapshot.unlockedModuleIds.has(m.id) &&
        !snapshot.progressByModuleId[m.id]?.completed_at,
    );
    const current = currentMod
      ? `m${String(currentMod.number).padStart(2, "0")} · ${currentMod.title.toLowerCase()}`
      : null;
    return { done, current };
  };

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
    if (open) {
      setMessages(stored ?? []);
      setErrorMsg(null);
      setLastFailedText(null);
    }
  }, [open, stored]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const runSend = async (text: string) => {
    if (!text || streaming) return;
    setErrorMsg(null);
    setLastFailedText(null);
    setStreaming(true);

    // snapshot pra reverter em caso de falha
    const baseMessages = messages;
    const ctx = buildTrailContext();
    // empurra user + bolha vazia do assistant (mostra contexto + "pensando...")
    setMessages([
      ...baseMessages,
      { role: "user", content: text },
      { role: "assistant", content: "", context: ctx },
    ]);

    let assistantSoFar = "";
    let receivedAny = false;
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      receivedAny = true;
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

    const failWith = (msg: string) => {
      setErrorMsg(msg);
      setLastFailedText(text);
      // remove a bolha vazia do assistant E a do user (devolve input pro usuário via retry)
      setMessages(baseMessages);
      setInput(text);
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
        body: JSON.stringify({
          trail_id: trailId,
          message: text,
          pill_prompt: pillContext?.pillPrompt ?? null,
          pill_title: pillContext?.pillTitle ?? null,
          module_id: moduleId ?? null,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        let parsed: { error?: string } = {};
        try {
          parsed = JSON.parse(errText);
        } catch {
          // não json
        }
        let msg = parsed.error ?? "deu ruim ao falar com o tutor.";
        if (resp.status === 429) msg = "muitas perguntas em sequência. respira uns segundos e tenta de novo.";
        else if (resp.status === 402) msg = "créditos da ia esgotaram. avisa a equipe da escola.";
        else if (resp.status === 401) msg = "sua sessão caiu. faz login de novo.";
        toast.error(msg);
        failWith(msg);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      const processLine = (rawLine: string) => {
        let line = rawLine;
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return;
        if (!line.startsWith("data: ")) return;
        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          done = true;
          return;
        }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsertAssistant(content);
        } catch {
          // JSON parcial — ignora silenciosamente, próximo chunk completa
        }
      };

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          processLine(line);
          if (done) break;
        }
      }
      // flush leftover sem newline
      if (buffer.trim()) processLine(buffer);

      if (!receivedAny) {
        const msg = "o tutor não devolveu resposta. tenta de novo.";
        toast.error(msg);
        failWith(msg);
        return;
      }

      // invalida cache pra próxima abertura puxar do banco
      queryClient.invalidateQueries({ queryKey: ["tutor-conv", user?.id, trailId] });
    } catch (e) {
      console.error("[tutor-chat]", e);
      const msg = "conexão caiu. tenta de novo.";
      toast.error(msg);
      failWith(msg);
    } finally {
      setStreaming(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await runSend(text);
  };

  const retry = async () => {
    if (!lastFailedText) return;
    const text = lastFailedText;
    setInput("");
    await runSend(text);
  };

  const clearConversation = async () => {
    if (!user || streaming || clearing) return;
    setClearing(true);
    try {
      // só zera se já existir registro; se não existe, nada a fazer
      const { error } = await supabase
        .from("tutor_conversations")
        .update({ messages: [], title: null })
        .eq("user_id", user.id)
        .eq("trail_id", trailId);
      if (error) throw error;
      setMessages([]);
      setInput("");
      setErrorMsg(null);
      setLastFailedText(null);
      queryClient.invalidateQueries({ queryKey: ["tutor-conv", user.id, trailId] });
      toast.success("conversa zerada. contexto do tutor reiniciado.");
    } catch (e) {
      console.error("[tutor-chat] clear", e);
      toast.error("não rolou limpar agora. tenta de novo.");
    } finally {
      setClearing(false);
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
                <EletivaSymbol size={20} pose="talking" />
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
            <div className="flex items-center gap-2">
              <TutorUsageChip />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={streaming || clearing || messages.length === 0}
                    className="rounded-full p-2 hover:bg-perestroika-preto/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="limpar conversa"
                    title="limpar conversa"
                  >
                    {clearing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-perestroika-bege border-2 border-perestroika-preto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display uppercase text-2xl">
                      zerar essa conversa?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-body text-perestroika-preto/75">
                      o histórico com o joão-de-barro nessa trilha vai sumir e o contexto reinicia
                      do zero. essa ação não tem volta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-body">cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void clearConversation()}
                      className="bg-perestroika-vermelho text-perestroika-bege hover:bg-perestroika-vermelho/90 font-body"
                    >
                      zerar conversa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 hover:bg-perestroika-preto/10"
                aria-label="fechar tutor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-body text-xs text-perestroika-preto/65 mt-2">
            conversando sobre <strong>{trailTitle.toLowerCase()}</strong>. seu histórico fica salvo.
          </p>
          {pillContext && (
            <div
              className="mt-3 rounded-xl border-2 px-3 py-2 font-body text-[11px] text-perestroika-preto/85 leading-relaxed"
              style={{ borderColor: trailColor, backgroundColor: `${trailColor}15` }}
            >
              <p className="uppercase tracking-[0.18em] text-[9px] text-perestroika-preto/55 mb-0.5">
                exercício em andamento
              </p>
              <p className="font-semibold">{pillContext.pillTitle.toLowerCase()}</p>
            </div>
          )}
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {!tutorEnabled && <TutorDisabledNotice />}
          {tutorEnabled && messages.length === 0 && !streaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-dashed border-perestroika-preto/25 p-5 text-sm text-perestroika-preto/70"
            >
              oi, eu sou o joão-de-barro, tutor dessa trilha da eletiva. pergunte qualquer coisa sobre os módulos,
              o desafio central ou o próximo passo. eu não entrego resposta pronta, mas ajudo você a destravar o raciocínio.
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                {m.role === "assistant" && m.context && (m.context.done.length > 0 || m.context.current) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-xl bg-perestroika-bege border border-dashed border-perestroika-preto/25 px-3 py-2 font-body text-[11px] text-perestroika-preto/65 leading-relaxed">
                      <p className="uppercase tracking-[0.18em] text-[9px] text-perestroika-preto/45 mb-1">
                        contexto do tutor
                      </p>
                      {m.context.done.length > 0 ? (
                        <p>
                          <span className="font-semibold text-perestroika-preto/75">
                            {m.context.done.length} módulo{m.context.done.length > 1 ? "s" : ""} concluído{m.context.done.length > 1 ? "s" : ""}:
                          </span>{" "}
                          {m.context.done.join(" · ")}
                        </p>
                      ) : (
                        <p className="text-perestroika-preto/55">nenhum módulo concluído ainda nessa trilha.</p>
                      )}
                      {m.context.current && (
                        <p className="mt-1">
                          <span className="font-semibold text-perestroika-preto/75">em andamento:</span>{" "}
                          {m.context.current}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
                <motion.div
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
                          <EletivaSymbol size={16} pose="thinking" />
                        </motion.span>
                        amassando o barro da resposta...
                      </span>
                    )}
                  </div>
                </motion.div>
                {m.role === "assistant" && m.content && !streaming && (
                  <div className="flex justify-start">
                    <TutorMessageActions
                      content={m.content}
                      trailId={trailId}
                      isLatest={i === messages.length - 1}
                    />
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>

        {errorMsg && (
          <div className="mx-4 mb-2 rounded-xl border-2 border-perestroika-vermelho bg-perestroika-vermelho/10 px-3 py-2.5 flex items-start gap-2">
            <p className="font-body text-xs text-perestroika-preto/85 flex-1">
              {errorMsg}
            </p>
            {lastFailedText && (
              <button
                type="button"
                onClick={() => void retry()}
                disabled={streaming}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-2.5 py-1 font-body text-[10px] uppercase tracking-wide hover:scale-105 active:scale-95 disabled:opacity-50 transition-transform"
              >
                <RefreshCw className="h-3 w-3" /> tentar de novo
              </button>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="px-4 pt-4 border-t border-perestroika-preto/15 bg-perestroika-bege"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {!streaming && (messages.length === 0 || !!pillContext) && (
            <div
              className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="atalhos de pergunta"
            >
              {[
                pillContext ? "explica essa pílula de novo, mais simples" : "explica de novo, mais simples",
                "me dá um exemplo prático",
                "me questiona como um professor faria",
                "resume isso em 3 bullets",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void runSend(chip)}
                  disabled={streaming}
                  className="shrink-0 rounded-full border border-perestroika-preto/25 bg-white/60 px-3 py-1.5 font-body text-[11px] text-perestroika-preto/85 hover:bg-perestroika-preto hover:text-perestroika-bege hover:border-perestroika-preto transition-colors disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
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
              placeholder={streaming ? "joão-de-barro está pensando..." : "pergunte o que travou..."}
              rows={1}
              maxLength={2000}
              disabled={streaming}
              aria-busy={streaming}
              className="flex-1 resize-none bg-transparent border-0 outline-none font-body text-sm placeholder:text-perestroika-preto/40 max-h-32 px-2 py-1.5 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="shrink-0 rounded-full bg-perestroika-preto text-perestroika-bege p-2.5 disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform"
              aria-label={streaming ? "aguardando resposta" : "enviar"}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-perestroika-preto/40 mt-1.5 px-1">
            {streaming ? "esperando o tutor terminar..." : "shift + enter pra quebrar linha"}
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
};
