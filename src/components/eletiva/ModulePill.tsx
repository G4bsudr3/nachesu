import { Link } from "react-router-dom";
import { Lock, Check } from "lucide-react";
import { motion } from "framer-motion";
import { moduloHref } from "@/lib/moduleHref";

export type ModulePillState = "completed" | "current" | "available" | "locked" | "upcoming";

interface ModulePillProps {
  number: number;
  title: string;
  state: ModulePillState;
  trailColor: string;
  availableFromLabel?: string | null;
  index: number;
  courseSlug?: string | null;
}

const formatNumber = (n: number) => String(n).padStart(2, "0");

export const ModulePill = ({
  number,
  title,
  state,
  trailColor,
  availableFromLabel,
  index,
  courseSlug,
}: ModulePillProps) => {
  const isInteractive = state === "completed" || state === "current" || state === "available";
  const content = (
    <div className="flex items-center gap-3 w-full">
      <div
        className={`flex items-center justify-center h-10 w-10 rounded-full font-display text-xl shrink-0 transition-colors ${
          state === "completed"
            ? "bg-perestroika-preto text-perestroika-bege"
            : state === "current"
              ? "bg-perestroika-bege text-perestroika-preto border-2"
              : "bg-perestroika-bege/60 text-perestroika-preto/60 border border-perestroika-preto/15"
        }`}
        style={state === "current" ? { borderColor: trailColor } : undefined}
        aria-hidden="true"
      >
        {state === "completed" ? <Check className="h-4 w-4" /> : formatNumber(number)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p
          className={`font-body text-sm leading-tight truncate ${
            state === "locked" || state === "upcoming"
              ? "text-perestroika-preto/45"
              : "text-perestroika-preto"
          }`}
        >
          {title.toLowerCase()}
        </p>
        {state === "upcoming" && availableFromLabel && (
          <p className="font-body text-[11px] text-perestroika-preto/50 mt-0.5">
            abre {availableFromLabel}
          </p>
        )}
        {state === "current" && (
          <p
            className="font-body text-[11px] mt-0.5 uppercase tracking-wider"
            style={{ color: trailColor }}
          >
            você está aqui
          </p>
        )}
        {state === "locked" && (
          <p className="font-body text-[11px] text-perestroika-preto/45 mt-0.5">
            conclua o anterior
          </p>
        )}
      </div>
      {state === "locked" && (
        <Lock className="h-3.5 w-3.5 text-perestroika-preto/40 shrink-0" aria-hidden="true" />
      )}
    </div>
  );

  const baseClasses =
    "block w-full rounded-2xl border-2 px-3 py-2.5 transition-all motion-safe:duration-200";
  const stateClasses =
    state === "completed"
      ? "border-perestroika-preto/15 bg-perestroika-bege hover:border-perestroika-preto/40 hover:scale-[1.02]"
      : state === "current"
        ? "bg-perestroika-bege motion-safe:animate-pulse-soft hover:scale-[1.02]"
        : state === "available"
          ? "border-perestroika-preto bg-perestroika-bege hover:scale-[1.02]"
          : "border-perestroika-preto/10 bg-perestroika-preto/[0.02] cursor-not-allowed";

  const wrapperStyle =
    state === "current" ? { borderColor: trailColor } : undefined;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      {isInteractive ? (
        <Link
          to={moduloHref(courseSlug, number)}
          className={`${baseClasses} ${stateClasses}`}
          style={wrapperStyle}
          aria-label={`módulo ${formatNumber(number)}: ${title}`}
        >
          {content}
        </Link>
      ) : (
        <div
          className={`${baseClasses} ${stateClasses}`}
          aria-label={`módulo ${formatNumber(number)} bloqueado`}
        >
          {content}
        </div>
      )}
    </motion.li>
  );
};
