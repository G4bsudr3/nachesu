import { Sparkles } from "lucide-react";
import type { AiReview, TriageVerdict } from "./useAiTriage";

const STYLE: Record<TriageVerdict, { label: string; cls: string }> = {
  ok: { label: "ok", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  revisar: { label: "revisar", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  atencao: { label: "atenção", cls: "bg-rose-100 text-rose-800 border-rose-300" },
};

/** leitura rápida da triagem por ia. é sugestão, não decisão. */
export const AiTriageBadge = ({ review }: { review: AiReview | undefined }) => {
  if (!review) {
    return (
      <span className="text-[10px] uppercase tracking-wide text-perestroika-preto/35">
        sem triagem
      </span>
    );
  }
  const s = STYLE[review.verdict];
  return (
    <div className="min-w-[140px] max-w-[240px]">
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${s.cls}`}
        title={[review.summary, ...review.reasons].filter(Boolean).join(" · ")}
      >
        <Sparkles className="w-2.5 h-2.5" />
        {s.label}
      </span>
      {review.summary && (
        <p className="mt-1 text-[11px] leading-snug text-perestroika-preto/65 line-clamp-2">
          {review.summary}
        </p>
      )}
    </div>
  );
};
