import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
  MessageSquareReply,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DeliverableInbox } from "./usePendingDeliverables";
import { DeliverableAnswersList } from "./deliverableRendering/DeliverableAnswersList";
import { useExplicitPillProgress } from "./deliverableRendering/useExplicitPillProgress";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";
import { useDeliverableThread } from "@/features/hub/useDeliverableThread";
import { useRubricForModule } from "./useRubrics";

const FALLBACK_CHIPS = [
  { label: "clareza" },
  { label: "evidência forte" },
  { label: "aprofundar" },
  { label: "criatividade" },
  { label: "consistência" },
];

type Verdict = "aprovado" | "ajustar";

interface AiAnalysis {
  strengths: string[];
  gaps: string[];
  risk_note: string;
  suggested_verdict: Verdict;
  suggested_score: number | null;
  score_max: number;
  suggested_tags: string[];
}


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable: DeliverableInbox | null;
  /** navegação entre entregas da lista (opcional) */
  onPrev?: () => void;
  onNext?: () => void;
  /** posição "i de N" no header (opcional) */
  position?: { index: number; total: number };
}

interface ReviewHistoryEntry {
  submitted_at: string | null;
  reviewed_at: string;
  feedback: string | null;
  verdict: Verdict | null;
  tags: string[];
  reviewer_id: string | null;
}

export const FeedbackReviewDrawer = ({ open, onOpenChange, deliverable, onPrev, onNext, position }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [reply, setReply] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [replyDrafting, setReplyDrafting] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [aiConfirmOpen, setAiConfirmOpen] = useState(false);
  const [score, setScore] = useState<string>("");


  const { data: rubric } = useRubricForModule(deliverable?.module?.id ?? null);
  const chips: Array<{ label: string; description?: string }> =
    rubric?.criteria?.length ? rubric.criteria : FALLBACK_CHIPS;
  const usesScore = rubric?.score_type === "numeric";
  const scoreMax = rubric?.score_max ?? 10;

  const existingVerdict = useMemo(() => {
    const c = (deliverable?.content ?? {}) as Record<string, unknown>;
    return (c.review_verdict as Verdict | undefined) ?? null;
  }, [deliverable]);

  const feedbackReadAt = useMemo(() => {
    const c = (deliverable?.content ?? {}) as Record<string, unknown>;
    return (c.feedback_read_at as string | null) ?? null;
  }, [deliverable]);

  const history = useMemo(() => {
    const c = (deliverable?.content ?? {}) as Record<string, unknown>;
    return ((c.history as ReviewHistoryEntry[] | undefined) ?? []).slice().reverse();
  }, [deliverable]);

  const { messages, send, sending, markRead } = useDeliverableThread(deliverable?.id);

  useEffect(() => {
    if (!deliverable) return;
    setFeedback(deliverable.feedback ?? "");
    const c = (deliverable.content ?? {}) as Record<string, unknown>;
    setTags((c.review_tags as string[]) ?? []);
    setShowPreview(false);
    setReply("");
    const existingScore = (deliverable as unknown as { score?: number | null }).score;
    setScore(existingScore !== undefined && existingScore !== null ? String(existingScore) : "");
  }, [deliverable]);

  useEffect(() => {
    if (open && deliverable) markRead();
    // intencionalmente sem messages.length nas deps — markRead já é estável
    // e mensagens novas chegam via realtime do hook
  }, [open, deliverable, markRead]);

  const trimmedFeedback = feedback.trim();
  const feedbackValid = trimmedFeedback.length >= 5;
  const parsedScore = score.trim() === "" ? null : Number(score.replace(",", "."));
  const scoreInvalid =
    usesScore &&
    parsedScore !== null &&
    (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > scoreMax);

  const persistReview = async (verdict: Verdict) => {
    if (!deliverable || !user) throw new Error("sem contexto");
    if (!feedbackValid) throw new Error("escreve um feedback (mínimo 5 caracteres)");
    if (scoreInvalid) throw new Error(`nota precisa estar entre 0 e ${scoreMax}`);

    const currentContent = (deliverable.content ?? {}) as Record<string, unknown>;
    const prevHistory = (currentContent.history as ReviewHistoryEntry[] | undefined) ?? [];

    const newHistoryEntry: ReviewHistoryEntry | null = deliverable.reviewed_at
      ? {
          submitted_at: deliverable.submitted_at,
          reviewed_at: deliverable.reviewed_at,
          feedback: deliverable.feedback ?? null,
          verdict: (currentContent.review_verdict as Verdict | undefined) ?? null,
          tags: (currentContent.review_tags as string[] | undefined) ?? [],
          reviewer_id: deliverable.reviewer_id ?? null,
        }
      : null;

    const nextContent = {
      ...currentContent,
      review_verdict: verdict,
      review_tags: tags,
      feedback_read_at: null,
      history: newHistoryEntry ? [...prevHistory, newHistoryEntry] : prevHistory,
    };

    const nextStatus = verdict === "ajustar" ? "ajuste" : "revisado";
    const updatePayload: Record<string, unknown> = {
      feedback: trimmedFeedback,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      status: nextStatus,
      content: nextContent as never,
    };
    if (usesScore) updatePayload.score = parsedScore;

    const { error } = await supabase
      .from("module_deliverables")
      .update(updatePayload as never)
      .eq("id", deliverable.id);
    if (error) throw error;
  };

  const approveMutation = useMutation({
    mutationFn: () => persistReview("aprovado"),
    onSuccess: () => {
      toast.success("feedback enviado, estudante notificado");
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ajustarMutation = useMutation({
    mutationFn: () => persistReview("ajustar"),
    onSuccess: () => {
      toast.success("ajuste solicitado, estudante pode reabrir e re-enviar");
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reviewPending = approveMutation.isPending || ajustarMutation.isPending;

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!deliverable) throw new Error("sem contexto");
      const { error } = await supabase
        .from("module_deliverables")
        .update({ reviewed_at: null, reviewer_id: null, status: "enviado" })
        .eq("id", deliverable.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("revisão reaberta");
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
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
      toast.success("mensagem enviada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitDraftMutation = useMutation({
    mutationFn: async () => {
      if (!deliverable) throw new Error("sem contexto");
      const { error } = await supabase.rpc("admin_submit_deliverable", {
        p_id: deliverable.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("rascunho marcado como enviado, agora dá pra revisar");
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "falha ao marcar como enviado"),
  });

  const [unsubmitConfirmOpen, setUnsubmitConfirmOpen] = useState(false);
  const [unsubmitReason, setUnsubmitReason] = useState("");
  const unsubmitDraftMutation = useMutation({
    mutationFn: async () => {
      if (!deliverable) throw new Error("sem contexto");
      const { error } = await supabase.rpc("admin_unsubmit_deliverable", {
        p_id: deliverable.id,
        p_reason: unsubmitReason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("envio desfeito, entrega voltou pra rascunho");
      setUnsubmitConfirmOpen(false);
      setUnsubmitReason("");
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "falha ao desfazer envio"),
  });


  const toggleTag = (tag: string) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

  const handleAnalyzeWithAI = async () => {
    if (!deliverable) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-deliverable-feedback", {
        body: { deliverable_id: deliverable.id, mode: "analysis" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const a = data as AiAnalysis;
      setAnalysis({
        strengths: a.strengths ?? [],
        gaps: a.gaps ?? [],
        risk_note: a.risk_note ?? "",
        suggested_verdict: a.suggested_verdict === "ajustar" ? "ajustar" : "aprovado",
        suggested_score: a.suggested_score ?? null,
        score_max: a.score_max ?? 10,
        suggested_tags: a.suggested_tags ?? [],
      });
      setTags((cur) => Array.from(new Set([...cur, ...(a.suggested_tags ?? [])])));
      toast.success("análise pronta, a decisão continua sua");
    } catch (e: any) {
      toast.error(e.message ?? "falha ao analisar entrega");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDraftReplyWithAI = async () => {
    if (!deliverable) return;
    setReplyDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-deliverable-feedback", {
        body: { deliverable_id: deliverable.id, mode: "reply" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const draft = (data as any)?.draft_md as string | undefined;
      if (!draft) throw new Error("rascunho vazio");
      setReply(draft.slice(0, 4000));
      toast.success("rascunho de resposta pronto, edita antes de enviar");
    } catch (e: any) {
      toast.error(e.message ?? "falha ao rascunhar resposta");
    } finally {
      setReplyDrafting(false);
    }
  };

  const handleDraftWithAI = async () => {

    if (!deliverable) return;
    setAiConfirmOpen(false);
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-deliverable-feedback", {
        body: { deliverable_id: deliverable.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const draft = (data as any)?.draft_md as string | undefined;
      const suggested = ((data as any)?.suggested_tags as string[] | undefined) ?? [];
      if (!draft) throw new Error("rascunho vazio");
      setFeedback(draft);
      setTags((cur) => {
        const merged = new Set([...cur, ...suggested]);
        return Array.from(merged);
      });
      setShowPreview(true);
      toast.success("rascunho gerado, revisa e ajusta antes de enviar");
    } catch (e: any) {
      toast.error(e.message ?? "falha ao gerar rascunho");
    } finally {
      setDrafting(false);
    }
  };

  if (!deliverable) return null;
  const studentName =
    deliverable.profile?.display_name ?? deliverable.profile?.nickname ?? "estudante";
  const moduleLabel = deliverable.module
    ? `módulo ${String(deliverable.module.number).padStart(2, "0")} · ${deliverable.module.title}`
    : "módulo";
  const alreadyReviewed = !!deliverable.reviewed_at;
  const isDraft = deliverable.submitted_at === null && deliverable.status === "rascunho";
  const statusLabel = isDraft
    ? "rascunho (ainda não enviado)"
    : deliverable.status === "ajuste"
      ? "ajuste solicitado"
      : deliverable.status === "revisado"
        ? existingVerdict === "ajustar"
          ? "ajuste"
          : "aprovado"
        : "pendente";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto bg-perestroika-bege">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display uppercase text-3xl text-left">
                {studentName}
              </SheetTitle>
              <p className="text-sm text-perestroika-preto/70 text-left">{moduleLabel}</p>
            </div>
            {(onPrev || onNext) && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!onPrev}
                  aria-label="entrega anterior"
                  className="w-8 h-8 rounded-full border border-perestroika-preto/20 flex items-center justify-center hover:bg-perestroika-preto/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {position && (
                  <span className="font-body text-[11px] tabular-nums text-perestroika-preto/55 px-1.5">
                    {position.index + 1}/{position.total}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!onNext}
                  aria-label="próxima entrega"
                  className="w-8 h-8 rounded-full border border-perestroika-preto/20 flex items-center justify-center hover:bg-perestroika-preto/5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              to={`/admin/aluno/${deliverable.user_id}`}
              className="inline-flex items-center gap-1 uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
            >
              ver perfil 360° <ExternalLink className="w-3 h-3" />
            </Link>
            {deliverable.module && (
              <Link
                to={`/app/modulo/${deliverable.module.number}`}
                target="_blank"
                className="inline-flex items-center gap-1 uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
              >
                ver módulo <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </SheetHeader>

        {isDraft && (
          <DraftCompletenessPanel
            deliverable={deliverable}
            onSubmit={() => submitDraftMutation.mutate()}
            submitting={submitDraftMutation.isPending}
          />
        )}

        {!isDraft && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/40 px-3 py-2">
            <p className="text-[11px] text-perestroika-preto/65">
              <span className="uppercase tracking-wide text-perestroika-preto/55">status:</span>{" "}
              {statusLabel}
              {deliverable.submitted_at && (
                <span className="text-perestroika-preto/45">
                  {" "}· enviado em{" "}
                  {new Date(deliverable.submitted_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setUnsubmitConfirmOpen(true)}
              disabled={unsubmitDraftMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/30 px-3 py-1 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-50 shrink-0"
              title="volta essa entrega pra rascunho; registra no histórico quem desfez e quando"
            >
              <RotateCcw className="w-3 h-3" />
              desfazer envio
            </button>
          </div>
        )}

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3">
            {isDraft ? "conteúdo do rascunho" : "entrega do estudante"}
          </p>
          <DeliverableAnswersList deliverable={deliverable} />
        </div>

        {history.length > 0 && (
          <details
            open
            className="mt-5 rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-3"
          >
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-perestroika-preto/60 flex items-center gap-2">
              <span>histórico de rodadas</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {history.length}ª rodada anterior{history.length > 1 ? "es" : ""}
              </Badge>
            </summary>
            <ul className="mt-3 space-y-3">
              {history.map((h, i) => (
                <li key={i} className="text-xs text-perestroika-preto/75">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {h.verdict === "ajustar" ? "ajuste" : h.verdict ?? "revisado"}
                    </Badge>
                    <span className="text-perestroika-preto/50">
                      {new Date(h.reviewed_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {h.feedback && <FeedbackMarkdown>{h.feedback}</FeedbackMarkdown>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {!isDraft && (
        <>
        <div className="mt-6 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> análise da ia
            </p>
            <button
              type="button"
              disabled={analyzing}
              onClick={() => void handleAnalyzeWithAI()}
              className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/30 px-3 py-1 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-50"
              title="lê a entrega com a rubrica e devolve leitura crítica pra você"
            >
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {analysis ? "analisar de novo" : "analisar com ia"}
            </button>
          </div>

          {!analysis && !analyzing && (
            <p className="mt-2 text-xs text-perestroika-preto/55">
              a ia lê a entrega junto com a rubrica e devolve o que está forte, o
              que está frágil e uma sugestão de veredito. quem decide é você.
            </p>
          )}

          {analysis && (
            <div className="mt-3 space-y-3 text-xs text-perestroika-preto/80">
              {analysis.strengths.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/50 mb-1">
                    está forte
                  </p>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex gap-1.5">
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-emerald-700" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.gaps.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/50 mb-1">
                    dá pra aprofundar
                  </p>
                  <ul className="space-y-1">
                    {analysis.gaps.map((g, i) => (
                      <li key={i} className="flex gap-1.5">
                        <X className="w-3 h-3 mt-0.5 shrink-0 text-perestroika-laranja" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.risk_note && (
                <p className="rounded-lg bg-rose-100 text-rose-900 border border-rose-300 px-3 py-2">
                  {analysis.risk_note}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="uppercase text-[10px]">
                  sugestão: {analysis.suggested_verdict}
                </Badge>
                {analysis.suggested_score !== null && (
                  <Badge variant="outline" className="uppercase text-[10px] tabular-nums">
                    nota sugerida {analysis.suggested_score}/{analysis.score_max}
                  </Badge>
                )}
                <span className="text-[10px] text-perestroika-preto/45">
                  sugestão, não decisão. revisa antes de enviar.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={drafting}
                  onClick={() => {
                    if (feedback.trim().length > 0) setAiConfirmOpen(true);
                    else void handleDraftWithAI();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-1.5 text-[10px] uppercase tracking-wide hover:opacity-90 disabled:opacity-50"
                >
                  {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  usar como rascunho
                </button>
                {usesScore && analysis.suggested_score !== null && (
                  <button
                    type="button"
                    onClick={() => setScore(String(analysis.suggested_score))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/30 px-3 py-1.5 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/10"
                  >
                    aplicar nota sugerida
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">

          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                critérios {rubric?.name ? `· ${rubric.name}` : ""}
              </p>
              {rubric?.is_fallback && (
                <p className="text-[10px] text-perestroika-preto/45 mt-0.5">
                  rubrica padrão (módulo sem rubrica vinculada)
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={drafting}
              onClick={() => {
                if (feedback.trim().length > 0) setAiConfirmOpen(true);
                else void handleDraftWithAI();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/30 px-3 py-1 text-[10px] uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-50"
              title="rascunhar feedback com IA com base na rubrica"
            >
              {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              rascunhar com IA
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const chip = c.label;
              const active = tags.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleTag(chip)}
                  title={c.description}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide transition-colors min-h-[28px] ${
                    active
                      ? "bg-perestroika-preto text-perestroika-bege"
                      : "border border-perestroika-preto/30 hover:bg-perestroika-preto/10"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">
              feedback (markdown leve)
            </label>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto"
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPreview ? "editar" : "preview"}
            </button>
          </div>
          {showPreview ? (
            <div className="min-h-[12rem] rounded-md border border-perestroika-preto/20 bg-perestroika-bege/60 p-3">
              {feedback.trim() ? (
                <FeedbackMarkdown>{feedback}</FeedbackMarkdown>
              ) : (
                <p className="text-xs italic text-perestroika-preto/40">nada escrito ainda</p>
              )}
            </div>
          ) : (
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
              placeholder="o que ficou forte, o que pode ajustar, o próximo passo... aceita **negrito**, *itálico*, listas, [link](url)"
              rows={8}
              className="bg-perestroika-bege/60 border-perestroika-preto/20 font-body text-sm"
            />
          )}
          <p className="mt-1 text-[10px] text-perestroika-preto/40 text-right">
            {feedback.length}/2000
          </p>
        </div>

        {usesScore && (
          <div className="mt-5">
            <label className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 block mb-1.5">
              nota (0 a {scoreMax}) · opcional
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={scoreMax}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-32 bg-perestroika-bege/60 border-perestroika-preto/20 font-body text-sm"
              placeholder={`até ${scoreMax}`}
            />
            {scoreInvalid && (
              <p className="mt-1 text-[10px] text-perestroika-vermelho">
                a nota precisa estar entre 0 e {scoreMax}.
              </p>
            )}
          </div>
        )}

        {alreadyReviewed && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-perestroika-preto/60">
            <Badge variant="outline" className="uppercase">
              {statusLabel}
            </Badge>
            <span>revisado em {new Date(deliverable.reviewed_at!).toLocaleDateString("pt-BR")}</span>
            <span className="inline-flex items-center gap-1">
              {feedbackReadAt ? (
                <>
                  <Eye className="w-3 h-3 text-perestroika-preto/70" />
                  lido em {new Date(feedbackReadAt).toLocaleDateString("pt-BR")}
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 text-perestroika-preto/40" />
                  ainda não lido
                </>
              )}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3 items-start">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={reviewPending || !feedbackValid || scoreInvalid}
              onClick={() => approveMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[40px]"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              aprovar
            </button>
            {!feedbackValid && (
              <span className="text-[10px] text-perestroika-preto/55 px-2">
                escreve ao menos 5 caracteres no feedback
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={reviewPending || !feedbackValid || scoreInvalid}
            onClick={() => ajustarMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-50 min-h-[40px]"
          >
            {ajustarMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            pedir ajuste
          </button>
          {alreadyReviewed && (
            <button
              type="button"
              disabled={reopenMutation.isPending}
              onClick={() => reopenMutation.mutate()}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto"
            >
              <RotateCcw className="w-3 h-3" /> reabrir revisão
            </button>
          )}
        </div>

        <div className="mt-8 border-t border-perestroika-preto/15 pt-5">
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3 inline-flex items-center gap-2">
            <MessageSquareReply className="w-3 h-3" /> conversa ({messages.length})
          </p>
          {messages.length === 0 ? (
            <p className="text-xs italic text-perestroika-preto/40 mb-3">
              nenhuma mensagem ainda. responda ao estudante se precisar.
            </p>
          ) : (
            <ul className="space-y-3 mb-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl p-3 ${
                    m.author_role === "student"
                      ? "bg-perestroika-bege/70 border border-perestroika-preto/10"
                      : "bg-perestroika-preto/5 border border-perestroika-preto/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-perestroika-preto/55">
                      {m.author_role === "student" ? (m.author_name ?? "estudante") : (m.author_name ?? "educador")}
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
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value.slice(0, 4000))}
            placeholder="responder ao estudante..."
            rows={3}
            className="bg-perestroika-bege/60 border-perestroika-preto/20 font-body text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-perestroika-preto/40">{reply.length}/4000</span>
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
        </>
        )}





        <AlertDialog open={aiConfirmOpen} onOpenChange={setAiConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>substituir feedback pelo rascunho da IA?</AlertDialogTitle>
              <AlertDialogDescription>
                já existe texto escrito. se continuar, o feedback atual será trocado pelo
                rascunho gerado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleDraftWithAI()}>
                sim, substituir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={unsubmitConfirmOpen} onOpenChange={(o) => {
          setUnsubmitConfirmOpen(o);
          if (!o) setUnsubmitReason("");
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>desfazer envio dessa entrega?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    a entrega volta pra <strong>rascunho</strong> e o estudante
                    consegue editar e reenviar.
                    {alreadyReviewed && (
                      <>
                        {" "}
                        <span className="text-perestroika-vermelho">
                          atenção: ela já foi revisada. a marca de revisão também
                          será removida (o texto do feedback fica salvo).
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-perestroika-preto/60">
                    fica registrado no histórico da conversa quem desfez, quando,
                    e o status anterior. não dá pra apagar essa nota.
                  </p>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 block mb-1">
                      motivo (opcional, vai no histórico)
                    </label>
                    <Textarea
                      value={unsubmitReason}
                      onChange={(e) => setUnsubmitReason(e.target.value)}
                      placeholder="ex: marquei sem querer, ou estudante pediu mais tempo"
                      rows={2}
                      maxLength={300}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={unsubmitDraftMutation.isPending}>
                cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={unsubmitDraftMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  unsubmitDraftMutation.mutate();
                }}
              >
                {unsubmitDraftMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                    desfazendo…
                  </>
                ) : (
                  "sim, voltar pra rascunho"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};

/**
 * painel visual de "rascunho do estudante": mostra barra de progresso,
 * chips de pílulas obrigatórias respondidas / faltando, e quantas foram
 * auto-concluídas pelo autosave (estudante preencheu mas não marcou).
 * quando 100% completo, libera o CTA "marcar como enviado".
 */
function DraftCompletenessPanel({
  deliverable,
  onSubmit,
  submitting,
}: {
  deliverable: DeliverableInbox;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const { markedIds } = useExplicitPillProgress(deliverable);
  const c = deliverable.completeness;
  const total = c.requiredTotal;
  const answered = c.requiredAnswered;
  const pct = total === 0 ? 100 : Math.round((answered / total) * 100);

  const answeredPills = c.required.filter((p) => p.isAnswered);
  const missingPills = c.required.filter((p) => !p.isAnswered);
  const autoCount = answeredPills.filter((p) => !markedIds.has(p.id)).length;

  const headlineTone = c.isComplete
    ? "border-perestroika-azul/50 bg-perestroika-azul/10"
    : "border-perestroika-laranja/40 bg-perestroika-laranja/[0.08]";

  const barColor = c.isComplete ? "bg-perestroika-azul" : "bg-perestroika-laranja";

  return (
    <div className={`mt-5 rounded-2xl border-2 px-4 py-4 space-y-4 ${headlineTone}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium uppercase tracking-wide text-[11px] text-perestroika-preto/70">
            rascunho do estudante
          </p>
          <p className="font-display uppercase text-2xl leading-tight mt-0.5">
            {c.isComplete
              ? "rascunho completo, só falta enviar"
              : `faltam ${missingPills.length} pílula${missingPills.length === 1 ? "" : "s"} obrigatória${missingPills.length === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs text-perestroika-preto/65 mt-1">
            {answered} de {total} obrigatórias respondidas
            {autoCount > 0 && (
              <>
                {" · "}
                <span className="text-perestroika-azul">
                  {autoCount} auto-concluída{autoCount === 1 ? "" : "s"} pelo autosave
                </span>
              </>
            )}
          </p>
        </div>
        {c.isComplete && (
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-xs uppercase tracking-wide hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            marcar como enviado
          </button>
        )}
      </div>

      {/* barra de progresso */}
      <div>
        <div className="h-2 w-full rounded-full bg-perestroika-preto/10 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 mt-1 tabular-nums">
          {pct}% preenchido
        </p>
      </div>

      {/* chips: faltando primeiro pra dar destaque */}
      {missingPills.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1.5">
            faltam responder
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingPills.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 text-[11px]"
              >
                <X className="w-3 h-3" />
                {p.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {answeredPills.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-1.5">
            já respondidas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {answeredPills.map((p) => {
              const auto = !markedIds.has(p.id);
              return (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                    auto
                      ? "bg-perestroika-azul/10 text-perestroika-azul border-perestroika-azul/40"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}
                  title={
                    auto
                      ? "preenchida pelo estudante mas não marcada como feita; o autosave reconheceu como completa"
                      : "marcada explicitamente pelo estudante"
                  }
                >
                  {auto ? <Sparkles className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  {p.title}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!c.isComplete && (
        <p className="text-[11px] text-perestroika-preto/55 italic">
          esse conteúdo é o que está salvo automaticamente. o estudante ainda
          não enviou pro educador — espera ele finalizar ou converse pra ajudar
          a destravar.
        </p>
      )}
    </div>
  );
}

