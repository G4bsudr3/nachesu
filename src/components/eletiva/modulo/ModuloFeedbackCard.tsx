import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, User, MessageSquareReply, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentFeedback, markFeedbackSeen } from "@/features/hub/useStudentFeedback";
import { useDeliverableThread } from "@/features/hub/useDeliverableThread";
import { useRubricForModule } from "@/features/admin/useRubrics";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  moduleId: string | null;
  trailColor: string;
}

/**
 * card de feedback do educador no topo do módulo.
 * - renderiza feedback em markdown leve
 * - mostra histórico de rodadas
 * - aluno pode reabrir entrega quando status = 'ajuste'
 * - aluno pode responder ao educador (thread)
 * - marca recibo de leitura quando entra no viewport
 */
export const ModuloFeedbackCard = ({ moduleId, trailColor }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { feedbacks } = useStudentFeedback({ moduleId });
  const fb = feedbacks[0] ?? null;
  const { data: rubric } = useRubricForModule(moduleId);
  const rawScore = (fb as unknown as { score?: number | null } | null)?.score;
  const score = typeof rawScore === "number" && Number.isFinite(rawScore) ? rawScore : null;
  const scoreMax =
    rubric && typeof rubric.score_max === "number" && rubric.score_max > 0 ? rubric.score_max : null;
  const showScore =
    !!fb && score !== null && !!rubric && rubric.score_type === "numeric" && scoreMax !== null;
  const cardRef = useRef<HTMLElement | null>(null);
  const [reply, setReply] = useState("");
  const [showReply, setShowReply] = useState(false);

  const { messages, send, sending, markRead } = useDeliverableThread(fb?.id);

  useEffect(() => {
    if (!fb) return;
    const t = setTimeout(() => markFeedbackSeen(fb.id, fb.reviewed_at), 1500);
    return () => clearTimeout(t);
  }, [fb]);

  // recibo de leitura: marca em content.feedback_read_at quando card entra no viewport
  useEffect(() => {
    if (!fb || !cardRef.current) return;
    const content = (fb.content ?? {}) as Record<string, unknown>;
    const alreadyRead = !!content.feedback_read_at;
    if (alreadyRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const nextContent = { ...content, feedback_read_at: new Date().toISOString() };
            void supabase
              .from("module_deliverables")
              .update({ content: nextContent as never })
              .eq("id", fb.id);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [fb]);

  useEffect(() => {
    if (fb) markRead();
  }, [fb, markRead, messages.length]);

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!fb || !user) throw new Error("sem contexto");
      const { error } = await supabase
        .from("module_deliverables")
        .update({ status: "rascunho", submitted_at: null })
        .eq("id", fb.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("entrega reaberta. edite as respostas e envie de novo.");
      qc.invalidateQueries({ queryKey: ["student-feedback"] });
      qc.invalidateQueries({ queryKey: ["module-deliverable-status"] });
      // rola pra cima pra pessoa ver as pílulas pra editar
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const text = reply.trim();
      if (text.length < 1) throw new Error("escreve uma resposta");
      await send(text);
    },
    onSuccess: () => {
      setReply("");
      setShowReply(false);
      toast.success("mensagem enviada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!fb) return null;

  const content = (fb.content ?? {}) as Record<string, unknown>;
  const verdict = (content.review_verdict ?? null) as "aprovado" | "ajustar" | null;
  const tags = (content.review_tags ?? []) as string[];
  const isAjuste = fb.status === "ajuste";

  return (
    <section
      ref={cardRef}
      id="feedback-do-educador"
      aria-label="feedback do educador"
      className="rounded-2xl border-2 p-5 sm:p-6 mb-6 scroll-mt-24 transition-shadow"
      style={{ borderColor: trailColor, backgroundColor: `${trailColor}10` }}
    >
      <div className="flex items-center gap-2 mb-3">
        {isAjuste || verdict === "ajustar" ? (
          <AlertCircle className="w-4 h-4" style={{ color: trailColor }} />
        ) : (
          <CheckCircle2 className="w-4 h-4" style={{ color: trailColor }} />
        )}
        <p
          className="font-body text-[11px] uppercase tracking-[0.2em]"
          style={{ color: trailColor }}
        >
          {isAjuste
            ? "ajuste solicitado"
            : verdict === "aprovado"
              ? "aprovado"
              : "revisado"}
        </p>
        {fb.reviewer_name && (
          <span className="inline-flex items-center gap-1 ml-auto text-[11px] uppercase tracking-wide text-perestroika-preto/55">
            <User className="w-3 h-3" /> {fb.reviewer_name}
          </span>
        )}
      </div>
      <h3 className="font-display uppercase text-xl sm:text-2xl mb-2 leading-tight">
        feedback do educador
      </h3>
      {showScore && (
        <div
          className="inline-flex items-baseline gap-1 rounded-full px-3 py-1 mb-3 font-display"
          style={{ backgroundColor: `${trailColor}20`, color: trailColor }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">nota</span>
          <span className="text-lg leading-none">{score}</span>
          <span className="text-xs leading-none opacity-70">/ {rubric?.score_max ?? 10}</span>
        </div>
      )}
      {fb.feedback ? (
        <FeedbackMarkdown>{fb.feedback}</FeedbackMarkdown>
      ) : isAjuste ? (
        <p className="font-body text-sm text-perestroika-preto/70 italic">
          o educador pediu um ajuste mas ainda não escreveu o detalhe. vai detalhar
          em breve por aqui.
        </p>
      ) : null}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-perestroika-preto/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wide"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {isAjuste && (
        <div className="mt-5 rounded-xl bg-white/60 border border-perestroika-preto/15 p-4">
          <p className="font-body text-sm mb-3 text-perestroika-preto/80">
            quando estiver pronto, ajuste sua entrega e reenvie pro educador conferir.
          </p>
          <button
            type="button"
            onClick={() => reopenMutation.mutate()}
            disabled={reopenMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 min-h-[40px]"
          >
            {reopenMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            revisar e reenviar
          </button>
        </div>
      )}

      {/* thread */}
      {(messages.length > 0 || showReply) && (
        <div className="mt-5 border-t border-perestroika-preto/15 pt-4">
          {messages.length > 0 && (
            <ul className="space-y-2.5 mb-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl p-3 ${
                    m.author_role === "educator"
                      ? "bg-white/70 border border-perestroika-preto/15"
                      : "bg-perestroika-preto/5 border border-perestroika-preto/15"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-perestroika-preto/55">
                      {m.author_role === "educator" ? (m.author_name ?? "educador") : "você"}
                    </span>
                    <span className="text-[10px] text-perestroika-preto/40">
                      {new Date(m.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <FeedbackMarkdown>{m.body_md}</FeedbackMarkdown>
                </li>
              ))}
            </ul>
          )}
          {showReply ? (
            <div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value.slice(0, 4000))}
                placeholder="escreva sua resposta..."
                rows={3}
                className="bg-white/70 border-perestroika-preto/20 font-body text-sm"
                autoFocus
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-perestroika-preto/40">{reply.length}/4000</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReply(false);
                      setReply("");
                    }}
                    className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto px-3 py-2"
                  >
                    cancelar
                  </button>
                  <button
                    type="button"
                    disabled={sending || replyMutation.isPending || reply.trim().length < 1}
                    onClick={() => replyMutation.mutate()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-[11px] uppercase tracking-wide disabled:opacity-50 min-h-[36px]"
                  >
                    {sending || replyMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    enviar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!showReply && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowReply(true)}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/65 hover:text-perestroika-preto"
          >
            <MessageSquareReply className="w-3.5 h-3.5" />
            {messages.length > 0 ? "responder" : "tirar dúvida com o educador"}
          </button>
        </div>
      )}
    </section>
  );
};
