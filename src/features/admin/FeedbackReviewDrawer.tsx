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

/** renderiza o conteúdo jsonb da entrega em formato leitura */
const ContentRenderer = ({ content }: { content: Record<string, unknown> }) => {
  const reflections = (content.reflections ?? {}) as Record<string, string>;
  const pblResponses = (content.pbl_responses ?? {}) as Record<string, string>;
  const guidedAnswers = (content.guided_answers ?? {}) as Record<string, string>;
  const items = (content.items ?? []) as Array<Record<string, unknown>>;
  const quizAnswers = (content.quiz_answers ?? {}) as Record<string, string | string[]>;
  const bonus = (content.bonus ?? {}) as Record<string, string>;

  const sections: Array<{ label: string; node: React.ReactNode }> = [];

  if (Object.keys(reflections).length > 0) {
    sections.push({
      label: "reflexões",
      node: (
        <div className="space-y-3">
          {Object.entries(reflections).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-perestroika-preto/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/50 mb-1">
                pílula {k.slice(0, 8)}
              </p>
              <p className="whitespace-pre-wrap text-sm">{v}</p>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (Object.keys(pblResponses).length > 0) {
    sections.push({
      label: "respostas pbl",
      node: (
        <div className="space-y-3">
          {Object.entries(pblResponses).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-perestroika-preto/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/50 mb-1">
                pílula {k.slice(0, 8)}
              </p>
              <p className="whitespace-pre-wrap text-sm">{v}</p>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (Object.keys(guidedAnswers).length > 0) {
    sections.push({
      label: "respostas guiadas",
      node: (
        <ul className="space-y-2">
          {Object.entries(guidedAnswers).map(([k, v]) => (
            <li key={k} className="text-sm">
              <span className="text-perestroika-preto/55">{k}:</span> {v}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (items.length > 0) {
    sections.push({
      label: "radar",
      node: (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg bg-perestroika-preto/[0.04] p-3 text-sm">
              {Object.entries(it).map(([k, v]) => (
                <div key={k}>
                  <span className="text-perestroika-preto/55">{k}:</span> {String(v)}
                </div>
              ))}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (Object.keys(quizAnswers).length > 0) {
    sections.push({
      label: "quiz",
      node: (
        <ul className="space-y-1 text-sm">
          {Object.entries(quizAnswers).map(([k, v]) => (
            <li key={k}>
              <span className="text-perestroika-preto/55">{k}:</span>{" "}
              {Array.isArray(v) ? v.join(", ") : v}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (Object.keys(bonus).length > 0) {
    sections.push({
      label: "bônus",
      node: (
        <div className="space-y-2 text-sm">
          {Object.entries(bonus).map(([k, v]) => (
            <p key={k}>
              <span className="text-perestroika-preto/55">{k}:</span> {v}
            </p>
          ))}
        </div>
      ),
    });
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-perestroika-preto/50 italic">
        sem conteúdo escrito (o aluno só marcou como concluído).
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((s) => (
        <div key={s.label}>
          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
            {s.label}
          </p>
          {s.node}
        </div>
      ))}
    </div>
  );
};

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
