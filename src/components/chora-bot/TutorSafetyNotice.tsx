import ReactMarkdown from "react-markdown";
import { ShieldCheck } from "lucide-react";

/**
 * fase A · bolha especial de intervenção de risco emocional.
 * usada quando o backend classifica a mensagem do estudante em nível não-safe
 * e devolve um conteúdo acolhedor + canais de apoio em vez da resposta do tutor.
 */
type Props = {
  content: string;
  onAcknowledge?: () => void;
};

export const TutorSafetyNotice = ({ content, onAcknowledge }: Props) => {
  return (
    <div className="my-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-accent">
        <ShieldCheck className="size-4" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide">
          aqui pra te apoiar
        </span>
      </div>
      <div className="prose prose-sm max-w-none text-foreground prose-strong:text-foreground prose-a:text-accent">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {onAcknowledge && (
        <button
          type="button"
          onClick={onAcknowledge}
          className="mt-4 inline-flex items-center rounded-full border border-accent/40 px-4 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
        >
          estou bem, voltar
        </button>
      )}
    </div>
  );
};
