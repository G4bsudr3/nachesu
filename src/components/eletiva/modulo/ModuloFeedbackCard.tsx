import { CheckCircle2, AlertCircle, User } from "lucide-react";
import { useEffect } from "react";
import { useStudentFeedback, markFeedbackSeen } from "@/features/hub/useStudentFeedback";

interface Props {
  moduleId: string | null;
  trailColor: string;
}

/**
 * card de feedback do professor no topo do módulo (quando existe).
 * marca como visto automaticamente ao montar (debounce visual fica por conta do localStorage).
 */
export const ModuloFeedbackCard = ({ moduleId, trailColor }: Props) => {
  const { feedbacks } = useStudentFeedback({ moduleId });
  const fb = feedbacks[0] ?? null;

  useEffect(() => {
    if (!fb) return;
    const t = setTimeout(() => markFeedbackSeen(fb.id, fb.reviewed_at), 1500);
    return () => clearTimeout(t);
  }, [fb]);

  if (!fb) return null;
  const verdict = ((fb.content as Record<string, unknown> | null)?.review_verdict ?? null) as
    | "aprovado"
    | "ajustar"
    | null;
  const tags = ((fb.content as Record<string, unknown> | null)?.review_tags ?? []) as string[];

  return (
    <section
      id="feedback-do-educador"
      aria-label="feedback do educador"
      className="rounded-2xl border-2 p-5 sm:p-6 mb-6 scroll-mt-24 transition-shadow"
      style={{ borderColor: trailColor, backgroundColor: `${trailColor}10` }}
    >
      <div className="flex items-center gap-2 mb-3">
        {verdict === "ajustar" ? (
          <AlertCircle className="w-4 h-4" style={{ color: trailColor }} />
        ) : (
          <CheckCircle2 className="w-4 h-4" style={{ color: trailColor }} />
        )}
        <p
          className="font-body text-[11px] uppercase tracking-[0.2em]"
          style={{ color: trailColor }}
        >
          {verdict === "ajustar" ? "ajuste solicitado" : verdict === "aprovado" ? "aprovado" : "revisado"}
        </p>
        {fb.reviewer_name && (
          <span className="inline-flex items-center gap-1 ml-auto text-[11px] uppercase tracking-wide text-perestroika-preto/55">
            <User className="w-3 h-3" /> {fb.reviewer_name}
          </span>
        )}
      </div>
      <h3 className="font-display uppercase text-xl sm:text-2xl mb-2 leading-tight">
        feedback do professor
      </h3>
      {fb.feedback && (
        <p className="font-body text-sm whitespace-pre-wrap text-perestroika-preto/85">
          {fb.feedback}
        </p>
      )}
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
    </section>
  );
};
