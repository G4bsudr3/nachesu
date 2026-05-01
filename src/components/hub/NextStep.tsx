import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { JourneyStep } from "@/lib/journey";
import type { DepthPref } from "@/hooks/useDepth";

interface Props {
  step: JourneyStep;
  depth?: DepthPref;
}

const eyebrowFor = (depth?: DepthPref, isDone?: boolean) => {
  if (isDone) return "você chegou aqui";
  if (depth === "comeca-por-aqui") return "próximo passo · caminho direto";
  if (depth === "vai-mais-fundo") return "próximo passo · camada técnica";
  return "próximo passo";
};

export const NextStep = ({ step, depth }: Props) => {
  const isWaiting = step.kind === "carta-gerando";
  const isDone = step.kind === "done";
  const eyebrow = eyebrowFor(depth, isDone);

  const Inner = (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 flex items-center gap-4 sm:gap-6 transition-all ${
        isDone
          ? "border-perestroika-preto/15 bg-perestroika-bege/60"
          : "border-perestroika-preto/20 bg-perestroika-preto text-perestroika-bege hover:-translate-y-0.5"
      }`}
    >
      <div
        className={`shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center ${
          isDone
            ? "bg-perestroika-preto/10 text-perestroika-preto"
            : "bg-perestroika-bege text-perestroika-preto"
        }`}
      >
        {isWaiting ? (
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-body text-[10px] sm:text-xs uppercase tracking-wide ${
            isDone ? "text-perestroika-preto/55" : "text-perestroika-bege/60"
          }`}
        >
          {eyebrow}
        </p>
        <h2
          className={`mt-0.5 font-display uppercase text-2xl sm:text-3xl leading-tight text-balance ${
            isDone ? "text-perestroika-preto" : ""
          }`}
        >
          {step.label}
        </h2>
        <p
          className={`mt-1 font-body text-xs sm:text-sm text-pretty ${
            isDone ? "text-perestroika-preto/65" : "text-perestroika-bege/75"
          }`}
        >
          {step.helper}
        </p>
      </div>
      {step.href && !isDone && (
        <ArrowRight className="hidden sm:block h-5 w-5 shrink-0 text-perestroika-bege" />
      )}
    </div>
  );

  if (!step.href || isDone) return <div className="mb-6">{Inner}</div>;

  if (step.href.startsWith("/")) {
    return (
      <Link to={step.href} className="block mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded-3xl">
        {Inner}
      </Link>
    );
  }

  return (
    <a href={step.href} className="block mb-6">
      {Inner}
    </a>
  );
};
