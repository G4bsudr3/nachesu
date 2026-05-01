import { Link } from "react-router-dom";
import { Check, Lock, ArrowRight, Loader2 } from "lucide-react";

export type MilestoneState = "done" | "active" | "in-progress" | "pending" | "locked" | "waiting";

interface Props {
  number: number;
  color: "laranja" | "vermelho" | "rosa" | "azul" | "preto";
  title: string;
  duration?: string;
  description: string;
  state: MilestoneState;
  href?: string;
  ctaLabel?: string;
  /** ex: "3/8" pra estado in-progress */
  progressLabel?: string;
}

const colorBg: Record<Props["color"], string> = {
  laranja: "bg-perestroika-laranja",
  vermelho: "bg-perestroika-vermelho",
  rosa: "bg-perestroika-rosa",
  azul: "bg-perestroika-azul",
  preto: "bg-perestroika-preto",
};

const stateBadge: Record<MilestoneState, { label: string; classes: string } | null> = {
  done: { label: "feito", classes: "bg-perestroika-preto text-perestroika-bege" },
  active: { label: "agora", classes: "bg-perestroika-bege text-perestroika-preto border border-perestroika-preto" },
  "in-progress": { label: "em andamento", classes: "bg-perestroika-laranja text-perestroika-bege" },
  pending: { label: "depois", classes: "bg-perestroika-preto/10 text-perestroika-preto/60" },
  locked: { label: "bloqueado", classes: "bg-perestroika-preto/10 text-perestroika-preto/60" },
  waiting: { label: "aguardando", classes: "bg-perestroika-rosa text-perestroika-bege" },
};

export const JourneyMilestone = ({
  number,
  color,
  title,
  duration,
  description,
  state,
  href,
  ctaLabel,
  progressLabel,
}: Props) => {
  const isDone = state === "done";
  const isLocked = state === "locked";
  const isActive = state === "active" || state === "in-progress";
  const isWaiting = state === "waiting";
  const showCta = href && ctaLabel && (isActive || isWaiting === false) && !isLocked && !isDone && !isWaiting;
  const badge = stateBadge[state];

  return (
    <li
      aria-current={isActive ? "step" : undefined}
      className={`relative rounded-3xl border p-5 sm:p-6 transition-all ${
        isLocked
          ? "border-perestroika-preto/10 bg-perestroika-bege/40 opacity-60"
          : isActive
            ? "border-perestroika-preto bg-perestroika-bege shadow-sm"
            : "border-perestroika-preto/15 bg-perestroika-bege/60"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`relative shrink-0 inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl font-display text-2xl sm:text-3xl text-perestroika-bege ${
            isLocked ? "bg-perestroika-preto/30" : colorBg[color]
          }`}
        >
          {isDone ? (
            <Check className="h-6 w-6" strokeWidth={3} />
          ) : isLocked ? (
            <Lock className="h-5 w-5" />
          ) : (
            number
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
            <h3
              className={`font-display uppercase text-xl sm:text-2xl leading-tight ${
                isDone ? "text-perestroika-preto/60 line-through decoration-1" : "text-perestroika-preto"
              }`}
            >
              {title}
            </h3>
            {duration && !isDone && (
              <span className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/50">
                {duration}
              </span>
            )}
            {progressLabel && (
              <span className="font-body text-xs text-perestroika-preto/70">
                {progressLabel}
              </span>
            )}
          </div>

          <p className={`font-body text-sm leading-relaxed ${isDone ? "text-perestroika-preto/55" : "text-perestroika-preto/80"}`}>
            {description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {badge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wide ${badge.classes}`}>
                {state === "waiting" && <Loader2 className="h-3 w-3 animate-spin" />}
                {badge.label}
              </span>
            )}

            {showCta && href && (
              <Link
                to={href}
                className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-perestroika-preto underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto rounded"
              >
                {ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};
