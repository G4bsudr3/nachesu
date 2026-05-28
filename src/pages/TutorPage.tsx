import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
import { BotMessage } from "@/components/chora-bot/BotMessage";
import { UserMessage } from "@/components/chora-bot/UserMessage";
import { TutorUsageChip } from "@/components/chora-bot/TutorUsageChip";
import { TutorDisabledNotice } from "@/components/chora-bot/TutorDisabledNotice";
import { TutorMessageActions } from "@/components/chora-bot/TutorMessageActions";
import { TutorStarterPrompts } from "@/components/chora-bot/TutorStarterPrompts";
import { useTutorSettings } from "@/hooks/useTutorSettings";


type Msg = { role: "user" | "assistant"; content: string; safety?: boolean };
type TrailRow = {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
  course_slug: string;
  course_title: string;
};

const MIN = 2;
const MAX = 2000;
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-trail-chat`;

/**
 * página unificada do tutor IA (fase 5).
 * substitui o antigo ChoraBot.tsx: usa o mesmo backend `tutor-trail-chat`
 * que o TutorChat dentro do módulo, então o histórico é único por trilha.
 * o estudante pode trocar de trilha sem perder a conversa de cada uma.
 */
const TutorPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug } = useActiveEletiva();
  const { data: tutorSettings } = useTutorSettings();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [trailId, setTrailId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // trilhas das eletivas em que o aluno está matriculado
  const courseIds = useMemo(
    () => (enrollments ?? []).map((e) => e.course_id),
    [enrollments],
  );

  const { data: trails } = useQuery({
    queryKey: ["tutor-trails", courseIds.sort().join(",")],
    enabled: courseIds.length > 0,
    queryFn: async (): Promise<TrailRow[]> => {
      const { data, error } = await supabase
        .from("trails")
        .select("id, title, order_index, course_id, course:courses(slug, title)")
        .in("course_id", courseIds)
        .order("order_index");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        order_index: t.order_index,
        course_id: t.course_id,
        course_slug: t.course?.slug ?? "",
        course_title: t.course?.title ?? "eletiva",
      }));
    },
  });

  // resolve trilha ativa: pega 1ª trilha da eletiva ativa, ou 1ª disponível
  useEffect(() => {
    if (trailId || !trails || trails.length === 0) return;
    const fromActive = activeSlug
      ? trails.find((t) => t.course_slug === activeSlug)
      : null;
    setTrailId((fromActive ?? trails[0]).id);
  }, [trails, activeSlug, trailId]);

  // pré-prompt da query string
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

  // carrega conversa da trilha ativa
  const { data: storedConv } = useQuery({
    queryKey: ["tutor-conv", user?.id, trailId],
    enabled: !!user && !!trailId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_conversations")
        .select("messages")
        .eq("user_id", user!.id)
        .eq("trail_id", trailId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.messages ?? []) as Msg[];
    },
  });

  useEffect(() => {
    setMessages(
      (storedConv ?? []).filter((m) => m.role === "user" || m.role === "assistant"),
    );
  }, [storedConv, trailId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  const activeTrail = useMemo(
    () => trails?.find((t) => t.id === trailId) ?? null,
    [trails, trailId],
  );

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

  const send = async (rawText?: string) => {
    if (streaming || !trailId) return;
    const text = (rawText ?? input).trim();
    if (text.length < MIN) {
      textareaRef.current?.focus();
      return;
    }
    if (text.length > MAX) {
      toast.error(`máximo ${MAX} caracteres`);
      return;
    }
    if (!rawText) setInput("");

    const base = messages;
    setMessages([...base, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) throw new Error("sua sessão caiu, faz login de novo");

      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ trail_id: trailId, message: text }),
      });

      if (!resp.ok || !resp.body) {
        const body = await resp.json().catch(() => ({}));
        let msg = body.error || "deu ruim ao falar com o tutor.";
        if (resp.status === 429) msg = "muitas perguntas em sequência. respira uns segundos.";
        else if (resp.status === 402) msg = "créditos da ia esgotaram. avisa a equipe da escola.";
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
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
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
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
            // chunk parcial — ignora
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["tutor-conv", user?.id, trailId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "erro");
      setMessages(base);
      if (!rawText) setInput(text);
    } finally {
      setStreaming(false);
    }
  };

  const clearConversation = async () => {
    if (!user || !trailId || streaming) return;
    try {
      const { error } = await supabase
        .from("tutor_conversations")
        .update({ messages: [], title: null })
        .eq("user_id", user.id)
        .eq("trail_id", trailId);
      if (error) throw error;
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["tutor-conv", user.id, trailId] });
      toast.success("conversa zerada");
    } catch {
      toast.error("não consegui limpar agora");
    }
  };

  const canSend = !streaming && input.trim().length >= MIN && !!trailId;

  // sem matrículas: redireciona pra dashboard
  if (enrollments && enrollments.length === 0) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display uppercase text-4xl mb-3">tutor IA</h1>
        <p className="max-w-md text-perestroika-preto/70 mb-6 font-body">
          o tutor conversa por trilha. você ainda não está em nenhuma eletiva.
        </p>
        <Button asChild className="bg-perestroika-preto text-perestroika-bege">
          <Link to="/app">voltar pro dashboard</Link>
        </Button>
      </div>
    );
  }

  // agrupa trilhas por curso pra dropdown
  const trailsByCourse = useMemo(() => {
    const m = new Map<string, { title: string; trails: TrailRow[] }>();
    (trails ?? []).forEach((t) => {
      const cur = m.get(t.course_id) ?? { title: t.course_title, trails: [] };
      cur.trails.push(t);
      m.set(t.course_id, cur);
    });
    return Array.from(m.values());
  }, [trails]);

  return (
    <div className="h-[calc(100dvh-var(--mobile-nav-h,0px))] bg-perestroika-bege flex flex-col overflow-hidden">
      <header className="border-b border-perestroika-preto/10 px-4 py-3 flex items-center justify-between bg-perestroika-bege sticky top-0 z-10">
        <Link
          to="/app"
          aria-label="voltar"
          className="flex items-center gap-2 text-xs font-display uppercase tracking-[0.2em] text-perestroika-preto/70 hover:text-perestroika-preto transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          voltar
        </Link>
        <span className="font-display uppercase tracking-[0.15em] text-base sm:text-lg text-perestroika-preto">
          tutor ia
        </span>
        <div className="flex items-center gap-2">
          <TutorUsageChip />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={streaming || messages.length === 0}
                aria-label="limpar conversa"
                title="limpar conversa"
                className="w-9 h-9 rounded-full flex items-center justify-center text-perestroika-preto/70 hover:text-perestroika-preto hover:bg-perestroika-preto/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
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
        </div>
      </header>

      {/* trail switcher */}
      {activeTrail && trails && trails.length > 1 && (
        <div className="px-4 py-2 border-b border-perestroika-preto/5 bg-perestroika-bege flex justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 bg-white/60 px-3 py-1.5 font-body text-xs text-perestroika-preto/80 hover:border-perestroika-preto/40 transition-colors"
              >
                <span className="opacity-60">trilha</span>
                <span className="font-semibold lowercase">{activeTrail.title}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="bg-perestroika-bege border-perestroika-preto/20 p-2 w-64">
              {trailsByCourse.map((group, gi) => (
                <div key={gi} className={gi > 0 ? "mt-2 pt-2 border-t border-perestroika-preto/10" : ""}>
                  <p className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-perestroika-preto/55">
                    {group.title.toLowerCase()}
                  </p>
                  {group.trails.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTrailId(t.id)}
                      className={`w-full text-left rounded-md px-2 py-1.5 font-body text-sm lowercase hover:bg-perestroika-preto/5 transition-colors ${
                        t.id === trailId ? "bg-perestroika-preto/5 font-semibold" : ""
                      }`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              ))}
            </PopoverContent>
          </Popover>

        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
          {tutorSettings && !tutorSettings.enabled ? (
            <div className="max-w-2xl mx-auto py-12">
              <TutorDisabledNotice />
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center py-12 gap-5">
              <p className="font-body text-perestroika-preto/60 text-center text-base sm:text-lg leading-relaxed">
                {activeTrail
                  ? `oi, eu sou o joão-de-barro. conversando sobre ${activeTrail.title.toLowerCase()}. manda sua dúvida.`
                  : "carregando trilha..."}
              </p>
              {activeTrail && (
                <TutorStarterPrompts onPick={(t) => void send(t)} />
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                if (m.role === "user") {
                  return <UserMessage key={i} content={m.content} initials={userInitials} />;
                }
                const isLastAssistant =
                  isLast || (i === messages.length - 2 && messages[messages.length - 1]?.role === "user");
                return (
                  <div key={i}>
                    <BotMessage content={m.content} streaming={streaming && isLast} />
                    {!streaming && m.content && trailId && (
                      <TutorMessageActions
                        content={m.content}
                        trailId={trailId}
                        isLatest={isLastAssistant}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>



        <div className="border-t border-perestroika-preto/10 px-4 py-3 md:px-6 md:py-4 bg-perestroika-bege">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege focus-within:border-perestroika-preto/40 transition-colors p-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={
                  streaming
                    ? "joão-de-barro está pensando..."
                    : "mande sua dúvida..."
                }
                rows={1}
                maxLength={MAX}
                aria-label="pergunta pro tutor ia"
                disabled={streaming || !trailId}
                className="resize-none min-h-[44px] max-h-32 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-body text-perestroika-preto placeholder:text-perestroika-preto/40 px-2"
              />
              <button
                onClick={() => void send()}
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
                    className={`w-4 h-4 ${canSend ? "text-perestroika-bege" : "text-perestroika-preto/40"}`}
                  />
                )}
              </button>
            </div>
            <p className="text-[10px] text-perestroika-preto/40 mt-1.5 px-1 text-center">
              shift + enter pra quebrar linha · histórico fica salvo por trilha
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TutorPage;
