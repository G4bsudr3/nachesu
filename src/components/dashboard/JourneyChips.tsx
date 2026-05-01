import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import type { PostEventStatus } from "@/hooks/usePostEventStatus";

interface Props {
  status: PostEventStatus;
}

interface Chip {
  label: string;
  to: string;
  done: boolean;
  /** quando true, ainda não tem o que fazer (ex: sem sessão de carta aberta) */
  hidden?: boolean;
}

export const JourneyChips = ({ status }: Props) => {
  const chips: Chip[] = [
    {
      label: "carta pro futuro",
      to: "/app/dinamica/carta-futuro",
      done: status.futureLetterDone,
      hidden: !status.futureLetterSessionOpen,
    },
    {
      label: "pesquisa final",
      to: "/app/feedback-final",
      done: status.feedbackFinalDone,
    },
    {
      label: "certificado",
      to: "/app/certificado",
      done: status.certificateIssued,
    },
  ].filter((c) => !c.hidden);

  if (!chips.length) return null;

  return (
    <nav aria-label="status da jornada pós-evento" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          to={chip.to}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-xs uppercase tracking-wide transition-colors ${
            chip.done
              ? "border-perestroika-preto/15 bg-perestroika-preto/5 text-perestroika-preto/55 hover:bg-perestroika-preto/10"
              : "border-perestroika-preto bg-perestroika-bege text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege"
          }`}
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              chip.done ? "bg-perestroika-preto/30" : "bg-perestroika-laranja"
            }`}
          />
          {chip.label}
          {chip.done && <Check className="h-3 w-3" aria-label="feito" />}
        </Link>
      ))}
    </nav>
  );
};
