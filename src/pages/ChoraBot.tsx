import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUp, Loader2, Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { BotAvatar } from "@/components/chora-bot/BotAvatar";
import { BotCard } from "@/components/chora-bot/BotCard";
import { BotMessage } from "@/components/chora-bot/BotMessage";
import { UserMessage } from "@/components/chora-bot/UserMessage";
import { ToneChips } from "@/components/chora-bot/ToneChips";
import { DownloadConversation } from "@/components/chora-bot/DownloadConversation";
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

const SUGGESTIONS = [
  "como começo um projeto no Lovable?",
  "me explica o que é um prompt bom",
  "como faço deploy do meu projeto?",
  "me ajuda a destravar uma ideia",
];

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

  // tom do bot — persistido em localStorage entre sessões
  const [tone, setTone] = useState<ChoraBotTone>(() => {
    if (typeof window === "undefined") return "padrao";
    const stored = window.localStorage.getItem(TONE_STORAGE_KEY);
    return isChoraBotTone(stored) ? stored : "padrao";
  });

  const handleToneChange = (next: ChoraBotTone) => {
    setTone(next);
    try {
      window.localStorage.setItem(TONE_STORAGE_KEY, next);
    } catch {
      // localStorage indisponível (modo privado, etc) — silencia, vira só sessão atual
    }
  };

  // pré-preenche prompt vindo da landing page (?prompt=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("prompt");
    if (prefill) {
      setInput(prefill);
      // limpa o param da URL pra não repetir em refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.toString());
      // foca o textarea pro usuário só apertar enter
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, []);

  // settings
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

  // conversations list
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

  // load messages of active
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

  const newConv = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chora_bot_conversations")
      .insert({ user_id: user.id, title: "nova conversa" })
      .select("id, title, updated_at, is_favorite")
      .single();
    if (error || !data) {
      toast.error("não consegui criar conversa");
      return;
    }
    setConvs((prev) => [data as Conv, ...prev]);
    setActiveId(data.id);
    setMessages([]);
  };

  const removeConv = async (id: string) => {
    if (!confirm("apagar essa conversa?")) return;
    await supabase.from("chora_bot_conversations").delete().eq("id", id);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    reloadConvs();
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
    // optimistic
    setConvs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_favorite: next } : c)),
    );
    const { error } = await supabase
      .from("chora_bot_conversations")
      .update({
        is_favorite: next,
        favorited_at: next ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error("não consegui salvar favorito");
      // rollback
      setConvs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_favorite: !next } : c)),
      );
      return;
    }
    toast.success(next ? "favoritada ★" : "removida dos favoritos");
  };

  const send = async () => {
    if (streaming) return;
    const text = input.trim();
    if (text.length === 0) {
      toast.error("escreve uma pergunta antes de mandar");
      textareaRef.current?.focus();
      return;
    }
    if (text.length < MIN_PROMPT_LENGTH) {
      toast.error("a pergunta tá curta demais, dá mais contexto");
      textareaRef.current?.focus();
      return;
    }
    if (text.length > MAX_PROMPT_LENGTH) {
      toast.error(`máximo ${MAX_PROMPT_LENGTH} caracteres, quebra em partes menores`);
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

      // append empty assistant
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

  // iniciais do user pra mostrar nos balões
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
      <div className="min-h-screen bg-perestroika-bege flex flex-col items-center justify-center px-6 text-center">
        <BotCard size="hero" tilt className="mb-8 mx-auto" />
        <h1 className="font-display uppercase text-5xl sm:text-7xl leading-none mb-4">
          até logo
        </h1>
        <p className="max-w-md text-perestroika-preto/70 mb-8 font-body">{closed}</p>
        <Button asChild className="bg-perestroika-preto text-perestroika-bege">
          <Link to="/app">voltar pro hub</Link>
        </Button>
      </div>
    );
  }

  const canSend = !streaming && input.trim().length >= MIN_PROMPT_LENGTH;

  return (
    <div className="min-h-screen bg-perestroika-bege flex flex-col">
      {/* header editorial — minimalista */}
      <header className="border-b border-perestroika-preto/10 px-4 py-3 flex items-center justify-between bg-perestroika-bege sticky top-0 z-10">
        <Link
          to="/app"
          className="flex items-center gap-2 text-xs font-display uppercase tracking-[0.2em] text-perestroika-preto/70 hover:text-perestroika-preto transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          hub
        </Link>
        <div className="flex items-center gap-2.5">
          <BotAvatar size={28} ring={false} />
          <span className="font-display uppercase tracking-[0.15em] text-lg sm:text-xl text-perestroika-preto">
            chŏra bot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <HistoryPanel
            activeId={activeId}
            convs={convs}
            refreshKey={messages.length}
            onOpen={(id) => setActiveId(id)}
            onDelete={removeConvNoConfirm}
            onToggleFavorite={toggleFavorite}
          />
          {messages.length > 0 && (
            <DownloadConversation
              messages={messages}
              defaultTitle={
                convs.find((c) => c.id === activeId)?.title ||
                `tutor-ia ${new Date().toLocaleDateString("pt-BR")}`
              }
            />
          )}
          <ChoraLogo className="h-5 w-auto opacity-70 hidden lg:block" />
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-6xl w-full mx-auto">
        {/* sidebar de conversas */}
        <aside className="md:w-60 md:border-r border-b md:border-b-0 border-perestroika-preto/10 p-3 md:max-h-[calc(100vh-65px)] md:overflow-y-auto">
          <button
            onClick={newConv}
            className="w-full mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-perestroika-preto/15 hover:border-perestroika-preto/40 bg-perestroika-bege transition-colors group"
          >
            <span className="w-6 h-6 rounded-full bg-perestroika-preto text-perestroika-bege flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </span>
            <span className="font-display uppercase text-[11px] tracking-[0.2em] text-perestroika-preto/70 group-hover:text-perestroika-preto">
              nova conversa
            </span>
          </button>

          {convs.length > 0 && (
            <p className="px-2 mb-1.5 font-display uppercase text-[9px] tracking-[0.25em] text-perestroika-preto/40">
              últimas
            </p>
          )}
          <div className="space-y-0.5">
            {convs.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm font-body transition-colors ${
                  activeId === c.id
                    ? "bg-perestroika-preto text-perestroika-bege"
                    : "text-perestroika-preto/70 hover:bg-perestroika-preto/5 hover:text-perestroika-preto"
                }`}
                onClick={() => setActiveId(c.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(c.id, !c.is_favorite);
                  }}
                  aria-label={c.is_favorite ? "desfavoritar" : "favoritar"}
                  className={`shrink-0 transition-transform hover:scale-110 ${
                    c.is_favorite
                      ? "text-perestroika-laranja opacity-100"
                      : activeId === c.id
                      ? "text-perestroika-bege/40 hover:text-perestroika-bege opacity-0 group-hover:opacity-100"
                      : "text-perestroika-preto/30 hover:text-perestroika-preto opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={c.is_favorite ? "currentColor" : "none"}
                    strokeWidth={2}
                  />
                </button>
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeConv(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="apagar conversa"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10 space-y-5">
            {messages.length === 0 && (
              <div className="max-w-3xl mx-auto py-6">
                <div className="grid md:grid-cols-[auto,1fr] gap-8 md:gap-10 items-center">
                  <div className="flex justify-center">
                    <BotCard size="hero" tilt />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="font-display uppercase text-[10px] tracking-[0.3em] text-perestroika-preto/50 mb-3">
                      o sétimo arquétipo
                    </p>
                    <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] mb-4 text-perestroika-preto">
                      oi, eu sou
                      <br />
                      o chŏra bot.
                    </h1>
                    <p className="font-body text-perestroika-preto/80 mb-6 leading-relaxed">
                      {welcome || "tire suas dúvidas sobre o que rolou nas aulas. tô por aqui sempre."}
                    </p>
                    <div className="space-y-2">
                      <p className="font-display uppercase text-[10px] tracking-[0.25em] text-perestroika-preto/50">
                        começa por aqui
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setInput(s);
                              textareaRef.current?.focus();
                            }}
                            className="text-left text-sm font-body p-3 rounded-xl bg-perestroika-bege border border-perestroika-preto/10 hover:border-perestroika-preto/40 hover:bg-perestroika-preto/[0.03] transition-all text-perestroika-preto/80 hover:text-perestroika-preto"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
          </div>

          {/* input area */}
          <div className="border-t border-perestroika-preto/10 px-4 py-3 md:px-6 md:py-4 bg-perestroika-bege">
            <div className="max-w-3xl mx-auto space-y-3">
              <ToneChips value={tone} onChange={handleToneChange} />

              <div className="relative flex items-end gap-2 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege focus-within:border-perestroika-preto/40 transition-colors p-2">
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
                  aria-label="pergunta pro tutor IA"
                  className="resize-none min-h-[44px] max-h-32 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-body text-perestroika-preto placeholder:text-perestroika-preto/40 px-2"
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
                    <ArrowUp className={`w-4 h-4 ${canSend ? "text-perestroika-bege" : "text-perestroika-preto/40"}`} />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 px-1 text-[10px] font-body text-perestroika-preto/40">
                <span>enter envia · shift+enter quebra · ativo até 26.05.2026</span>
                <span
                  className={
                    input.length >= MAX_PROMPT_LENGTH * 0.9
                      ? "text-perestroika-vermelho font-medium tabular-nums"
                      : "tabular-nums"
                  }
                  aria-live="polite"
                >
                  {input.length}/{MAX_PROMPT_LENGTH}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChoraBot;
