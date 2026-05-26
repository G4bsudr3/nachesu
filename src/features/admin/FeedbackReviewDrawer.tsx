import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { DeliverableInbox } from "./usePendingDeliverables";
import { DeliverableAnswersList } from "./deliverableRendering/DeliverableAnswersList";

const RUBRIC_CHIPS = [
  "clareza",
  "evidência forte",
  "aprofundar",
  "criatividade",
  "consistência",
] as const;

type Verdict = "aprovado" | "ajustar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable: DeliverableInbox | null;
}

// renderer detalhado vive em ./deliverableRendering/DeliverableAnswersList

export const FeedbackReviewDrawer = ({ open, onOpenChange, deliverable }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const existingVerdict = useMemo(() => {
    const c = (deliverable?.content ?? {}) as Record<string, unknown>;
    return (c.review_verdict as Verdict | undefined) ?? null;
  }, [deliverable]);

  useEffect(() => {
    if (!deliverable) return;
    setFeedback(deliverable.feedback ?? "");
    const c = (deliverable.content ?? {}) as Record<string, unknown>;
    setTags((c.review_tags as string[]) ?? []);
  }, [deliverable]);

  const reviewMutation = useMutation({
    mutationFn: async (verdict: Verdict) => {
      if (!deliverable || !user) throw new Error("sem contexto");
      const trimmed = feedback.trim();
      if (trimmed.length < 5) throw new Error("escreve um feedback (mínimo 5 caracteres)");
      const nextContent = {
        ...((deliverable.content ?? {}) as Record<string, unknown>),
        review_verdict: verdict,
        review_tags: tags,
      };
      const { error } = await supabase
        .from("module_deliverables")
        .update({
          feedback: trimmed,
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          status: "revisado",
          content: nextContent as never,
        })
        .eq("id", deliverable.id);
      if (error) throw error;
    },
    onSuccess: (_, verdict) => {
      toast.success(verdict === "aprovado" ? "feedback enviado, aluno notificado" : "ajuste solicitado");
      qc.invalidateQueries({ queryKey: ["admin-deliverables-inbox"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const toggleTag = (tag: string) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
    if (!feedback.includes(`#${tag}`)) {
      setFeedback((cur) => (cur ? `${cur}\n` : "") + `#${tag} `);
    }
  };

  if (!deliverable) return null;
  const studentName =
    deliverable.profile?.display_name ?? deliverable.profile?.nickname ?? "aluno";
  const moduleLabel = deliverable.module
    ? `módulo ${String(deliverable.module.number).padStart(2, "0")} · ${deliverable.module.title}`
    : "módulo";
  const alreadyReviewed = !!deliverable.reviewed_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-perestroika-bege">
        <SheetHeader>
          <SheetTitle className="font-display uppercase text-3xl text-left">
            {studentName}
          </SheetTitle>
          <p className="text-sm text-perestroika-preto/70 text-left">{moduleLabel}</p>
          {deliverable.module && (
            <Link
              to={`/app/modulo/${deliverable.module.number}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
            >
              ver módulo <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </SheetHeader>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3">
            entrega do aluno
          </p>
          <div className="rounded-xl border border-perestroika-preto/15 bg-white/50 p-4">
            <ContentRenderer content={(deliverable.content ?? {}) as Record<string, unknown>} />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
            rubric chips
          </p>
          <div className="flex flex-wrap gap-2">
            {RUBRIC_CHIPS.map((chip) => {
              const active = tags.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleTag(chip)}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide transition-colors ${
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
          <label className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2 block">
            feedback (markdown leve)
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value.slice(0, 2000))}
            placeholder="o que ficou forte, o que pode ajustar, o próximo passo..."
            rows={8}
            className="bg-white/60 border-perestroika-preto/20 font-body text-sm"
          />
          <p className="mt-1 text-[10px] text-perestroika-preto/40 text-right">
            {feedback.length}/2000
          </p>
        </div>

        {alreadyReviewed && (
          <div className="mt-4 flex items-center gap-2 text-xs text-perestroika-preto/60">
            <Badge variant="outline" className="uppercase">
              {existingVerdict ?? "revisado"}
            </Badge>
            revisado em {new Date(deliverable.reviewed_at!).toLocaleDateString("pt-BR")}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={reviewMutation.isPending}
            onClick={() => reviewMutation.mutate("aprovado")}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          >
            {reviewMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            aprovar
          </button>
          <button
            type="button"
            disabled={reviewMutation.isPending}
            onClick={() => reviewMutation.mutate("ajustar")}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-50"
          >
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
      </SheetContent>
    </Sheet>
  );
};
