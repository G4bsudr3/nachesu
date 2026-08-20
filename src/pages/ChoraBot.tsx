import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUp, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BotMessage } from "@/components/chora-bot/BotMessage";
import { UserMessage } from "@/components/chora-bot/UserMessage";
import { HistoryPanel } from "@/components/chora-bot/HistoryPanel";
import { toast } from "sonner";
import {
  TONE_STORAGE_KEY,
  isChoraBotTone,
  type ChoraBotTone,
} from "@/features/hub/choraBotTones";

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Conv = { id: string; title: string; updated_at: string; is_favorite: boolean };

const MIN_PROMPT_LENGTH = 2;
const MAX_PROMPT_LENGTH = 2000;

const ChoraBot = () => {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [closed, setClosed] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // tom preservado (persistido), mas sem UI: vai junto na request
  const [tone] = useState<ChoraBotTone>(() => {
    if (typeof window === "undefined") return "padrao";
    const stored = window.localStorage.getItem(TONE_STORAGE_KEY);
    return isChoraBotTone(stored) ? stored : "padrao";
  });

  // pré-preenche prompt vindo da landing page (?prompt=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("prompt");
    if (prefill) {
      setInput(prefill);
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.toString());
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, []);

  // settings (welcome + cutoff)
  useEffect(() => {
    supabase
      .from("chora_bot_settings")
      .select("welcome_message, cutoff_at, enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setWelcome(data.welcome_message);
        if (!data.enabled) setClosed("o tutor IA tá pausado agora.");
        else if (new Date(data.cutoff_at).getTime() < Date.now()) {
          setClosed("o tutor IA dormiu. mas tudo do curso continua aqui no hub.");
        }
      });
  }, []);

  const reloadConvs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chora_bot_conversations")
      .select("id, title, updated_at, is_favorite")
      .eq("user_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false });
    setConvs((data ?? []) as Conv[]);
  };

  useEffect(() => {
    reloadConvs();
  }, [user]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    supabase
      .from("chora_bot_messages")
      .select("id, role, content")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(
          (data ?? [])
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })),
        );
      });
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const newConv = () => {
    // simplesmente reseta a conversa ativa; a row real é criada no primeiro send
    setActiveId(null);
    setMessages([]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const removeConvNoConfirm = async (id: string) => {
    await supabase.from("chora_bot_conversations").delete().eq("id", id);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    reloadConvs();
  };

  const toggleFavorite = async (id: string, next: boolean) => {
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, is_favorite: next } : c)));
    const { error } = await supabase
      .from("chora_bot_conversations")
      .update({
        is_favorite: next,
        favorited_at: next ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error("não consegui salvar favorito");
      setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, is_favorite: !next } : c)));
      return;
    }
    toast.success(next ? "favoritada" : "removida dos favoritos");
  };

  const send = async () => {
    if (streaming) return;
    const text = input.trim();
    if (text.length < MIN_PROMPT_LENGTH) {
      textareaRef.current?.focus();
      return;
    }
    if (text.length > MAX_PROMPT_LENGTH) {
      toast.error(`máximo ${MAX_PROMPT_LENGTH} caracteres`);
      return;
    }
    setInput("");

    let convId = activeId;
    if (!convId) {
      if (!user) return;
      const { data } = await supabase
        .from("chora_bot_conversations")
        .insert({ user_id: user.id, title: text.slice(0, 60) })
        .select("id, title, updated_at, is_favorite")
        .single();
      if (!data) {
        toast.error("não consegui criar conversa");
        return;
      }
      convId = data.id;
      setActiveId(convId);
      setConvs((prev) => [data as Conv, ...prev]);
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("login expirou");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chora-bot-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ conversation_id: convId, message: text, tone }),
      });

      if (resp.status === 410) {
        const body = await resp.json();
        setClosed(body.message || "o tutor IA encerrou.");
        setStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "ia falhou");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantSoFar += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "erro");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      reloadConvs();
    }
  };

  const userInitials = (() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (meta.nickname as string | undefined) ||
      (meta.display_name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "vc";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLowerCase();
    return name.slice(0, 2).toLowerCase();
  })();

  if (closed) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-4">
          até logo
        </h1>
        <p className="max-w-md text-perestroika-preto/70 mb-8 font-body">{closed}</p>
        <Button asChild className="bg-perestroika-preto text-perestroika-bege">
          <Link to="/app">voltar</Link>
        </Button>
      </div>
    );
  }

  const canSend = !streaming && input.trim().length >= MIN_PROMPT_LENGTH;

  return (
    <div className="h-[calc(100dvh-var(--mobile-nav-h,0px))] bg-perestroika-bege flex flex-col overflow-hidden">
      {/* header mínimo: título · histórico · nova · voltar */}
      <header className="border-b border-perestroika-preto/15 px-4 py-3 flex items-center justify-between bg-perestroika-bege sticky top-0 z-10">
        <div className="flex items-center justify-start gap-1 flex-1">
          <Link
            to="/app"
            aria-label="voltar"
            className="flex items-center gap-2 text-[11px] font-display uppercase tracking-[0.2em] text-perestroika-preto/70 hover:text-perestroika-preto transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">voltar</span>
          </Link>
        </div>
        <span className="font-display uppercase tracking-[0.2em] text-base sm:text-lg text-perestroika-preto">
          tutor ia
        </span>
        <div className="flex items-center justify-end gap-1 flex-1">
          <HistoryPanel
            activeId={activeId}
            convs={convs}
            refreshKey={messages.length}
            onOpen={(id) => setActiveId(id)}
            onDelete={removeConvNoConfirm}
            onToggleFavorite={toggleFavorite}
          />
          <button
            onClick={newConv}
            aria-label="nova conversa"
            title="nova conversa"
            className="h-11 w-11 rounded-full flex items-center justify-center text-perestroika-preto/70 hover:text-perestroika-preto hover:bg-perestroika-preto/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* mensagens */}
      <main className="flex-1 flex flex-col min-w-0">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10"
        >
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex items-center justify-center py-12">
              <p className="font-body text-perestroika-preto/60 text-center text-base sm:text-lg leading-relaxed">
                {welcome || "manda sua dúvida que eu te ajudo."}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                if (m.role === "user") {
                  return <UserMessage key={i} content={m.content} initials={userInitials} />;
                }
                return (
                  <BotMessage
                    key={i}
                    content={m.content}
                    streaming={streaming && isLast && m.role === "assistant"}
                  />
                );
              })}
              {streaming && messages[messages.length - 1]?.role === "user" && (
                <BotMessage content="" streaming />
              )}
            </div>
          )}
        </div>

        {/* input minimalista */}
        <div className="border-t border-perestroika-preto/15 px-4 py-3 md:px-6 md:py-4 bg-perestroika-bege">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege focus-within:border-perestroika-preto/30 transition-colors p-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="mande sua dúvida..."
                rows={1}
                maxLength={MAX_PROMPT_LENGTH}
                aria-label="pergunta pro tutor ia"
                className="resize-none min-h-[44px] max-h-32 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-body text-perestroika-preto placeholder:text-perestroika-preto/60 px-2"
                disabled={streaming}
              />
              <button
                onClick={send}
                disabled={!canSend}
                aria-label="enviar pergunta"
                className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:scale-105 enabled:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                style={{
                  background: canSend
                    ? "linear-gradient(135deg, #fe7b02 0%, #fd4644 30%, #f756a6 60%, #6f77fc 100%)"
                    : "rgba(9,9,9,0.08)",
                }}
              >
                {streaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-perestroika-bege" />
                ) : (
                  <ArrowUp
                    className={`w-4 h-4 ${canSend ? "text-perestroika-bege" : "text-perestroika-preto/60"}`}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChoraBot;
