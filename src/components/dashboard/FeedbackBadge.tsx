import { useStudentFeedback } from "@/features/hub/useStudentFeedback";

/**
 * bolinha vermelha sobreposta a um ícone quando o aluno tem feedback novo
 * (não visualizado ainda). usa localStorage como tracking.
 */
export const FeedbackBadge = ({ className = "" }: { className?: string }) => {
  const { hasUnseen, unseen } = useStudentFeedback();
  if (!hasUnseen) return null;
  return (
    <span
      aria-label={`${unseen.length} feedback novo${unseen.length > 1 ? "s" : ""}`}
      className={`pointer-events-none absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-perestroika-vermelho ring-2 ring-perestroika-bege ${className}`}
    />
  );
};
