import { motion } from "framer-motion";
import { fbiThemes, type FbiData, type FbiFieldKey, type FbiSection } from "@/features/fbi/schema";

interface Props {
  data: FbiData;
  /** seção do step atual, pra destacar onde a pessoa está */
  activeTheme?: FbiSection;
}

/** considera um campo "preenchido" pra fins de progresso visual */
const isFilled = (raw: unknown): boolean => {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === "boolean") return true;
  if (typeof raw === "number") return true;
  if (typeof raw === "string") return raw.trim().length > 0;
  return true;
};

export const FbiThemeProgress = ({ data, activeTheme }: Props) => {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3">
      {fbiThemes.map((theme) => {
        const total = theme.fields.length;
        const done = theme.fields.filter((f) => isFilled(data[f as FbiFieldKey])).length;
        const pct = total === 0 ? 0 : (done / total) * 100;
        const isActive = activeTheme === theme.key;
        const isComplete = done === total;

        return (
          <div key={theme.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <span
                className={`font-body text-[10px] sm:text-xs uppercase tracking-wide truncate transition-colors ${
                  isActive
                    ? "text-perestroika-preto font-semibold"
                    : isComplete
                      ? "text-perestroika-preto/70"
                      : "text-perestroika-preto/40"
                }`}
              >
                {theme.label}
              </span>
              <span
                className={`font-body text-[10px] tabular-nums transition-colors ${
                  isActive ? "text-perestroika-preto" : "text-perestroika-preto/40"
                }`}
              >
                {done}/{total}
              </span>
            </div>
            <div
              className={`h-1 w-full rounded-full overflow-hidden transition-colors ${
                isActive ? "bg-perestroika-preto/15" : "bg-perestroika-preto/10"
              }`}
            >
              <motion.div
                className="h-full bg-perestroika-preto rounded-full"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
